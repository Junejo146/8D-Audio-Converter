import fs from 'fs';
import path from 'path';

const outDir = path.resolve('sample_audios');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function writeWavFile(filepath, sampleRate, samples) {
  const numChannels = 2; // Stereo
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intSample), offset);
    offset += 2;
  }

  fs.writeFileSync(filepath, buffer);
  console.log(`Generated: ${filepath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const sampleRate = 44100;
const duration = 12; // 12 seconds each
const totalFrames = sampleRate * duration;

const tracksConfig = [
  {
    name: '01_Acoustic_Guitar_Melody.wav',
    gen: (t) => {
      const chords = [220, 261.63, 329.63, 392, 440];
      const c = chords[Math.floor((t * 2) % chords.length)];
      const pluck = Math.exp(-((t * 2) % 1) * 4);
      return Math.sin(2 * Math.PI * c * t) * pluck * 0.7;
    }
  },
  {
    name: '02_Deep_Synthwave_Bass.wav',
    gen: (t) => {
      const freq = 55 + Math.sin(t * 1.5) * 15;
      const saw = 2 * ((t * freq) % 1) - 1;
      const sub = Math.sin(2 * Math.PI * (freq / 2) * t);
      return (saw * 0.4 + sub * 0.6) * 0.8;
    }
  },
  {
    name: '03_Lofi_Chill_Beats.wav',
    gen: (t) => {
      const kick = Math.sin(2 * Math.PI * (80 * Math.exp(-(t % 0.5) * 15)) * t) * Math.exp(-(t % 0.5) * 8);
      const chord = (Math.sin(2 * Math.PI * 330 * t) + Math.sin(2 * Math.PI * 392 * t) + Math.sin(2 * Math.PI * 493.88 * t)) / 3;
      return (kick * 0.5 + chord * 0.35) * 0.85;
    }
  },
  {
    name: '04_Cyberpunk_Electro_Groove.wav',
    gen: (t) => {
      const f = 110 + (Math.floor(t * 8) % 8) * 30;
      const wave = Math.sin(2 * Math.PI * f * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 220 * t));
      return wave * 0.65;
    }
  },
  {
    name: '05_Vocal_Harmonics_Chords.wav',
    gen: (t) => {
      const f1 = 261.63, f2 = 329.63, f3 = 392.00, f4 = 523.25;
      const vibrato = 1 + 0.03 * Math.sin(2 * Math.PI * 5 * t);
      const choir = (
        Math.sin(2 * Math.PI * f1 * vibrato * t) +
        Math.sin(2 * Math.PI * f2 * vibrato * t) +
        Math.sin(2 * Math.PI * f3 * vibrato * t) +
        Math.sin(2 * Math.PI * f4 * vibrato * t)
      ) * 0.22;
      return choir;
    }
  },
  {
    name: '06_Piano_Dreamscape.wav',
    gen: (t) => {
      const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      const idx = Math.floor(t * 3) % notes.length;
      const n = notes[idx];
      const decay = Math.exp(-((t * 3) % 1) * 3.5);
      return Math.sin(2 * Math.PI * n * t) * decay * 0.7;
    }
  },
  {
    name: '07_Retro_80s_Pop_Rhythm.wav',
    gen: (t) => {
      const tempo = t * 4;
      const snare = (t % 0.5 > 0.25) ? (Math.random() * 2 - 1) * Math.exp(-(t % 0.25) * 12) * 0.4 : 0;
      const synth = Math.sin(2 * Math.PI * 440 * t) * 0.3 * (Math.sin(tempo) > 0 ? 1 : 0.2);
      return snare + synth;
    }
  },
  {
    name: '08_Ambient_Space_Drone.wav',
    gen: (t) => {
      const sweep = Math.sin(t * 0.2) * 20;
      const d1 = Math.sin(2 * Math.PI * (110 + sweep) * t);
      const d2 = Math.sin(2 * Math.PI * (164.81 + sweep) * t);
      const d3 = Math.sin(2 * Math.PI * (220 + sweep) * t);
      return (d1 + d2 + d3) * 0.25;
    }
  },
  {
    name: '09_Club_EDM_Drop_Beat.wav',
    gen: (t) => {
      const beat = (t * 2.2) % 1;
      const kick = Math.sin(2 * Math.PI * (130 * Math.exp(-beat * 20)) * t) * Math.exp(-beat * 6);
      const lead = (Math.sin(2 * Math.PI * 587.33 * t) > 0 ? 0.3 : -0.3) * (beat < 0.5 ? 1 : 0);
      return kick * 0.6 + lead * 0.4;
    }
  },
  {
    name: '10_Cinematic_Strings_Orchestra.wav',
    gen: (t) => {
      const mod = Math.sin(t * 0.8) * 0.5 + 0.5;
      const cello = Math.sin(2 * Math.PI * 130.81 * t) * 0.4;
      const violin = Math.sin(2 * Math.PI * 523.25 * (1 + 0.01 * Math.sin(6 * t)) * t) * 0.3 * mod;
      return cello + violin;
    }
  }
];

tracksConfig.forEach((cfg) => {
  const samples = new Float32Array(totalFrames * 2);
  for (let i = 0; i < totalFrames; i++) {
    const t = i / sampleRate;
    const val = cfg.gen(t);
    // Stereo spread (slight phase difference)
    samples[i * 2] = val * 0.9;
    samples[i * 2 + 1] = cfg.gen(t + 0.002) * 0.9;
  }
  const fullPath = path.join(outDir, cfg.name);
  writeWavFile(fullPath, sampleRate, samples);
});

console.log('All 10 sample audio files created successfully!');
