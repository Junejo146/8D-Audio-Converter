import * as THREE from 'three';
import guitarBoyUrl from './assets/guitar_boy.png';

/**
 * 8D Audio Converter — Cinematic 3D Animated Splash Screen Engine
 * Features:
 * - Authentic 3D Cartoon Guitar Boy (Joyful running & jumping with acoustic guitar)
 * - Realistic running stride animation: runs in from left, strums with musical shockwaves, and runs out to right
 * - Smooth, relaxed cinematic pacing (slightly slowed down for a premium feel)
 * - Perfectly sized Single Unified Glowing 3D Emblem Ring that fits mobile screens without clipping:
 *     1) 3D Dual-Beamed Music Note Emblem (♫)
 *     2) 3D Glowing "8D AUDIO CONVERTER" Title
 * - Volumetric spark explosion & floating musical notes (♪ ♫ ♬ 8D)
 * - One-tap skip anytime & smooth cinematic fade-out into home screen
 */
export class SplashScreen3D {
  constructor(containerElement, onComplete) {
    this.container = containerElement;
    this.onComplete = onComplete;
    this.isDisposed = false;
    this.isSkipped = false;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animFrameId = null;
    this.clock = new THREE.Clock();

    // Guitar Boy Character Components
    this.characterGroup = null;
    this.characterMesh = null;
    this.characterGlowMesh = null;
    this.characterShadow = null;
    this.guitarSoundRings = [];

    // Lighting & Atmosphere
    this.ambientLight = null;
    this.spotLight = null;
    this.centerBurstLight = null;
    this.titleLight = null;
    this.fogParticles = null;

    // Particles & Floating Notes
    this.burstParticleGroup = null;
    this.burstParticles = [];
    this.sparkPoints = null;
    this.musicNotes = [];

    // Unified 3D Logo & Title (ALL IN ONE CIRCLE - MOBILE OPTIMIZED)
    this.unifiedEmblemGroup = null;
    this.musicNoteGroup = null;
    this.text8DAudio = null;
    this.textConverter = null;
    this.singleUnifiedRing = null;
    this.singleUnifiedGlowRing = null;

    // Sequence State
    this.elapsedTime = 0;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061118);
    this.scene.fog = new THREE.FogExp2(0x061118, 0.045);

    // 2. Camera (Responsive mobile portrait optimized perspective)
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    this.camera.position.set(0, 0.3, 4.8);
    this.camera.lookAt(0, 0.05, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.container.appendChild(this.renderer.domElement);

    // 4. Build Environment, Character & Unified Emblem
    this.setupLighting();
    this.setupEnvironment();
    this.setupRunningGuitarBoy();
    this.setupBurstEffects();
    this.setupUnifiedEmblemInSingleCircle();

    // 5. Tap anywhere to skip
    this.clickHandler = () => {
      if (!this.isSkipped && this.elapsedTime > 0.4) {
        this.finishSplash();
      }
    };
    this.container.addEventListener('click', this.clickHandler);
    this.container.addEventListener('touchstart', this.clickHandler, { passive: true });

    // 6. Handle Resize
    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);

    // 7. Start Loop
    this.clock.start();
    this.animate();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x0f2f3d, 2.2);
    this.scene.add(this.ambientLight);

    // Main Key Light from Top Front
    this.spotLight = new THREE.SpotLight(0x2dd4bf, 6.0, 22, Math.PI / 3.0, 0.45);
    this.spotLight.position.set(1.5, 5.0, 3.5);
    this.spotLight.target.position.set(0, 0, 0);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    // Center Energy Burst Light
    this.centerBurstLight = new THREE.PointLight(0xfde047, 0, 16, 1.3);
    this.centerBurstLight.position.set(0, 0.2, 0.4);
    this.scene.add(this.centerBurstLight);

    // Title Spotlight
    this.titleLight = new THREE.PointLight(0x5eead4, 0, 14, 1.2);
    this.titleLight.position.set(0, 0.35, 1.2);
    this.scene.add(this.titleLight);

    // Warm Gold Rim Light from Back
    const rimLight = new THREE.DirectionalLight(0xfacc15, 2.5);
    rimLight.position.set(-3.5, 2.5, -3.5);
    this.scene.add(rimLight);
  }

  setupEnvironment() {
    // 1. Dark Reflective Grid Floor
    const gridHelper = new THREE.GridHelper(26, 34, 0x2dd4bf, 0x0f2f38);
    gridHelper.position.y = -0.95;
    this.scene.add(gridHelper);

    // Semi-reflective floor plane
    const floorGeo = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x061118,
      roughness: 0.15,
      metalness: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.955;
    this.scene.add(floor);

    // 2. Atmospheric Dust Sparkles
    const particleCount = 85;
    const partGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 1] = Math.random() * 5 - 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;

      const isYellow = Math.random() > 0.5;
      colors[i * 3] = isYellow ? 0.98 : 0.18;
      colors[i * 3 + 1] = isYellow ? 0.88 : 0.83;
      colors[i * 3 + 2] = isYellow ? 0.28 : 0.75;
    }

    partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    partGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const partMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.fogParticles = new THREE.Points(partGeo, partMat);
    this.scene.add(this.fogParticles);
  }

  /**
   * AUTHENTIC RUNNING GUITAR BOY CHARACTER SETUP
   */
  setupRunningGuitarBoy() {
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.set(-4.8, 0.1, 0);

    const textureLoader = new THREE.TextureLoader();
    const charTexture = textureLoader.load(guitarBoyUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
    });

    // 1. Primary Character Billboard Mesh
    const planeGeo = new THREE.PlaneGeometry(2.1, 2.1);
    const planeMat = new THREE.MeshBasicMaterial({
      map: charTexture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.02
    });

    this.characterMesh = new THREE.Mesh(planeGeo, planeMat);
    this.characterMesh.position.set(0, 0.1, 0);
    this.characterGroup.add(this.characterMesh);

    // 2. Soft Ambient Neon Aura Mesh behind Character
    const glowMat = new THREE.MeshBasicMaterial({
      map: charTexture,
      transparent: true,
      color: 0x2dd4bf,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    this.characterGlowMesh = new THREE.Mesh(planeGeo, glowMat);
    this.characterGlowMesh.scale.set(1.05, 1.05, 1.0);
    this.characterGlowMesh.position.set(0, 0.1, -0.04);
    this.characterGroup.add(this.characterGlowMesh);

    // 3. Dynamic Running Ground Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.65
    });
    this.characterShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.characterShadow.rotation.x = -Math.PI / 2;
    this.characterShadow.position.set(0, -0.93, 0);
    this.characterGroup.add(this.characterShadow);

    // 4. Strumming Sound Rings emitted from Guitar
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.RingGeometry(0.08, 0.11, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00f084 : 0xfacc15,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(-0.25, 0.05, 0.05);
      this.guitarSoundRings.push(ringMesh);
      this.characterGroup.add(ringMesh);
    }

    this.scene.add(this.characterGroup);
  }

  setupBurstEffects() {
    this.burstParticleGroup = new THREE.Group();

    // 1. Upward shooting sparkles
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = -0.1;
      positions[i * 3 + 2] = 0.3 + (Math.random() - 0.5) * 0.3;

      const isYellow = Math.random() > 0.4;
      colors[i * 3] = isYellow ? 1.0 : 0.18;
      colors[i * 3 + 1] = isYellow ? 0.9 : 0.85;
      colors[i * 3 + 2] = isYellow ? 0.2 : 0.75;

      this.burstParticles.push({
        vx: (Math.random() - 0.5) * 0.05,
        vy: 0.03 + Math.random() * 0.05,
        vz: (Math.random() - 0.5) * 0.05,
        life: Math.random() * 0.8,
        maxLife: 0.8 + Math.random() * 0.4
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.sparkPoints = new THREE.Points(geo, mat);
    this.burstParticleGroup.add(this.sparkPoints);

    // 2. Floating 3D Music Note Sprites (♪, ♫, ♬, 8D)
    const noteChars = ['♪', '♫', '♬', '8D'];
    noteChars.forEach((char, idx) => {
      const noteCanvas = document.createElement('canvas');
      noteCanvas.width = 128;
      noteCanvas.height = 128;
      const ctx = noteCanvas.getContext('2d');
      ctx.fillStyle = idx % 2 === 0 ? '#fde047' : '#5eead4';
      ctx.font = char === '8D' ? 'bold 64px "Outfit", sans-serif' : 'bold 88px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.fillText(char, 64, 64);

      const tex = new THREE.CanvasTexture(noteCanvas);
      const noteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(noteMat);
      sprite.scale.set(0.34, 0.34, 0.34);
      sprite.position.set((idx - 1.5) * 0.32, 0.1, 0.4);
      sprite.userData = {
        vx: (idx - 1.5) * 0.009,
        vy: 0.018 + Math.random() * 0.015,
        vz: (Math.random() - 0.5) * 0.008
      };
      this.musicNotes.push(sprite);
      this.burstParticleGroup.add(sprite);
    });

    this.scene.add(this.burstParticleGroup);
  }

  /**
   * SINGLE UNIFIED 3D EMBLEM (PERFECTLY SIZED FOR MOBILE SCREENS):
   * BOTH the Music Note Emblem (♫) AND "8D AUDIO CONVERTER" text are enclosed inside ONE SINGLE glowing animated circle ring!
   */
  setupUnifiedEmblemInSingleCircle() {
    this.unifiedEmblemGroup = new THREE.Group();
    this.unifiedEmblemGroup.position.set(0, -0.2, 0.2);
    this.unifiedEmblemGroup.scale.set(0.001, 0.001, 0.001); // Hidden initially

    // 1. Radiant 3D Music Note Emblem (♫ Dual Beamed) - Top Half
    this.musicNoteGroup = new THREE.Group();
    this.musicNoteGroup.scale.set(0.82, 0.82, 0.82);

    const matGold = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.88
    });
    const matCyan = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.88
    });

    // Note 1 Head
    const headGeo = new THREE.SphereGeometry(0.13, 22, 22);
    const headLeft = new THREE.Mesh(headGeo, matGold);
    headLeft.scale.set(1.15, 0.82, 0.75);
    headLeft.rotation.z = 0.35;
    headLeft.position.set(-0.25, -0.12, 0);
    this.musicNoteGroup.add(headLeft);

    // Note 2 Head
    const headRight = new THREE.Mesh(headGeo, matGold);
    headRight.scale.set(1.15, 0.82, 0.75);
    headRight.rotation.z = 0.35;
    headRight.position.set(0.18, -0.04, 0);
    this.musicNoteGroup.add(headRight);

    // Stems
    const stemGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.52, 16);
    const stemLeft = new THREE.Mesh(stemGeo, matCyan);
    stemLeft.position.set(-0.15, 0.14, 0);
    this.musicNoteGroup.add(stemLeft);

    const stemRight = new THREE.Mesh(stemGeo, matCyan);
    stemRight.position.set(0.28, 0.22, 0);
    this.musicNoteGroup.add(stemRight);

    // Crossbeams
    const beamGeo1 = new THREE.BoxGeometry(0.50, 0.07, 0.05);
    const beam1 = new THREE.Mesh(beamGeo1, matGold);
    beam1.rotation.z = 0.17;
    beam1.position.set(0.06, 0.38, 0);
    this.musicNoteGroup.add(beam1);

    const beamGeo2 = new THREE.BoxGeometry(0.50, 0.045, 0.045);
    const beam2 = new THREE.Mesh(beamGeo2, matCyan);
    beam2.rotation.z = 0.17;
    beam2.position.set(0.06, 0.29, 0);
    this.musicNoteGroup.add(beam2);

    // Spatial Core behind note
    const coreGeo = new THREE.SphereGeometry(0.13, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0.06, 0.12, -0.04);
    this.musicNoteGroup.add(core);

    this.musicNoteGroup.position.set(0, 0.32, 0.05);
    this.unifiedEmblemGroup.add(this.musicNoteGroup);

    // 2. 3D Title "8D AUDIO" & "CONVERTER" - Bottom Half (Optimized Size)
    const canvas1 = document.createElement('canvas');
    canvas1.width = 512;
    canvas1.height = 120;
    const ctx1 = canvas1.getContext('2d');
    ctx1.fillStyle = '#ffffff';
    ctx1.font = '900 76px "Outfit", sans-serif';
    ctx1.textAlign = 'center';
    ctx1.textBaseline = 'middle';
    ctx1.shadowColor = '#2dd4bf';
    ctx1.shadowBlur = 20;
    ctx1.fillText('8D AUDIO', 256, 60);

    const tex1 = new THREE.CanvasTexture(canvas1);
    const plane1Mat = new THREE.MeshBasicMaterial({
      map: tex1,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.text8DAudio = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.30), plane1Mat);
    this.text8DAudio.position.set(0, -0.16, 0.05);
    this.unifiedEmblemGroup.add(this.text8DAudio);

    // Subtitle "CONVERTER"
    const canvas2 = document.createElement('canvas');
    canvas2.width = 512;
    canvas2.height = 70;
    const ctx2 = canvas2.getContext('2d');
    ctx2.fillStyle = '#fde047';
    ctx2.font = '800 42px "Outfit", sans-serif';
    ctx2.letterSpacing = '6px';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.shadowColor = '#eab308';
    ctx2.shadowBlur = 16;
    ctx2.fillText('CONVERTER', 256, 35);

    const tex2 = new THREE.CanvasTexture(canvas2);
    const plane2Mat = new THREE.MeshBasicMaterial({
      map: tex2,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.textConverter = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.15), plane2Mat);
    this.textConverter.position.set(0, -0.36, 0.05);
    this.unifiedEmblemGroup.add(this.textConverter);

    // =========================================================================
    // THE ONE SINGLE UNIFIED GLOWING CIRCLE (MOBILE-FRIENDLY COMPACT RADIUS 0.88):
    // =========================================================================
    const ringGeo = new THREE.TorusGeometry(0.88, 0.018, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.85
    });
    this.singleUnifiedRing = new THREE.Mesh(ringGeo, ringMat);
    this.singleUnifiedRing.position.set(0, 0.02, 0);
    this.unifiedEmblemGroup.add(this.singleUnifiedRing);

    // Secondary Outer Radiant Halo on the Single Circle
    const glowRingGeo = new THREE.TorusGeometry(0.90, 0.010, 8, 64);
    const glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.singleUnifiedGlowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
    this.singleUnifiedGlowRing.position.set(0, 0.02, -0.02);
    this.unifiedEmblemGroup.add(this.singleUnifiedGlowRing);

    this.scene.add(this.unifiedEmblemGroup);
  }

  /**
   * Main Cinematic Timeline (Smooth, Relaxed Pacing)
   * 1. Guitar boy runs in from left, playing and jumping with musical waves (0.0s - 4.8s)
   * 2. Boy runs out to right (4.8s - 5.2s)
   * 3. Energy burst & floating notes from center (5.2s - 6.4s)
   * 4. Single Unified Emblem (Music note + 8D Audio Converter in ONE circle) emerges (6.4s - 7.6s)
   * 5. Final majestic showcase & smooth transition (7.6s - 8.6s)
   */
  updateCinematicTimeline(dt) {
    this.elapsedTime += dt;
    const t = this.elapsedTime;

    // SCENE 1: Character Runs from Left, Plays Guitar & Exits to Right (0.0s - 4.8s)
    if (t < 4.80) {
      const runProg = t / 4.80;
      // Stride motion across the screen from -4.8 to +4.8 (smooth & relaxed)
      const currentX = -4.8 + runProg * 9.6;
      this.characterGroup.position.x = currentX;

      // Realistic running cadence: smooth bounce, gentle center leap & forward tilt
      const runCadence = t * 10.5; // Natural running stride speed
      const bounce = Math.abs(Math.sin(runCadence)) * 0.11;
      const centerLeap = Math.exp(-Math.pow((currentX) / 1.6, 2)) * 0.26; // Smooth jump at center!
      this.characterGroup.position.y = 0.05 + bounce + centerLeap;

      // Dynamic running tilt
      this.characterMesh.rotation.z = -0.05 + Math.sin(runCadence) * 0.045;
      if (this.characterGlowMesh) {
        this.characterGlowMesh.rotation.z = this.characterMesh.rotation.z;
        this.characterGlowMesh.material.opacity = 0.4 + Math.sin(t * 5.0) * 0.25;
      }

      // Guitar Strumming Sound Rings expanding behind him
      this.guitarSoundRings.forEach((ring, idx) => {
        const ringProg = ((t * 2.8 + idx * 0.5) % 1.5) / 1.5;
        const s = 1.0 + ringProg * 2.2;
        ring.scale.set(s, s, 1);
        ring.material.opacity = Math.max(0, (1.0 - ringProg) * 0.8);
      });

      // Camera smoothly tracks character
      this.camera.position.x = currentX * 0.15;
      this.camera.position.y = 0.38;
      this.camera.position.z = 4.8;
      this.camera.lookAt(currentX * 0.2, 0.08, 0);
    }

    // SCENE 2: Character Exited Screen -> Volumetric Light Eruption & Floating Notes (4.8s - 6.2s)
    else if (t >= 4.80 && t < 6.20) {
      if (this.characterGroup.visible) {
        this.characterGroup.visible = false;
      }

      const burstProg = (t - 4.80) / 1.40;
      const burstIntensity = Math.min(1.0, burstProg * 1.3);

      this.centerBurstLight.intensity = burstIntensity * 26.0;
      this.spotLight.intensity = 5.5 + burstIntensity * 4.0;

      // Spark particles
      this.sparkPoints.material.opacity = Math.min(1.0, burstIntensity * 1.5);
      const pos = this.sparkPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.burstParticles.length; i++) {
        const bp = this.burstParticles[i];
        pos[i * 3] += bp.vx;
        pos[i * 3 + 1] += bp.vy;
        pos[i * 3 + 2] += bp.vz;
      }
      this.sparkPoints.geometry.attributes.position.needsUpdate = true;

      // Music Notes
      this.musicNotes.forEach((note) => {
        note.material.opacity = Math.min(1.0, burstIntensity * 1.8);
        note.position.y += note.userData.vy;
        note.position.x += note.userData.vx;
      });

      this.camera.position.x = (Math.random() - 0.5) * 0.01 * burstIntensity;
      this.camera.position.y = 0.38;
      this.camera.position.z = 4.5;
      this.camera.lookAt(0, 0.12, 0);
    }

    // SCENE 3: The Single Unified Emblem (Music note + 8D Audio Converter in ONE circle) Emergence (6.2s - 7.5s)
    else if (t >= 6.20 && t < 7.50) {
      if (this.characterGroup.visible) {
        this.characterGroup.visible = false;
      }

      const riseProg = (t - 6.20) / 1.30;
      const easedRise = this.easeOutBack(riseProg);

      const currentScale = Math.min(1.0, 0.05 + easedRise * 0.95);
      this.unifiedEmblemGroup.scale.set(currentScale, currentScale, currentScale);
      this.unifiedEmblemGroup.position.y = -0.25 + easedRise * 0.75;
      this.unifiedEmblemGroup.position.z = 0.2;
      this.unifiedEmblemGroup.rotation.y = (1 - Math.min(1.0, riseProg)) * 0.28;

      this.musicNoteGroup.rotation.y = Math.sin(t * 2.0) * 0.15;
      this.titleLight.intensity = riseProg * 8.5;

      // Animate the single unified ring during emergence
      if (this.singleUnifiedRing) {
        this.singleUnifiedRing.rotation.z += 0.012;
      }
      if (this.singleUnifiedGlowRing) {
        this.singleUnifiedGlowRing.rotation.z -= 0.009;
      }

      this.sparkPoints.material.opacity = Math.max(0, 1.0 - riseProg);
      this.musicNotes.forEach((n) => (n.material.opacity = Math.max(0, 1.0 - riseProg)));

      this.camera.position.x = 0;
      this.camera.position.y = 0.48;
      this.camera.position.z = 4.0 + riseProg * 0.7;
      this.camera.lookAt(0, 0.45, 0);
    }

    // SCENE 4: Final Majestic Unified Emblem Showcase (7.5s - 8.6s)
    else if (t >= 7.50) {
      if (this.characterGroup.visible) {
        this.characterGroup.visible = false;
      }

      this.unifiedEmblemGroup.scale.set(1, 1, 1);
      this.unifiedEmblemGroup.position.y = 0.50 + Math.sin(t * 1.8) * 0.028;
      this.musicNoteGroup.rotation.y = Math.sin(t * 1.2) * 0.12;

      // Animate the Single Unified Circle (smooth dual-spin & gentle breathing pulse)
      if (this.singleUnifiedRing) {
        this.singleUnifiedRing.rotation.z += 0.010;
        const s = 1.0 + Math.sin(t * 2.8) * 0.045;
        this.singleUnifiedRing.scale.set(s, s, s);
      }
      if (this.singleUnifiedGlowRing) {
        this.singleUnifiedGlowRing.rotation.z -= 0.012;
        const sGlow = 1.0 + Math.cos(t * 2.8) * 0.055;
        this.singleUnifiedGlowRing.scale.set(sGlow, sGlow, sGlow);
      }

      this.camera.position.x = Math.sin(t * 0.6) * 0.04;
      this.camera.position.y = 0.46 + Math.cos(t * 0.6) * 0.02;
      this.camera.position.z = 4.7;
      this.camera.lookAt(0, 0.46, 0);

      // Smooth auto-transition into app after 8.6s
      if (t >= 8.6 && !this.isSkipped) {
        this.finishSplash();
      }
    }
  }

  animate() {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Update Dust Particles
    if (this.fogParticles) {
      this.fogParticles.rotation.y += 0.0015;
    }

    // Update Cinematic Timeline
    this.updateCinematicTimeline(dt);

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  finishSplash() {
    if (this.isSkipped) return;
    this.isSkipped = true;

    this.container.classList.add('splash-fade-out');

    setTimeout(() => {
      this.dispose();
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    }, 450);
  }

  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    // Responsive mobile framing: if portrait (aspect < 1.0), adjust FOV slightly to guarantee perfect fit
    if (this.camera.aspect < 1.0) {
      this.camera.fov = 48 + (1.0 - this.camera.aspect) * 12;
    } else {
      this.camera.fov = 46;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.resizeHandler);
    if (this.container) {
      this.container.removeEventListener('click', this.clickHandler);
      this.container.removeEventListener('touchstart', this.clickHandler);
      this.container.style.display = 'none';
    }
    if (this.renderer && this.renderer.domElement) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  // Easing Functions
  easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
}

/**
 * Global helper to initialize and launch 3D splash screen
 */
export function init3DSplashScreen(onFinish) {
  const overlay = document.getElementById('splash-3d-overlay');
  if (!overlay) {
    if (onFinish) onFinish();
    return null;
  }

  overlay.style.display = 'block';
  overlay.classList.remove('splash-fade-out');

  const splash = new SplashScreen3D(overlay, () => {
    if (onFinish) onFinish();
  });

  return splash;
}
