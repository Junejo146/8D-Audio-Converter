import * as THREE from 'three';

/**
 * 8D Audio Converter — Cinematic 3D Animated Splash Screen Engine
 * Smooth, Balanced Pacing (~5.8s total duration)
 * Features:
 * - Natural, fluid walking & kneeling animation of 3D Joker character
 * - Volumetric light burst with floating music particles
 * - INSTANT SNAP disappearance of Joker & bag when light & 8D Audio Converter emerge
 * - High-end 3D Music Note Emblem (♫) with dual beams, gold/cyan shaders
 * - 3D Extruded glowing "8D AUDIO CONVERTER" text
 * - Concentric pulsating spatial audio sound rings & volumetric fog
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

    // Scene Objects
    this.jokerGroup = null;
    this.jokerLeftLeg = null;
    this.jokerRightLeg = null;
    this.jokerLeftArm = null;
    this.jokerRightArm = null;
    this.jokerHead = null;
    this.jokerTorso = null;
    this.jokerBag = null;
    this.bagFlap = null;

    // Lighting & Atmosphere
    this.bagBurstLight = null;
    this.titleLight = null;
    this.ambientLight = null;
    this.spotLight = null;
    this.soundRings = [];

    // Particles
    this.burstParticleGroup = null;
    this.burstParticles = [];
    this.sparkPoints = null;
    this.musicNotes = [];

    // Title & 3D Music Note Logo Group
    this.logoGroup = null;
    this.musicNoteGroup = null;
    this.text8DAudio = null;
    this.textConverter = null;
    this.haloRings = [];

    // Sequence State
    this.elapsedTime = 0;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x061118);
    this.scene.fog = new THREE.FogExp2(0x061118, 0.05);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    this.camera.position.set(0, 0.5, 4.8);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.container.appendChild(this.renderer.domElement);

    // 4. Build 3D Environment, Objects & Lighting
    this.setupLighting();
    this.setupEnvironment();
    this.setupSoundRings();
    this.setupJokerCharacter();
    this.setupBurstEffects();
    this.setup3DMusicNoteLogo();

    // 5. Tap anywhere to skip if desired
    this.clickHandler = () => {
      if (!this.isSkipped && this.elapsedTime > 0.6) {
        this.finishSplash();
      }
    };
    this.container.addEventListener('click', this.clickHandler);
    this.container.addEventListener('touchstart', this.clickHandler, { passive: true });

    // 6. Handle Resize
    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);

    // 7. Start Cinematic Loop
    this.clock.start();
    this.animate();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x0e3a47, 1.8);
    this.scene.add(this.ambientLight);

    // Dynamic Top Key Light
    this.spotLight = new THREE.SpotLight(0x2dd4bf, 5.5, 18, Math.PI / 3.5, 0.45);
    this.spotLight.position.set(0, 5.5, 2.5);
    this.spotLight.target.position.set(0, 0, 0);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    // Explosive Volumetric Bag Light
    this.bagBurstLight = new THREE.PointLight(0xfde047, 0, 14, 1.2);
    this.bagBurstLight.position.set(0, -0.1, 0.6);
    this.scene.add(this.bagBurstLight);

    // Radiant Title Light
    this.titleLight = new THREE.PointLight(0x5eead4, 0, 12, 1.2);
    this.titleLight.position.set(0, 0.6, 1.2);
    this.scene.add(this.titleLight);

    // Back rim light
    const rimLight = new THREE.DirectionalLight(0x00f084, 2.0);
    rimLight.position.set(-3, 2, -4);
    this.scene.add(rimLight);
  }

  setupEnvironment() {
    // 1. Dark Reflective Grid Floor
    const gridHelper = new THREE.GridHelper(24, 32, 0x2dd4bf, 0x0f2f38);
    gridHelper.position.y = -0.75;
    this.scene.add(gridHelper);

    // Semi-reflective dark floor plane
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x061118,
      roughness: 0.15,
      metalness: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.755;
    this.scene.add(floor);

    // 2. Floating Atmospheric Dust Motes
    const particleCount = 70;
    const partGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
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
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.fogParticles = new THREE.Points(partGeo, partMat);
    this.scene.add(this.fogParticles);
  }

  setupSoundRings() {
    const ringRadii = [1.2, 1.8, 2.5, 3.3];
    ringRadii.forEach((radius, idx) => {
      const geo = new THREE.TorusGeometry(radius, 0.015, 8, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x2dd4bf : 0xfacc15,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(0, 0.3, -0.6);
      this.soundRings.push(ring);
      this.scene.add(ring);
    });
  }

  setupJokerCharacter() {
    this.jokerGroup = new THREE.Group();
    this.jokerGroup.position.set(-4.2, -0.1, 0);

    // Materials
    const matSuit = new THREE.MeshStandardMaterial({
      color: 0x0a161e,
      roughness: 0.45,
      metalness: 0.3
    });
    const matCyanGlow = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const matGoldGlow = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.95,
      roughness: 0.2
    });
    const matFace = new THREE.MeshStandardMaterial({
      color: 0x0f2b38,
      roughness: 0.3
    });

    // 1. Torso & Hoodie
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.65, 16);
    this.jokerTorso = new THREE.Mesh(torsoGeo, matSuit);
    this.jokerTorso.position.y = 0.32;
    this.jokerGroup.add(this.jokerTorso);

    // Cyan Hoodie Zipper
    const zipperGeo = new THREE.BoxGeometry(0.02, 0.6, 0.02);
    const zipper = new THREE.Mesh(zipperGeo, matCyanGlow);
    zipper.position.set(0, 0.32, 0.22);
    this.jokerGroup.add(zipper);

    // Neon Chest Arc
    const chestArcGeo = new THREE.TorusGeometry(0.08, 0.016, 8, 24, Math.PI);
    const chestArc = new THREE.Mesh(chestArcGeo, matGoldGlow);
    chestArc.rotation.z = Math.PI;
    chestArc.position.set(0, 0.45, 0.22);
    this.jokerGroup.add(chestArc);

    // 2. Head with Glowing Hood Rim
    this.jokerHead = new THREE.Group();
    this.jokerHead.position.set(0, 0.82, 0);

    const headGeo = new THREE.SphereGeometry(0.2, 18, 18);
    const head = new THREE.Mesh(headGeo, matFace);
    this.jokerHead.add(head);

    // Glowing Yellow Hood Ring
    const hoodRingGeo = new THREE.TorusGeometry(0.23, 0.032, 12, 32, Math.PI * 1.3);
    const hoodRing = new THREE.Mesh(hoodRingGeo, matGoldGlow);
    hoodRing.rotation.x = Math.PI / 7;
    hoodRing.rotation.z = -Math.PI * 0.65;
    hoodRing.position.set(0, 0.02, 0.05);
    this.jokerHead.add(hoodRing);

    // Eyes: Cyan Diamond Glowing Eyes
    [-0.07, 0.07].forEach((x) => {
      const eyeGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const eye = new THREE.Mesh(eyeGeo, matCyanGlow);
      eye.position.set(x, 0.04, 0.18);
      this.jokerHead.add(eye);
    });

    // Joker Smile
    const smileGeo = new THREE.TorusGeometry(0.075, 0.018, 8, 20, Math.PI * 0.7);
    const smile = new THREE.Mesh(smileGeo, matCyanGlow);
    smile.rotation.z = -Math.PI * 0.85;
    smile.position.set(0, -0.06, 0.17);
    this.jokerHead.add(smile);

    this.jokerGroup.add(this.jokerHead);

    // 3. Left & Right Legs
    const legGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.48, 12);

    this.jokerLeftLeg = new THREE.Group();
    this.jokerLeftLeg.position.set(-0.11, 0.02, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, matSuit);
    leftLegMesh.position.y = -0.24;
    this.jokerLeftLeg.add(leftLegMesh);

    const shoeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.18);
    const leftShoe = new THREE.Mesh(shoeGeo, matGoldGlow);
    leftShoe.position.set(0, -0.48, 0.03);
    this.jokerLeftLeg.add(leftShoe);
    this.jokerGroup.add(this.jokerLeftLeg);

    this.jokerRightLeg = new THREE.Group();
    this.jokerRightLeg.position.set(0.11, 0.02, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, matSuit);
    rightLegMesh.position.y = -0.24;
    this.jokerRightLeg.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(shoeGeo, matGoldGlow);
    rightShoe.position.set(0, -0.48, 0.03);
    this.jokerRightLeg.add(rightShoe);
    this.jokerGroup.add(this.jokerRightLeg);

    // 4. Left & Right Arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 12);
    const handGeo = new THREE.SphereGeometry(0.06, 12, 12);

    this.jokerLeftArm = new THREE.Group();
    this.jokerLeftArm.position.set(-0.28, 0.52, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, matSuit);
    leftArmMesh.position.y = -0.22;
    this.jokerLeftArm.add(leftArmMesh);
    const leftHand = new THREE.Mesh(handGeo, matCyanGlow);
    leftHand.position.y = -0.44;
    this.jokerLeftArm.add(leftHand);
    this.jokerGroup.add(this.jokerLeftArm);

    this.jokerRightArm = new THREE.Group();
    this.jokerRightArm.position.set(0.28, 0.52, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, matSuit);
    rightArmMesh.position.y = -0.22;
    this.jokerRightArm.add(rightArmMesh);
    const rightHand = new THREE.Mesh(handGeo, matCyanGlow);
    rightHand.position.y = -0.44;
    this.jokerRightArm.add(rightHand);
    this.jokerGroup.add(this.jokerRightArm);

    // 5. 3D Travel Audio Bag
    this.jokerBag = new THREE.Group();
    this.jokerBag.position.set(0.35, 0.15, 0.05);

    const bagBodyGeo = new THREE.BoxGeometry(0.38, 0.28, 0.22);
    const bagBody = new THREE.Mesh(bagBodyGeo, matSuit);
    this.jokerBag.add(bagBody);

    // Bag Flap / Lid
    const flapGeo = new THREE.BoxGeometry(0.38, 0.05, 0.22);
    this.bagFlap = new THREE.Mesh(flapGeo, matCyanGlow);
    this.bagFlap.position.set(0, 0.14, 0);
    this.jokerBag.add(this.bagFlap);

    // Handle
    const handleGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 16, Math.PI);
    const handle = new THREE.Mesh(handleGeo, matGoldGlow);
    handle.rotation.z = Math.PI;
    handle.position.set(0, 0.16, 0);
    this.jokerBag.add(handle);

    this.jokerGroup.add(this.jokerBag);
    this.scene.add(this.jokerGroup);
  }

  setupBurstEffects() {
    this.burstParticleGroup = new THREE.Group();

    // 1. Upward shooting spark particles
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = -0.3;
      positions[i * 3 + 2] = 0.6 + (Math.random() - 0.5) * 0.3;

      const isYellow = Math.random() > 0.4;
      colors[i * 3] = isYellow ? 1.0 : 0.18;
      colors[i * 3 + 1] = isYellow ? 0.9 : 0.85;
      colors[i * 3 + 2] = isYellow ? 0.2 : 0.75;

      this.burstParticles.push({
        vx: (Math.random() - 0.5) * 0.06,
        vy: 0.04 + Math.random() * 0.07,
        vz: (Math.random() - 0.5) * 0.06,
        life: Math.random() * 0.8,
        maxLife: 0.8 + Math.random() * 0.4
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.sparkPoints = new THREE.Points(geo, mat);
    this.burstParticleGroup.add(this.sparkPoints);

    // 2. Floating 3D Music Note Sprites
    const noteChars = ['♪', '♫', '♬', '♩'];
    noteChars.forEach((char, idx) => {
      const noteCanvas = document.createElement('canvas');
      noteCanvas.width = 128;
      noteCanvas.height = 128;
      const ctx = noteCanvas.getContext('2d');
      ctx.fillStyle = idx % 2 === 0 ? '#fde047' : '#5eead4';
      ctx.font = 'bold 88px sans-serif';
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
      sprite.scale.set(0.35, 0.35, 0.35);
      sprite.position.set((idx - 1.5) * 0.35, 0.2, 0.5);
      sprite.userData = {
        vx: (idx - 1.5) * 0.012,
        vy: 0.025 + Math.random() * 0.02,
        vz: (Math.random() - 0.5) * 0.01,
        rotSpeed: (Math.random() - 0.5) * 2
      };
      this.musicNotes.push(sprite);
      this.burstParticleGroup.add(sprite);
    });

    this.scene.add(this.burstParticleGroup);
  }

  /**
   * 3D MUSIC NOTE EMBLEM & 3D EXTRUDED TITLE
   * Beautiful glowing dual beamed musical note (♫) with 3D depth and metallic highlights
   */
  setup3DMusicNoteLogo() {
    this.logoGroup = new THREE.Group();
    this.logoGroup.position.set(0, -0.6, 0.6); // Starts down inside bag
    this.logoGroup.scale.set(0.001, 0.001, 0.001); // Hidden initially

    // 1. Radiant 3D Music Note Emblem (♫ Dual Beamed Musical Note)
    this.musicNoteGroup = new THREE.Group();

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

    // Note 1 Head (Left Note Head - Tilted Oval Sphere)
    const headGeo = new THREE.SphereGeometry(0.16, 22, 22);
    const headLeft = new THREE.Mesh(headGeo, matGold);
    headLeft.scale.set(1.15, 0.82, 0.75);
    headLeft.rotation.z = 0.35;
    headLeft.position.set(-0.32, -0.16, 0);
    this.musicNoteGroup.add(headLeft);

    // Note 2 Head (Right Note Head - Tilted Oval Sphere)
    const headRight = new THREE.Mesh(headGeo, matGold);
    headRight.scale.set(1.15, 0.82, 0.75);
    headRight.rotation.z = 0.35;
    headRight.position.set(0.24, -0.06, 0);
    this.musicNoteGroup.add(headRight);

    // Left Stem (Vertical Metallic Cyan Column)
    const stemGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.68, 16);
    const stemLeft = new THREE.Mesh(stemGeo, matCyan);
    stemLeft.position.set(-0.20, 0.18, 0);
    this.musicNoteGroup.add(stemLeft);

    // Right Stem (Vertical Metallic Cyan Column)
    const stemRight = new THREE.Mesh(stemGeo, matCyan);
    stemRight.position.set(0.36, 0.28, 0);
    this.musicNoteGroup.add(stemRight);

    // Top Primary Connecting Crossbeam
    const beamGeo1 = new THREE.BoxGeometry(0.64, 0.09, 0.07);
    const beam1 = new THREE.Mesh(beamGeo1, matGold);
    beam1.rotation.z = 0.17;
    beam1.position.set(0.08, 0.48, 0);
    this.musicNoteGroup.add(beam1);

    // Secondary Connecting Crossbeam
    const beamGeo2 = new THREE.BoxGeometry(0.64, 0.06, 0.06);
    const beam2 = new THREE.Mesh(beamGeo2, matCyan);
    beam2.rotation.z = 0.17;
    beam2.position.set(0.08, 0.36, 0);
    this.musicNoteGroup.add(beam2);

    // Glowing Spatial Audio Core Behind Note
    const coreGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0.08, 0.16, -0.04);
    this.musicNoteGroup.add(core);

    this.musicNoteGroup.position.set(0, 0.62, 0);
    this.logoGroup.add(this.musicNoteGroup);

    // 2. High-Res 3D Title "8D AUDIO" & "CONVERTER"
    // Title 1: "8D AUDIO"
    const canvas1 = document.createElement('canvas');
    canvas1.width = 512;
    canvas1.height = 140;
    const ctx1 = canvas1.getContext('2d');
    ctx1.fillStyle = '#ffffff';
    ctx1.font = '900 86px "Outfit", sans-serif';
    ctx1.textAlign = 'center';
    ctx1.textBaseline = 'middle';
    ctx1.shadowColor = '#2dd4bf';
    ctx1.shadowBlur = 24;
    ctx1.fillText('8D AUDIO', 256, 70);

    const tex1 = new THREE.CanvasTexture(canvas1);
    const plane1Mat = new THREE.MeshBasicMaterial({
      map: tex1,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.text8DAudio = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.46), plane1Mat);
    this.text8DAudio.position.set(0, -0.02, 0.05);
    this.logoGroup.add(this.text8DAudio);

    // Title 2: "CONVERTER"
    const canvas2 = document.createElement('canvas');
    canvas2.width = 512;
    canvas2.height = 90;
    const ctx2 = canvas2.getContext('2d');
    ctx2.fillStyle = '#fde047';
    ctx2.font = '800 52px "Outfit", sans-serif';
    ctx2.letterSpacing = '8px';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.shadowColor = '#eab308';
    ctx2.shadowBlur = 18;
    ctx2.fillText('CONVERTER', 256, 45);

    const tex2 = new THREE.CanvasTexture(canvas2);
    const plane2Mat = new THREE.MeshBasicMaterial({
      map: tex2,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.textConverter = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.24), plane2Mat);
    this.textConverter.position.set(0, -0.32, 0.05);
    this.logoGroup.add(this.textConverter);

    // 3. Glowing Sound Wave Energy Rings around Logo
    [0.78, 1.12].forEach((r, i) => {
      const ringGeo = new THREE.TorusGeometry(r, 0.014, 8, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x2dd4bf : 0xfacc15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, 0.14, -0.05);
      this.haloRings.push(ringMesh);
      this.logoGroup.add(ringMesh);
    });

    this.scene.add(this.logoGroup);
  }

  /**
   * Smooth, Balanced Cinematic Timeline (~5.8s Total Duration)
   */
  updateCinematicTimeline(dt) {
    this.elapsedTime += dt;
    const t = this.elapsedTime;

    // SCENE 1 & 2: Smooth Natural Joker Walk In (0.0s - 1.9s)
    if (t < 1.90) {
      const walkProg = t / 1.90;
      const easedWalk = this.easeOutCubic(walkProg);

      const currentX = -4.2 + easedWalk * 4.2;
      this.jokerGroup.position.x = currentX;

      const walkCycle = t * 10.5; // Natural smooth stride rhythm
      this.jokerLeftLeg.rotation.x = Math.sin(walkCycle) * 0.65;
      this.jokerRightLeg.rotation.x = -Math.sin(walkCycle) * 0.65;

      this.jokerLeftArm.rotation.x = -Math.sin(walkCycle) * 0.55;
      this.jokerRightArm.rotation.x = Math.sin(walkCycle) * 0.55;

      this.jokerBag.rotation.x = Math.sin(walkCycle - 0.5) * 0.35;
      this.jokerBag.rotation.z = Math.cos(walkCycle) * 0.08;

      this.jokerGroup.position.y = -0.1 + Math.abs(Math.sin(walkCycle)) * 0.06;
      this.jokerHead.rotation.y = Math.sin(walkCycle * 0.5) * 0.12;

      this.camera.position.x = currentX * 0.3;
      this.camera.position.y = 0.55;
      this.camera.position.z = 4.8 - walkProg * 0.5;
      this.camera.lookAt(currentX * 0.5, 0.1, 0);
    }

    // SCENE 3: Joker Stops & Gracefully Kneels (1.90s - 2.80s)
    else if (t >= 1.90 && t < 2.80) {
      const kneelProg = (t - 1.90) / 0.90;
      const easedKneel = this.easeInOutQuad(kneelProg);

      this.jokerGroup.position.x = 0;
      this.jokerLeftLeg.rotation.x = -easedKneel * 0.85;
      this.jokerRightLeg.rotation.x = -easedKneel * 0.85;
      this.jokerLeftArm.rotation.x = easedKneel * 0.5;
      this.jokerRightArm.rotation.x = easedKneel * 0.5;

      this.jokerGroup.position.y = -0.1 - easedKneel * 0.45;
      this.jokerHead.rotation.x = easedKneel * 0.35;

      this.jokerBag.position.x = 0.35 - easedKneel * 0.35;
      this.jokerBag.position.y = 0.15 - easedKneel * 0.35;
      this.jokerBag.position.z = 0.05 + easedKneel * 0.55;
      this.jokerBag.rotation.set(0, 0, 0);

      this.camera.position.x = 0;
      this.camera.position.y = 0.45 - easedKneel * 0.2;
      this.camera.position.z = 4.3 - easedKneel * 0.8;
      this.camera.lookAt(0, -0.2, 0.4);
    }

    // SCENE 4: Volumetric Light Eruption & Bag Unzips (2.80s - 3.40s)
    else if (t >= 2.80 && t < 3.40) {
      const burstProg = (t - 2.80) / 0.60;
      const burstIntensity = Math.min(1.0, burstProg * 1.5);

      this.jokerLeftArm.rotation.z = -burstIntensity * 0.5;
      this.jokerRightArm.rotation.z = burstIntensity * 0.5;
      this.jokerHead.rotation.x = 0.15;

      this.bagFlap.rotation.x = -burstIntensity * Math.PI * 0.7;
      this.bagBurstLight.intensity = burstIntensity * 24.0;
      this.spotLight.intensity = 5.0 + burstIntensity * 4.0;

      this.sparkPoints.material.opacity = Math.min(1.0, burstIntensity * 1.5);
      const pos = this.sparkPoints.geometry.attributes.position.array;
      for (let i = 0; i < this.burstParticles.length; i++) {
        const bp = this.burstParticles[i];
        pos[i * 3] += bp.vx;
        pos[i * 3 + 1] += bp.vy;
        pos[i * 3 + 2] += bp.vz;
      }
      this.sparkPoints.geometry.attributes.position.needsUpdate = true;

      this.musicNotes.forEach((note) => {
        note.material.opacity = Math.min(1.0, burstIntensity * 1.8);
        note.position.y += note.userData.vy;
        note.position.x += note.userData.vx;
      });

      this.camera.position.x = (Math.random() - 0.5) * 0.015 * burstIntensity;
      this.camera.position.y = 0.25;
      this.camera.lookAt(0, -0.1, 0.4);
    }

    // SCENE 5 & 6: INSTANT SNAP DISAPPEARANCE OF JOKER & 3D MUSIC LOGO EMERGENCE (3.40s - 4.60s)
    else if (t >= 3.40 && t < 4.60) {
      // INSTANT SNAP: Joker & Bag disappear immediately when text & logo emerge
      if (this.jokerGroup.visible) {
        this.jokerGroup.visible = false;
        this.bagBurstLight.intensity = 0;
      }

      const riseProg = (t - 3.40) / 1.20;
      const easedRise = this.easeOutBack(riseProg);

      const currentScale = Math.min(1.0, 0.05 + easedRise * 0.95);
      this.logoGroup.scale.set(currentScale, currentScale, currentScale);
      this.logoGroup.position.y = -0.4 + easedRise * 0.98;
      this.logoGroup.position.z = 0.2;
      this.logoGroup.rotation.y = (1 - Math.min(1.0, riseProg)) * 0.35;

      this.musicNoteGroup.rotation.y = Math.sin(t * 2.5) * 0.18;
      this.titleLight.intensity = riseProg * 8.0;

      this.sparkPoints.material.opacity = Math.max(0, 1.0 - riseProg);
      this.musicNotes.forEach((n) => (n.material.opacity = Math.max(0, 1.0 - riseProg)));

      this.camera.position.x = 0;
      this.camera.position.y = 0.55;
      this.camera.position.z = 3.6 + riseProg * 0.9;
      this.camera.lookAt(0, 0.5, 0);
    }

    // SCENE 7: Majestic 3D Music Logo Showcase & Spatial Halo (4.60s - 5.80s)
    else {
      if (this.jokerGroup.visible) {
        this.jokerGroup.visible = false;
      }

      this.logoGroup.scale.set(1, 1, 1);
      this.logoGroup.position.y = 0.58 + Math.sin(t * 2.2) * 0.035;
      this.musicNoteGroup.rotation.y = Math.sin(t * 1.5) * 0.15;

      this.haloRings.forEach((ring, idx) => {
        ring.rotation.z += (idx === 0 ? 0.016 : -0.012);
        const s = 1.0 + Math.sin(t * 3.5 + idx) * 0.08;
        ring.scale.set(s, s, s);
      });

      this.camera.position.x = Math.sin(t * 0.8) * 0.06;
      this.camera.position.y = 0.52 + Math.cos(t * 0.8) * 0.03;
      this.camera.position.z = 4.5;
      this.camera.lookAt(0, 0.52, 0);

      // Smooth auto-transition into app after 5.8s
      if (t >= 5.8 && !this.isSkipped) {
        this.finishSplash();
      }
    }
  }

  animate() {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // 1. Update Sound Rings Pulse
    this.soundRings.forEach((ring, idx) => {
      ring.rotation.z += 0.008 * (idx % 2 === 0 ? 1 : -1);
      const pulse = 1.0 + Math.sin(this.elapsedTime * 3.0 + idx * 0.8) * 0.05;
      ring.scale.set(pulse, pulse, pulse);
    });

    // 2. Update Dust Particles
    if (this.fogParticles) {
      this.fogParticles.rotation.y += 0.002;
    }

    // 3. Update Cinematic Timeline
    this.updateCinematicTimeline(dt);

    // 4. Render 3D Scene
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
