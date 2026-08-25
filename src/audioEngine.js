/**
 * 8D Spatial Audio Engine (Web Audio API & HRTF Binaural DSP)
 * Implements 360° orbital spatialization, head-shadow dynamic filtering,
 * acoustic reverb convolution, and offline WAV rendering.
 */

export class Audio8DEngine {
  constructor() {
    this.ctx = null;
    this.audioBuffer = null;
    this.sourceNode = null;
    
    // DSP Nodes
    this.pannerNode = null;
    this.convolverNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.headShadowFilter = null;
    this.bassBooster = null;
    this.masterGain = null;

    // Playback state
    this.isPlaying = false;
    this.is8DEnabled = true;
    this.startTime = 0;
    this.pauseOffset = 0;
    this.duration = 0;

    // 8D parameters
    this.orbitPeriod = 8.0; // seconds per 360° circle
    this.radius = 3.0; // meters from head (Spatial Depth)
    this.reverbDepth = 0.55; // 55%
    this.bassBoostActive = true;
    this.intensity = 1.0; // 0.0 to 1.0
    this.direction = 'cw'; // 'cw' (clockwise), 'ccw' (counter-clockwise), 'figure8'
    this.volume = 1.0;

    // Animation / LFO loop
    this.animFrameId = null;
    this.onPositionUpdate = null; // callback(angle, x, z)
    this.onEnded = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Generates a rich synthetic Impulse Response for concert hall / 3D acoustic space
   */
  createImpulseResponse(duration = 2.2, decay = 2.0) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const t = i / sampleRate;
      const envelope = Math.pow(n / length, decay);
      // Stereo decorrelation
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope * (1 - 0.05 * Math.sin(t * 10));
    }
    return impulse;
  }

  /**
   * Builds the complete DSP audio graph
   */
  buildGraph() {
    // 1. Bass Booster
    this.bassBooster = this.ctx.createBiquadFilter();
    this.bassBooster.type = 'lowshelf';
    this.bassBooster.frequency.value = 110;
    this.bassBooster.gain.value = this.bassBoostActive ? 6 : 0;

    // 2. Head-Shadow Dynamic Filter (muffles audio when behind head)
    this.headShadowFilter = this.ctx.createBiquadFilter();
    this.headShadowFilter.type = 'lowpass';
    this.headShadowFilter.frequency.value = 20000;
    this.headShadowFilter.Q.value = 0.7;

    // 3. 3D Binaural HRTF Panner
    this.pannerNode = this.ctx.createPanner();
    this.pannerNode.panningModel = 'HRTF';
    this.pannerNode.distanceModel = 'inverse';
    this.pannerNode.refDistance = 1;
    this.pannerNode.maxDistance = 10000;
    this.pannerNode.rolloffFactor = 0.8;
    this.pannerNode.coneInnerAngle = 360;

    // Set listener at origin (0, 0, 0) facing forward (0, 0, -1)
    if (this.ctx.listener.positionX) {
      this.ctx.listener.positionX.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.listener.positionY.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.listener.positionZ.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.listener.forwardX.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.listener.forwardY.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.listener.forwardZ.setValueAtTime(-1, this.ctx.currentTime);
      this.ctx.listener.upX.setValueAtTime(0, this.ctx.currentTime);
      this.ctx.listener.upY.setValueAtTime(1, this.ctx.currentTime);
      this.ctx.listener.upZ.setValueAtTime(0, this.ctx.currentTime);
    } else {
      this.ctx.listener.setPosition(0, 0, 0);
      this.ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }

    // 4. Reverb & Wet/Dry Mixer
    this.convolverNode = this.ctx.createConvolver();
    this.convolverNode.buffer = this.createImpulseResponse(2.2, 2.5);

    this.dryGain = this.ctx.createGain();
    this.reverbGain = this.ctx.createGain();
    this.updateReverbMix(this.reverbDepth);

    // 5. Master Output Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;

    // Connect DSP Chain:
    // Source -> Bass -> HeadShadow -> Panner -> DryGain & ReverbGain -> Master -> Destination
    this.bassBooster.connect(this.headShadowFilter);
    this.headShadowFilter.connect(this.pannerNode);

    // Dry path
    this.pannerNode.connect(this.dryGain);
    this.dryGain.connect(this.masterGain);

    // Wet reverb path
    this.pannerNode.connect(this.convolverNode);
    this.convolverNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);
  }

  setIntensity(val) {
    this.intensity = Math.max(0, Math.min(1, val));
  }

  setDirection(dir) {
    this.direction = dir; // 'cw', 'ccw', 'figure8'
  }

  setDepth(radiusVal) {
    this.radius = Math.max(0.5, Math.min(6.0, radiusVal));
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  updateReverbMix(depth) {
    this.reverbDepth = depth;
    if (this.dryGain && this.reverbGain) {
      const wet = Math.min(Math.max(depth, 0), 1);
      this.dryGain.gain.setValueAtTime(1.0 - (wet * 0.25), this.ctx.currentTime);
      this.reverbGain.gain.setValueAtTime(wet * 0.65, this.ctx.currentTime);
    }
  }

  setOrbitSpeed(periodSeconds) {
    this.orbitPeriod = Math.max(1, periodSeconds);
  }

  setBassBoost(enabled) {
    this.bassBoostActive = enabled;
    if (this.bassBooster) {
      this.bassBooster.gain.setValueAtTime(enabled ? 6 : 0, this.ctx.currentTime);
    }
  }

  set8DEnabled(enabled) {
    this.is8DEnabled = enabled;
    if (!enabled && this.pannerNode) {
      // Center position
      this.pannerNode.positionX.setValueAtTime(0, this.ctx.currentTime);
      this.pannerNode.positionY.setValueAtTime(0, this.ctx.currentTime);
      this.pannerNode.positionZ.setValueAtTime(-1, this.ctx.currentTime);
      if (this.headShadowFilter) {
        this.headShadowFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      }
    }
  }

  async loadAudioFile(file) {
    this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.pauseOffset = 0;
    return this.audioBuffer;
  }

  async loadAudioFromUrl(url) {
    this.initContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.pauseOffset = 0;
    return this.audioBuffer;
  }

  /**
   * Generates a high-quality synthwave royalty-free demo track buffer
   */
  createDemoTrackBuffer() {
    this.initContext();
    const sampleRate = this.ctx.sampleRate;
    const duration = 24.0; // 24 seconds loop
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = 120;
    const beatLen = 60 / bpm; // 0.5s per beat
    const chords = [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];
    const bassNotes = [110, 87.31, 130.81, 98.00];

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / beatLen);
      const chordIndex = Math.floor((beat / 8) % chords.length);
      const chord = chords[chordIndex];
      const bassNote = bassNotes[chordIndex];

      // Arpeggiator note
      const arpStep = Math.floor(beat * 4) % 8;
      const arpFreq = chord[arpStep % chord.length] * 2;
      const arpEnv = Math.exp(-6 * ((beat * 4) % 1));
      const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.15;

      // Warm Pad / Chord Synth
      let pad = 0;
      for (const freq of chord) {
        pad += (Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(2 * Math.PI * freq * 1.002 * t)) * 0.05;
      }

      // 808 Sub Bass
      const bassEnv = Math.exp(-2.5 * (beat % 2));
      const bass = (Math.sin(2 * Math.PI * bassNote * t) + 0.3 * Math.sin(2 * Math.PI * (bassNote * 2) * t)) * bassEnv * 0.28;

      // Kick drum on beat 0, 2
      let kick = 0;
      const kickPhase = beat % 1;
      if (kickPhase < 0.25) {
        const kickFreq = 140 * Math.exp(-25 * kickPhase);
        kick = Math.sin(2 * Math.PI * kickFreq * kickPhase) * Math.exp(-12 * kickPhase) * 0.35;
      }

      // Snare on beat 1, 3
      let snare = 0;
      const snarePhase = (beat + 0.5) % 1;
      if ((Math.floor(beat) % 2 === 1) && snarePhase < 0.3) {
        snare = (Math.random() * 2 - 1) * Math.exp(-14 * snarePhase) * 0.18;
      }

      // Hi-hats
      const hatPhase = (beat * 2) % 1;
      const hat = (Math.random() * 2 - 1) * Math.exp(-35 * hatPhase) * 0.07;

      const sample = (arp + pad + bass + kick + snare + hat) * 0.7;
      left[i] = sample;
      right[i] = sample;
    }

    this.audioBuffer = buffer;
    this.duration = duration;
    return buffer;
  }

  play() {
    if (!this.audioBuffer) return;
    this.initContext();

    if (this.isPlaying) {
      this.pause();
    }

    this.buildGraph();

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.bassBooster);

    this.sourceNode.onended = () => {
      if (this.getCurrentTime() >= this.duration - 0.2) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        if (this.onEnded) this.onEnded();
      }
    };

    const offset = Math.min(this.pauseOffset, this.duration);
    this.startTime = this.ctx.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;

    this.startOrbitLoop();
  }

  pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.ctx.currentTime - this.startTime;
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
    }
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  seek(targetTime) {
    const wasPlaying = this.isPlaying;
    if (this.isPlaying) {
      this.pause();
    }
    this.pauseOffset = Math.max(0, Math.min(targetTime, this.duration));
    if (wasPlaying) {
      this.play();
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return Math.min(this.pauseOffset, this.duration);
    return Math.min(this.ctx.currentTime - this.startTime, this.duration);
  }

  /**
   * Real-time 360° Circular Binaural Panning LFO
   */
  startOrbitLoop() {
    const animate = () => {
      if (!this.isPlaying) return;

      const currentTime = this.getCurrentTime();
      if (this.is8DEnabled && this.pannerNode) {
        // Base orbit angle
        let angle = ((currentTime % this.orbitPeriod) / this.orbitPeriod) * 2 * Math.PI;

        let x = 0;
        let z = -1;
        let y = 0;

        if (this.direction === 'ccw') {
          angle = -angle;
        }

        if (this.direction === 'figure8') {
          // Lemniscate / Figure 8 path
          const t = angle;
          x = (this.radius * Math.sin(t)) * this.intensity;
          z = (this.radius * Math.sin(t) * Math.cos(t)) * this.intensity - (1.0 - this.intensity);
          y = Math.sin(t * 2) * 0.2 * this.intensity;
        } else {
          // Standard Circular Orbit with intensity scale
          x = Math.sin(angle) * this.radius * this.intensity;
          z = (-Math.cos(angle) * this.radius * this.intensity) - (1.0 - this.intensity);
          y = Math.sin(angle * 2) * 0.3 * this.intensity;
        }

        const now = this.ctx.currentTime;
        if (this.pannerNode.positionX) {
          this.pannerNode.positionX.setValueAtTime(x, now);
          this.pannerNode.positionY.setValueAtTime(y, now);
          this.pannerNode.positionZ.setValueAtTime(z, now);
        } else {
          this.pannerNode.setPosition(x, y, z);
        }

        // Dynamic Head-Shadow Effect
        if (this.headShadowFilter) {
          const behindFactor = Math.max(0, (z + (1.0 - this.intensity)) / this.radius);
          const cutoff = 20000 - behindFactor * 15800 * this.intensity;
          this.headShadowFilter.frequency.setValueAtTime(cutoff, now);
        }

        if (this.onPositionUpdate) {
          this.onPositionUpdate(angle, x, z);
        }
      }

      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  /**
   * High-Performance Async Chunked 8D Audio Renderer
   * Directly processes PCM channels with 8D spatial pan modulation, bass boost, and Haas reverb
   * Runs in asynchronous slices with real-time UI progress updates without blocking the browser.
   */
  async export8DToWav(onProgress) {
    if (!this.audioBuffer) {
      this.createDemoTrackBuffer();
    }

    const buffer = this.audioBuffer;
    const sampleRate = buffer.sampleRate;
    const numChannels = buffer.numberOfChannels;
    const totalSamples = buffer.length;

    const inLeft = buffer.getChannelData(0);
    const inRight = numChannels > 1 ? buffer.getChannelData(1) : inLeft;

    const outLeft = new Float32Array(totalSamples);
    const outRight = new Float32Array(totalSamples);

    const orbitPeriod = this.orbitPeriod || 8.0;
    const intensity = this.intensity !== undefined ? this.intensity : 0.85;
    const isCcw = this.direction === 'ccw';
    const isBassBoost = this.bassBoostActive;
    const reverbWet = (this.reverbDepth || 0.35) * 0.4;

    // Delay line buffer for spatial Haas & room depth
    const delaySamplesL = Math.floor(sampleRate * 0.025);
    const delaySamplesR = Math.floor(sampleRate * 0.038);
    const maxDelay = Math.max(delaySamplesL, delaySamplesR);
    const historyL = new Float32Array(maxDelay);
    const historyR = new Float32Array(maxDelay);
    let histIdx = 0;

    // Process 44,100 samples per async slice
    const chunkSize = 44100;
    let sampleIdx = 0;

    return new Promise((resolve) => {
      function processChunk() {
        const end = Math.min(totalSamples, sampleIdx + chunkSize);

        for (let i = sampleIdx; i < end; i++) {
          const t = i / sampleRate;
          let angle = ((t % orbitPeriod) / orbitPeriod) * 2 * Math.PI;
          if (isCcw) angle = -angle;

          // Spatial Pan Factor (-1.0 to +1.0)
          const pan = Math.sin(angle) * intensity;
          // Equal power panning curve
          const leftGain = Math.cos((pan + 1) * Math.PI / 4);
          const rightGain = Math.sin((pan + 1) * Math.PI / 4);

          // Head-shadow attenuation when sound is on opposite side
          const behindFactor = Math.max(0, -Math.cos(angle)) * intensity;
          const toneDamp = 1.0 - (behindFactor * 0.35);

          let sL = inLeft[i] * toneDamp;
          let sR = inRight[i] * toneDamp;

          // Bass boost
          if (isBassBoost) {
            sL *= 1.25;
            sR *= 1.25;
          }

          // Read delayed samples for 3D room perception
          const readL = (histIdx - delaySamplesL + maxDelay) % maxDelay;
          const readR = (histIdx - delaySamplesR + maxDelay) % maxDelay;
          const revL = historyL[readL] * reverbWet;
          const revR = historyR[readR] * reverbWet;

          // Store in history
          historyL[histIdx] = sL;
          historyR[histIdx] = sR;
          histIdx = (histIdx + 1) % maxDelay;

          // Output sample calculation
          outLeft[i] = Math.max(-1, Math.min(1, sL * leftGain + revL));
          outRight[i] = Math.max(-1, Math.min(1, sR * rightGain + revR));
        }

        sampleIdx = end;
        const progressPercent = Math.min(99, Math.round((sampleIdx / totalSamples) * 100));

        if (onProgress) {
          onProgress(progressPercent);
        }

        if (sampleIdx < totalSamples) {
          setTimeout(processChunk, 2);
        } else {
          if (onProgress) onProgress(100);

          // Encode to 16-bit stereo WAV
          const wavBlob = encodeWav(outLeft, outRight, sampleRate);
          resolve(wavBlob);
        }
      }

      function encodeWav(left, right, sRate) {
        const channels = 2;
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = channels * bytesPerSample;
        const length = left.length * channels * bytesPerSample;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);

        function writeStr(offset, str) {
          for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        }

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, channels, true);
        view.setUint32(24, sRate, true);
        view.setUint32(28, sRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeStr(36, 'data');
        view.setUint32(40, length, true);

        let offset = 44;
        for (let i = 0; i < left.length; i++) {
          let valL = Math.max(-1, Math.min(1, left[i]));
          let valR = Math.max(-1, Math.min(1, right[i]));
          view.setInt16(offset, valL < 0 ? valL * 0x8000 : valL * 0x7FFF, true);
          offset += 2;
          view.setInt16(offset, valR < 0 ? valR * 0x8000 : valR * 0x7FFF, true);
          offset += 2;
        }

        return new Blob([view], { type: 'audio/wav' });
      }

      setTimeout(processChunk, 10);
    });
  }
}
