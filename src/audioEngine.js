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
   * Offline 8D Audio Renderer & WAV Exporter
   * Renders the complete audio buffer with exact 8D binaural modulation and downloads
   */
  async export8DToWav(onProgress) {
    if (!this.audioBuffer) throw new Error("No audio loaded");

    const sampleRate = this.audioBuffer.sampleRate;
    const duration = this.audioBuffer.duration;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(2, sampleRate * duration, sampleRate);

    // Build DSP inside offline context
    const source = offlineCtx.createBufferSource();
    source.buffer = this.audioBuffer;

    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 110;
    bass.gain.value = this.bassBoostActive ? 6 : 0;

    const headShadow = offlineCtx.createBiquadFilter();
    headShadow.type = 'lowpass';
    headShadow.frequency.value = 20000;

    const panner = offlineCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';

    // Calculate parameter automation points
    const stepTime = 0.05; // 20 updates per sec
    const totalSteps = Math.ceil(duration / stepTime);

    for (let step = 0; step < totalSteps; step++) {
      const t = step * stepTime;
      let angle = ((t % this.orbitPeriod) / this.orbitPeriod) * 2 * Math.PI;

      let x = 0;
      let z = -1;
      let y = 0;

      if (this.direction === 'ccw') angle = -angle;

      if (this.direction === 'figure8') {
        x = (this.radius * Math.sin(angle)) * this.intensity;
        z = (this.radius * Math.sin(angle) * Math.cos(angle)) * this.intensity - (1.0 - this.intensity);
        y = Math.sin(angle * 2) * 0.2 * this.intensity;
      } else {
        x = Math.sin(angle) * this.radius * this.intensity;
        z = (-Math.cos(angle) * this.radius * this.intensity) - (1.0 - this.intensity);
        y = Math.sin(angle * 2) * 0.3 * this.intensity;
      }

      if (panner.positionX) {
        panner.positionX.setValueAtTime(x, t);
        panner.positionY.setValueAtTime(y, t);
        panner.positionZ.setValueAtTime(z, t);
      } else {
        panner.setPosition(x, y, z);
      }

      const behindFactor = Math.max(0, (z + (1.0 - this.intensity)) / this.radius);
      const cutoff = 20000 - behindFactor * 15800 * this.intensity;
      headShadow.frequency.setValueAtTime(cutoff, t);
    }

    // Offline reverb
    const convolver = offlineCtx.createConvolver();
    const irLength = sampleRate * 2.2;
    const irBuffer = offlineCtx.createBuffer(2, irLength, sampleRate);
    const irL = irBuffer.getChannelData(0);
    const irR = irBuffer.getChannelData(1);
    for (let i = 0; i < irLength; i++) {
      const env = Math.pow((irLength - i) / irLength, 2.5);
      irL[i] = (Math.random() * 2 - 1) * env;
      irR[i] = (Math.random() * 2 - 1) * env;
    }
    convolver.buffer = irBuffer;

    const dryGain = offlineCtx.createGain();
    const wetGain = offlineCtx.createGain();
    const wet = this.reverbDepth;
    dryGain.gain.value = 1.0 - (wet * 0.25);
    wetGain.gain.value = wet * 0.65;

    // Master volume in offline
    const master = offlineCtx.createGain();
    master.gain.value = this.volume;

    // Connect
    source.connect(bass);
    bass.connect(headShadow);
    headShadow.connect(panner);

    panner.connect(dryGain);
    dryGain.connect(master);

    panner.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(master);

    master.connect(offlineCtx.destination);

    source.start(0);

    if (onProgress) {
      const progressInterval = setInterval(() => {
        if (offlineCtx.currentTime !== undefined) {
          const p = Math.min(95, Math.round((offlineCtx.currentTime / duration) * 100));
          onProgress(p);
        }
      }, 100);
      const renderedBuffer = await offlineCtx.startRendering();
      clearInterval(progressInterval);
      onProgress(100);
      return this.bufferToWavBlob(renderedBuffer);
    } else {
      const renderedBuffer = await offlineCtx.startRendering();
      return this.bufferToWavBlob(renderedBuffer);
    }
  }

  /**
   * Encodes an AudioBuffer into a WAV Blob
   */
  bufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const length = buffer.length * numChannels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Interleave left and right channels
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        let sample = channels[channel][i];
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
