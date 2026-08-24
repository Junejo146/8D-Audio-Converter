# 🎧 8D Audio Converter Mobile Application

A premium, futuristic **8D Audio Converter** mobile application built with **Web Audio API (HRTF 360° Binaural Spatializer)** and packaged as a native Android APK using **Capacitor**.

![License](https://img.shields.io/badge/license-MIT-purple.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-blue.svg)
![Audio](https://img.shields.io/badge/Audio-360%C2%B0%20Binaural%208D-brightgreen.svg)

---

## ✨ Features

- **🎚️ Dual-Layer Audio Studio**:
  - **Layer 1 (Normal Audio)**: Pure original stereo audio preview.
  - **Layer 2 (8D Spatial Audio)**: 360° rotating binaural spatial effect with glowing waveform.
  - Independent play/pause controls for isolated A/B testing.
- **⚡ 1-Tap 8D Presets**:
  - `✨ Classic 8D` (8.0s orbit, 3.0m depth, concert reverb & bass boost)
  - `🌊 Smooth` (14.0s slow orbit, 2.2m depth)
  - `🌌 Deep 8D` (10.0s orbit, 4.5m wide depth, heavy space reverb)
  - `⚡ Fast` (4.0s dynamic orbit)
- **🎛️ Real-time Custom Controls**:
  - Orbit Speed & 360° Spatial Depth Sliders
  - Concert Reverb & 8D Bass Booster
- **📱 Native Android Build**:
  - Packaged with Capacitor 6 + Gradle 8.14.3.
  - Full local device file-system access & offline conversion rendering.
- **🎨 Glassmorphism & Cyber Dark UI**:
  - Midnight charcoal backgrounds with glowing neon cyan, purple, and emerald accents.
  - Responsive canvas waveform visualizers with click-to-seek scrubbing.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Android Studio](https://developer.android.com/studio) (for native APK builds)

### 1. Installation
```bash
git clone https://github.com/Junejo146/8D-Audio-Converter.git
cd 8D-Audio-Converter
npm install
```

### 2. Run Local Dev Server
```bash
npm run dev
```

### 3. Build & Run Native Android App
```bash
npm run build
npx cap copy android
cd android
./gradlew assembleDebug
```
The compiled APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🎧 Architecture

- **`src/audioEngine.js`**: Core Web Audio API pipeline (`PannerNode`, `BiquadFilterNode`, `ConvolverNode`, `OfflineAudioContext` for WAV export).
- **`src/app.js`**: Progressive UI state manager, dual-layer waveform renderers, and touch handlers.
- **`src/style.css`**: Mobile-optimized dark glassmorphism design system.

---

## 📄 License
MIT License. Created by [Junejo146](https://github.com/Junejo146).
