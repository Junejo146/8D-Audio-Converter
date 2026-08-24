import { Audio8DEngine } from './audioEngine.js';
import QRCode from 'qrcode';

// Initialize 8D Audio Engine
const engine = new Audio8DEngine();

// Track Playback States
let currentPlayingSlot = null; // null | 'normal' | '8d'
let is8DLayerUnlocked = false;
let convertedAudioBlob = null;
let activeLibraryFilter = 'all';
let librarySearchQuery = '';
let isProcessingAborted = false;

// App State
let currentTrack = {
  id: 'demo-1',
  title: 'Midnight City.mp3',
  durationText: '4:02',
  dateText: 'Today',
  is8D: true,
  isFavorite: false,
  isBuiltInDemo: true
};

let tracks = [
  {
    id: 'demo-1',
    title: 'Midnight City.mp3',
    durationText: '4:02',
    dateText: 'Today',
    is8D: true,
    isFavorite: false,
    isBuiltInDemo: true
  },
  {
    id: 'demo-2',
    title: 'Starlight_Vocal_Mix.mp3',
    durationText: '3:45',
    dateText: 'Yesterday',
    is8D: true,
    isFavorite: true,
    isBuiltInDemo: true
  },
  {
    id: 'demo-3',
    title: 'Neon_Sunset_Synth.wav',
    durationText: '0:24',
    dateText: 'Live Demo',
    is8D: true,
    isFavorite: false,
    isBuiltInDemo: true
  }
];

// Waveform data cache
let waveformBars = [];
function generateWaveformData() {
  waveformBars = [];
  const count = 48;
  for (let i = 0; i < count; i++) {
    const env = Math.sin((i / count) * Math.PI);
    const rand = 0.35 + Math.random() * 0.65;
    waveformBars.push(Math.max(0.15, env * rand));
  }
}
generateWaveformData();

/**
 * Switch Active Screen Tab
 */
function openScreen(screenId) {
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabPanes.forEach(pane => pane.classList.remove('active'));
  
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }

  // Update bottom nav active state
  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    const tab = btn.getAttribute('data-tab');
    btn.classList.toggle('active', tab === screenId);
  });

  // Hide mini player on sub-screens
  const miniPlayer = document.getElementById('mini-player');
  if (miniPlayer) {
    const isSubScreen = screenId.startsWith('screen-');
    if (isSubScreen) {
      miniPlayer.style.display = 'none';
    } else if (engine.isPlaying) {
      miniPlayer.style.display = 'flex';
    }
  }

  updateNowPlayingUI();
}

/**
 * Update UI Text & Metadata
 */
function updateNowPlayingUI() {
  if (!currentTrack) return;
  const durStr = currentTrack.durationText || formatTime(engine.duration || 24);

  const miniTitle = document.getElementById('mini-title');
  const editorSongTitle = document.getElementById('editor-song-title');
  const previewSongTitle = document.getElementById('preview-song-title');
  const procSongTitle = document.getElementById('proc-song-title');
  const resultSongTitle = document.getElementById('result-song-title');

  if (miniTitle) miniTitle.textContent = currentTrack.title;
  if (editorSongTitle) editorSongTitle.textContent = currentTrack.title;
  if (previewSongTitle) previewSongTitle.textContent = currentTrack.title;
  if (procSongTitle) procSongTitle.textContent = currentTrack.title;
  if (resultSongTitle) resultSongTitle.textContent = currentTrack.title.replace(/\.[^/.]+$/, "") + "_8D.wav";

  const editorDurationText = document.getElementById('editor-duration-text');
  const normalTimeTotal = document.getElementById('normal-time-total');
  const spatialTimeTotal = document.getElementById('spatial-time-total');
  const prevTimeTotal = document.getElementById('prev-time-total');
  const procDurationText = document.getElementById('proc-duration-text');
  const resultMetaDuration = document.getElementById('result-meta-duration');

  if (editorDurationText) editorDurationText.textContent = durStr;
  if (normalTimeTotal) normalTimeTotal.textContent = durStr;
  if (spatialTimeTotal) spatialTimeTotal.textContent = durStr;
  if (prevTimeTotal) prevTimeTotal.textContent = durStr;
  if (procDurationText) procDurationText.textContent = durStr;
  if (resultMetaDuration) resultMetaDuration.textContent = durStr;
}

/**
 * Progressive Reveal Controls for 8D Layer
 */
function unlock8DLayer() {
  if (is8DLayerUnlocked) return;
  is8DLayerUnlocked = true;

  const slot8D = document.getElementById('slot-8d-audio');
  const promptCreate = document.getElementById('prompt-create-8d');
  const bannerMode = document.getElementById('banner-active-mode');

  if (slot8D) {
    slot8D.style.display = 'flex';
    slot8D.classList.add('unlocked');
  }
  if (promptCreate) {
    promptCreate.style.display = 'none';
  }
  if (bannerMode) {
    bannerMode.textContent = "8D Layer Ready";
    bannerMode.style.color = "#00f084";
    bannerMode.style.borderColor = "rgba(0, 240, 132, 0.4)";
  }
}

function resetEditorToNormalOnly() {
  is8DLayerUnlocked = false;
  currentPlayingSlot = null;

  const slot8D = document.getElementById('slot-8d-audio');
  const promptCreate = document.getElementById('prompt-create-8d');
  const slotNormal = document.getElementById('slot-normal-audio');
  const bannerMode = document.getElementById('banner-active-mode');

  if (slot8D) {
    slot8D.style.display = 'none';
    slot8D.classList.remove('unlocked', 'active-slot');
  }
  if (promptCreate) {
    promptCreate.style.display = 'flex';
  }
  if (slotNormal) {
    slotNormal.classList.add('active-slot');
  }
  if (bannerMode) {
    bannerMode.textContent = "Normal Stereo";
    bannerMode.style.color = "#93c5fd";
    bannerMode.style.borderColor = "rgba(59, 130, 246, 0.4)";
  }

  // Ensure NO autoplay!
  engine.set8DEnabled(false);
  engine.pause();
  updatePlaybackState(false);

  const normalTimeCur = document.getElementById('normal-time-current');
  const spatialTimeCur = document.getElementById('spatial-time-current');
  if (normalTimeCur) normalTimeCur.textContent = '0:00';
  if (spatialTimeCur) spatialTimeCur.textContent = '0:00';
}

/**
 * Update Play / Pause Playback UI State
 */
function updatePlaybackState(isPlaying) {
  updateNowPlayingUI();
  renderTracksList();

  const playSvg = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3"></polygon>
    </svg>`;
  const pauseSvg = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1"></rect>
      <rect x="14" y="4" width="4" height="16" rx="1"></rect>
    </svg>`;

  const btnPlayNormal = document.getElementById('btn-play-normal-slot');
  const btnPlaySpatial = document.getElementById('btn-play-spatial-slot');
  const slotNormal = document.getElementById('slot-normal-audio');
  const slotSpatial = document.getElementById('slot-8d-audio');
  const bannerMode = document.getElementById('banner-active-mode');

  if (isPlaying && currentPlayingSlot === 'normal') {
    if (btnPlayNormal) btnPlayNormal.innerHTML = pauseSvg;
    if (btnPlaySpatial) btnPlaySpatial.innerHTML = playSvg;
    if (slotNormal) slotNormal.classList.add('active-slot');
    if (slotSpatial) slotSpatial.classList.remove('active-slot');
    if (bannerMode) {
      bannerMode.textContent = "Playing Normal Stereo";
      bannerMode.style.color = "#93c5fd";
      bannerMode.style.borderColor = "rgba(59, 130, 246, 0.4)";
    }
  } else if (isPlaying && currentPlayingSlot === '8d') {
    if (btnPlaySpatial) btnPlaySpatial.innerHTML = pauseSvg;
    if (btnPlayNormal) btnPlayNormal.innerHTML = playSvg;
    if (slotSpatial) slotSpatial.classList.add('active-slot');
    if (slotNormal) slotNormal.classList.remove('active-slot');
    if (bannerMode) {
      bannerMode.textContent = "Playing 8D Spatial";
      bannerMode.style.color = "#00f084";
      bannerMode.style.borderColor = "rgba(0, 240, 132, 0.4)";
    }
  } else {
    // Both paused
    if (btnPlayNormal) btnPlayNormal.innerHTML = playSvg;
    if (btnPlaySpatial) btnPlaySpatial.innerHTML = playSvg;
    if (slotNormal) slotNormal.classList.add('active-slot');
    if (slotSpatial) slotSpatial.classList.remove('active-slot');
  }

  // Result & Mini Player
  const btnResultPlay = document.getElementById('btn-result-play');
  if (btnResultPlay) btnResultPlay.innerHTML = isPlaying ? pauseSvg : playSvg;

  const miniBtnPlay = document.getElementById('mini-btn-play');
  if (miniBtnPlay) {
    miniBtnPlay.innerHTML = isPlaying ? pauseSvg : playSvg;
  }

  const miniPlayer = document.getElementById('mini-player');
  if (miniPlayer) {
    const activeSubScreen = document.querySelector('.tab-pane.active[id^="screen-"]');
    if (activeSubScreen) {
      miniPlayer.style.display = 'none';
    } else {
      miniPlayer.style.display = isPlaying ? 'flex' : 'none';
    }
  }

  const miniVinyl = document.getElementById('mini-vinyl');
  if (miniVinyl) {
    if (isPlaying) miniVinyl.classList.add('spinning');
    else miniVinyl.classList.remove('spinning');
  }

  const previewAlbumDisc = document.getElementById('preview-album-disc');
  if (previewAlbumDisc) {
    if (isPlaying) previewAlbumDisc.classList.add('spinning');
    else previewAlbumDisc.classList.remove('spinning');
  }

  const resultDisc = document.getElementById('result-disc');
  if (resultDisc) {
    if (isPlaying) resultDisc.classList.add('spinning');
    else resultDisc.classList.remove('spinning');
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/**
 * Render Lists (Home, My Audio, Favorites)
 */
function renderTracksList() {
  // 1. Home Recent Tracks
  const recentTracksList = document.getElementById('recent-tracks-list');
  if (recentTracksList) {
    recentTracksList.innerHTML = tracks.map(track => createTrackCardHtml(track)).join('');
  }

  // 2. My Audio Library
  const libraryTracksList = document.getElementById('library-tracks-list');
  if (libraryTracksList) {
    let filtered = tracks;
    if (activeLibraryFilter === '8d') {
      filtered = filtered.filter(t => t.is8D);
    } else if (activeLibraryFilter === 'original') {
      filtered = filtered.filter(t => !t.is8D);
    }

    if (librarySearchQuery.trim()) {
      const q = librarySearchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q));
    }

    const countAll = document.getElementById('count-all');
    const count8d = document.getElementById('count-8d');
    const countOrig = document.getElementById('count-orig');
    if (countAll) countAll.textContent = tracks.length;
    if (count8d) count8d.textContent = tracks.filter(t => t.is8D).length;
    if (countOrig) countOrig.textContent = tracks.filter(t => !t.is8D).length;

    if (filtered.length > 0) {
      libraryTracksList.innerHTML = filtered.map(track => createLibraryCardHtml(track)).join('');
    } else {
      libraryTracksList.innerHTML = `
        <div class="empty-state" style="padding: 30px 10px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <h4>No Audio Found</h4>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 4px;">Try changing your search or filter tab.</p>
        </div>`;
    }
  }

  // 3. Favorites List
  const favoritesTracksList = document.getElementById('favorites-tracks-list');
  const favEmptyState = document.getElementById('fav-empty-state');
  const favTotalCount = document.getElementById('fav-total-count');
  const favFeaturedTitle = document.getElementById('fav-featured-title');
  const favFeaturedMeta = document.getElementById('fav-featured-meta');
  const favFeaturedDisc = document.getElementById('fav-featured-disc');
  const btnFavFeaturedPlay = document.getElementById('btn-fav-featured-play');

  const favs = tracks.filter(t => t.isFavorite);
  if (favTotalCount) favTotalCount.textContent = `${favs.length} saved`;

  const featuredFav = favs[0] || tracks[1] || tracks[0];
  if (featuredFav) {
    if (favFeaturedTitle) favFeaturedTitle.textContent = featuredFav.title;
    if (favFeaturedMeta) favFeaturedMeta.textContent = `${featuredFav.durationText} • 360° Binaural Spatial`;
    
    const isFeaturedPlaying = currentTrack && currentTrack.id === featuredFav.id && engine.isPlaying;
    if (favFeaturedDisc) {
      if (isFeaturedPlaying) favFeaturedDisc.classList.add('spinning');
      else favFeaturedDisc.classList.remove('spinning');
    }
    if (btnFavFeaturedPlay) {
      btnFavFeaturedPlay.innerHTML = isFeaturedPlaying ? `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>` : `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6 3 20 12 6 21 6 3"></polygon>
        </svg>`;
      btnFavFeaturedPlay.onclick = (e) => {
        e.stopPropagation();
        handleTrackPlayClick(featuredFav.id);
      };
    }
  }

  if (favoritesTracksList && favEmptyState) {
    if (favs.length > 0) {
      favEmptyState.style.display = 'none';
      favoritesTracksList.style.display = 'flex';
      favoritesTracksList.innerHTML = favs.map(track => createLibraryCardHtml(track)).join('');
    } else {
      favEmptyState.style.display = 'flex';
      favoritesTracksList.style.display = 'none';
    }
  }

  attachCardEvents();
}

function createTrackCardHtml(track) {
  const isCurrent = currentTrack && currentTrack.id === track.id;
  const isPlaying = isCurrent && engine.isPlaying;

  return `
    <div class="track-card ${isPlaying ? 'active-playing' : ''}" data-track-id="${track.id}">
      <div class="vinyl-disk-wrapper">
        <div class="vinyl-disk ${isPlaying ? 'spinning' : ''}">
          <div class="vinyl-center-dot"></div>
        </div>
      </div>
      <div class="track-meta" data-action="open-editor">
        <div class="track-title">
          ${escapeHtml(track.title)}
          ${isPlaying ? `
            <span class="mini-wave-bars">
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
            </span>
          ` : ''}
        </div>
        <div class="track-sub-row">
          <span>${track.durationText} • ${track.dateText}</span>
          ${track.is8D ? '<span class="badge-8d">8D</span>' : ''}
        </div>
      </div>
      <button class="track-play-btn ${isPlaying ? 'playing' : ''}" data-action="play-pause" data-track-id="${track.id}" aria-label="Play">
        ${isPlaying ? `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        ` : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
        `}
      </button>
    </div>
  `;
}

function createLibraryCardHtml(track) {
  const isCurrent = currentTrack && currentTrack.id === track.id;
  const isPlaying = isCurrent && engine.isPlaying;

  return `
    <div class="my-audio-card ${isPlaying ? 'playing' : ''}" data-track-id="${track.id}">
      <div class="card-art-box">
        <div class="card-disc ${isPlaying ? 'spinning' : ''}">
          <div class="card-disc-dot"></div>
        </div>
      </div>
      <div class="card-info-box" data-action="open-editor">
        <div class="card-song-title">${escapeHtml(track.title)}</div>
        <div class="card-sub-row">
          <span>${track.durationText} • ${track.dateText}</span>
          ${track.is8D ? '<span class="badge-8d">8D Converted</span>' : '<span class="meta-chip">Original</span>'}
          ${isPlaying ? `
            <span class="card-mini-waveform">
              <span class="card-wave-bar"></span>
              <span class="card-wave-bar"></span>
              <span class="card-wave-bar"></span>
              <span class="card-wave-bar"></span>
            </span>
          ` : ''}
        </div>
      </div>
      <div class="card-actions-box">
        <button class="track-play-btn ${isPlaying ? 'playing' : ''}" data-action="play-pause" data-track-id="${track.id}" aria-label="Play">
          ${isPlaying ? `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"></rect>
              <rect x="14" y="4" width="4" height="16" rx="1"></rect>
            </svg>
          ` : `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
          `}
        </button>
        <button class="btn-card-more" data-action="more-options" data-track-id="${track.id}" aria-label="Options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"></circle>
            <circle cx="12" cy="12" r="2"></circle>
            <circle cx="12" cy="19" r="2"></circle>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function attachCardEvents() {
  document.querySelectorAll('.track-card, .my-audio-card').forEach(card => {
    const trackId = card.getAttribute('data-track-id');
    const playBtn = card.querySelector('[data-action="play-pause"]');
    const moreBtn = card.querySelector('[data-action="more-options"]');

    if (playBtn) {
      playBtn.onclick = (e) => {
        e.stopPropagation();
        handleTrackPlayClick(trackId);
      };
    }

    if (moreBtn) {
      moreBtn.onclick = (e) => {
        e.stopPropagation();
        selectTrack(trackId);
        openScreen('screen-audio-preview');
      };
    }

    card.onclick = (e) => {
      if (e.target.closest('[data-action="play-pause"]') || e.target.closest('[data-action="more-options"]')) {
        return;
      }
      selectTrack(trackId);
      resetEditorToNormalOnly();
      openScreen('screen-audio-editor');
    };
  });
}

function selectTrack(trackId) {
  const track = tracks.find(t => t.id === trackId);
  if (!track) return;
  currentTrack = track;
  if (track.isBuiltInDemo && !track.customBuffer) {
    engine.createDemoTrackBuffer();
  } else if (track.customBuffer) {
    engine.audioBuffer = track.customBuffer;
    engine.duration = track.customBuffer.duration;
  }
  updateNowPlayingUI();
}

async function handleTrackPlayClick(trackId) {
  const track = tracks.find(t => t.id === trackId);
  if (!track) return;

  if (currentTrack && currentTrack.id === trackId && engine.isPlaying) {
    engine.pause();
    currentPlayingSlot = null;
    updatePlaybackState(false);
  } else {
    selectTrack(trackId);
    currentPlayingSlot = '8d';
    engine.set8DEnabled(true);
    engine.play();
    updatePlaybackState(true);
  }
}

/**
 * 8D Presets Configuration
 */
const PRESETS_CONFIG = {
  classic: { speed: 8.0, depth: 3.0, reverb: 50, bass: true },
  smooth: { speed: 14.0, depth: 2.2, reverb: 30, bass: false },
  deep: { speed: 10.0, depth: 4.5, reverb: 75, bass: true },
  fast: { speed: 4.0, depth: 3.2, reverb: 40, bass: true }
};

function applyPreset(presetKey) {
  const p = PRESETS_CONFIG[presetKey];
  if (!p) return;

  // Unlock the 8D Layer when user chooses any preset
  unlock8DLayer();

  engine.setOrbitSpeed(p.speed);
  engine.setDepth(p.depth);
  engine.updateReverbMix(p.reverb / 100);
  engine.setBassBoost(p.bass);

  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed = document.getElementById('val-speed');
  const sliderDepth = document.getElementById('slider-depth');
  const valDepth = document.getElementById('val-depth');
  const switchEditorReverb = document.getElementById('switch-editor-reverb');
  const switchEditorBass = document.getElementById('switch-editor-bass');

  if (sliderSpeed) sliderSpeed.value = p.speed;
  if (valSpeed) valSpeed.textContent = `${p.speed.toFixed(1)}s`;
  if (sliderDepth) sliderDepth.value = p.depth;
  if (valDepth) valDepth.textContent = `${p.depth.toFixed(1)}m`;
  if (switchEditorReverb) switchEditorReverb.checked = p.reverb > 0;
  if (switchEditorBass) switchEditorBass.checked = p.bass;
}

/**
 * Setup Independent Waveform Visualizers (Single Active Scrubbing)
 */
function setupWaveformCanvases() {
  const normalCanvas = document.getElementById('normal-waveform-canvas');
  const spatialCanvas = document.getElementById('spatial-waveform-canvas');
  const previewCanvas = document.getElementById('preview-waveform-canvas');
  const resultCanvas = document.getElementById('result-waveform-canvas');

  function renderWave(canvas, progress, theme, isActive) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const numBars = waveformBars.length;
    const barWidth = 3.2;
    const gap = (width - numBars * barWidth) / (numBars - 1);

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + gap);
      const val = waveformBars[i];
      const barHeight = val * (height - 8);
      const y = (height - barHeight) / 2;
      const isPlayed = isActive && ((x / width) <= progress);

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2]);

      if (isPlayed) {
        if (theme === 'normal') {
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#93c5fd');
          grad.addColorStop(1, '#3b82f6');
          ctx.fillStyle = grad;
        } else {
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#00f084');
          grad.addColorStop(1, '#7c4dff');
          ctx.fillStyle = grad;
        }
      } else {
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)';
      }
      ctx.fill();
    }

    // Scrubber line only on active playing canvas
    if (isActive) {
      const scrubX = progress * width;
      ctx.beginPath();
      ctx.moveTo(scrubX, 2);
      ctx.lineTo(scrubX, height - 2);
      ctx.strokeStyle = theme === 'normal' ? '#60a5fa' : '#00f084';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  function drawAll() {
    const progress = engine.duration > 0 ? (engine.getCurrentTime() / engine.duration) : 0;
    const isPlaying = engine.isPlaying;

    // 1. Normal Canvas (ONLY animates when normal slot is explicitly playing)
    const isNormalActive = isPlaying && (currentPlayingSlot === 'normal');
    renderWave(normalCanvas, isNormalActive ? progress : 0, 'normal', isNormalActive);

    // 2. 8D Spatial Canvas (ONLY animates when 8D slot is explicitly playing)
    const isSpatialActive = isPlaying && (currentPlayingSlot === '8d');
    renderWave(spatialCanvas, isSpatialActive ? progress : 0, 'spatial', isSpatialActive);

    // Preview & Result screens
    renderWave(previewCanvas, isPlaying ? progress : 0, 'spatial', isPlaying);
    renderWave(resultCanvas, isPlaying ? progress : 0, 'spatial', isPlaying);

    requestAnimationFrame(drawAll);
  }

  drawAll();

  // Waveform Click to Seek
  [normalCanvas, spatialCanvas, previewCanvas, resultCanvas].forEach(canvas => {
    if (!canvas) return;
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      if (engine.duration) {
        engine.seek(percent * engine.duration);
      }
    };
  });
}

/**
 * Background Waveform Canvas in Processing Screen
 */
function setupProcessingBgCanvas() {
  const procBgCanvas = document.getElementById('processing-bg-canvas');
  if (!procBgCanvas) return;
  const ctx = procBgCanvas.getContext('2d');
  
  function resize() {
    procBgCanvas.width = procBgCanvas.clientWidth || 360;
    procBgCanvas.height = procBgCanvas.clientHeight || 700;
  }
  resize();
  window.addEventListener('resize', resize);

  let phase = 0;
  function draw() {
    ctx.clearRect(0, 0, procBgCanvas.width, procBgCanvas.height);
    const w = procBgCanvas.width;
    const h = procBgCanvas.height;
    phase += 0.03;

    for (let wave = 0; wave < 3; wave++) {
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x < w; x += 6) {
        const y = (h / 2) + Math.sin(x * 0.02 + phase + wave * 1.5) * (20 + wave * 12);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = wave === 0 ? 'rgba(124, 77, 255, 0.35)' : wave === 1 ? 'rgba(61, 123, 253, 0.25)' : 'rgba(0, 240, 132, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }
  draw();
}

/**
 * 8D Conversion Pipeline Flow
 */
async function startConversionFlow() {
  isProcessingAborted = false;
  openScreen('screen-conversion-processing');

  const procSongTitle = document.getElementById('proc-song-title');
  const procDurationText = document.getElementById('proc-duration-text');
  const procMainStatus = document.getElementById('proc-main-status');

  if (currentTrack) {
    if (procSongTitle) procSongTitle.textContent = currentTrack.title;
    if (procDurationText) procDurationText.textContent = currentTrack.durationText || '4:02';
  }

  updateProcStep(1, 'completed');
  updateProcStep(2, 'active');
  updateProcStep(3, 'pending');
  setGaugePercent(78);

  try {
    const wavBlob = await engine.export8DToWav((percent) => {
      if (isProcessingAborted) return;
      setGaugePercent(percent);

      if (percent < 30) {
        updateProcStep(1, 'active');
        updateProcStep(2, 'pending');
        updateProcStep(3, 'pending');
        if (procMainStatus) procMainStatus.textContent = "Analyzing Audio Spectrogram...";
      } else if (percent < 85) {
        updateProcStep(1, 'completed');
        updateProcStep(2, 'active');
        updateProcStep(3, 'pending');
        if (procMainStatus) procMainStatus.textContent = "Applying 360° 8D Spatial Orbit...";
      } else {
        updateProcStep(1, 'completed');
        updateProcStep(2, 'completed');
        updateProcStep(3, 'active');
        if (procMainStatus) procMainStatus.textContent = "Rendering Lossless Output...";
      }
    });

    if (isProcessingAborted) return;

    setGaugePercent(100);
    updateProcStep(1, 'completed');
    updateProcStep(2, 'completed');
    updateProcStep(3, 'completed');
    if (procMainStatus) procMainStatus.textContent = "Conversion Complete! 🎉";

    convertedAudioBlob = wavBlob;

    setTimeout(() => {
      if (!isProcessingAborted) openScreen('screen-audio-result');
    }, 1200);

  } catch (err) {
    if (!isProcessingAborted) {
      alert("Conversion notice: " + err.message);
      openScreen('screen-audio-editor');
    }
  }
}

function setGaugePercent(pct) {
  const rounded = Math.round(pct);
  const procPercentNum = document.getElementById('proc-percent-num');
  const gaugeProgressCircle = document.getElementById('gauge-progress-circle');

  if (procPercentNum) procPercentNum.textContent = `${rounded}%`;
  
  if (gaugeProgressCircle) {
    const totalLength = 515.2;
    const offset = totalLength * (1 - (rounded / 100));
    gaugeProgressCircle.style.strokeDashoffset = offset;
  }
}

function updateProcStep(stepNum, status) {
  const el = stepNum === 1 ? document.getElementById('step-analyzing') : stepNum === 2 ? document.getElementById('step-applying') : document.getElementById('step-output');
  if (!el) return;

  el.className = `proc-step-row ${status}`;
  const tag = el.querySelector('.step-status-tag');
  if (tag) {
    if (status === 'completed') {
      tag.className = 'step-status-tag done';
      tag.textContent = 'Done';
    } else if (status === 'active') {
      tag.className = 'step-status-tag running';
      tag.textContent = 'Processing...';
    } else {
      tag.className = 'step-status-tag wait';
      tag.textContent = 'Pending';
    }
  }
}

function abortConversion() {
  isProcessingAborted = true;
  openScreen('screen-audio-editor');
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
  // Navigation Bar Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) openScreen(targetTab);
    };
  });

  // Home Screen: "Select Audio" -> Audio Selection Screen
  const btnSelectAudio = document.getElementById('btn-select-audio');
  if (btnSelectAudio) {
    btnSelectAudio.onclick = () => openScreen('screen-audio-select');
  }

  // Audio Selection Screen: Sources
  const cardDeviceFiles = document.getElementById('card-device-files');
  const cardMusicLibrary = document.getElementById('card-music-library');
  const cardRecentAudio = document.getElementById('card-recent-audio');
  const audioFileInput = document.getElementById('audio-file-input');

  if (cardDeviceFiles && audioFileInput) cardDeviceFiles.onclick = () => audioFileInput.click();
  if (cardMusicLibrary) cardMusicLibrary.onclick = () => openScreen('tab-my-audio');
  if (cardRecentAudio) cardRecentAudio.onclick = () => openScreen('tab-home');

  // File Picker Change -> Load as Normal Audio (NO autoplay, single Normal layer initially)
  if (audioFileInput) {
    audioFileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const buffer = await engine.loadAudioFile(file);
        const newTrack = {
          id: 'user-' + Date.now(),
          title: file.name,
          durationText: formatTime(buffer.duration),
          dateText: 'Just now',
          is8D: false,
          isFavorite: false,
          customBuffer: buffer
        };
        tracks.unshift(newTrack);
        currentTrack = newTrack;
        renderTracksList();

        resetEditorToNormalOnly();
        openScreen('screen-audio-editor');
      } catch (err) {
        alert("Could not load audio: " + err.message);
      }
    };
  }

  // Tap prompt to unlock 8D layer
  const promptCreate8d = document.getElementById('prompt-create-8d');
  if (promptCreate8d) {
    promptCreate8d.onclick = () => unlock8DLayer();
  }

  // Dual Slot 1: Normal Audio Play/Pause (Plays ONLY pure normal audio)
  const btnPlayNormalSlot = document.getElementById('btn-play-normal-slot');
  if (btnPlayNormalSlot) {
    btnPlayNormalSlot.onclick = () => {
      if (engine.isPlaying && currentPlayingSlot === 'normal') {
        engine.pause();
        currentPlayingSlot = null;
        updatePlaybackState(false);
      } else {
        currentPlayingSlot = 'normal';
        engine.set8DEnabled(false);
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  // Dual Slot 2: 8D Spatial Audio Play/Pause (Plays ONLY 8D converted audio)
  const btnPlaySpatialSlot = document.getElementById('btn-play-spatial-slot');
  if (btnPlaySpatialSlot) {
    btnPlaySpatialSlot.onclick = () => {
      if (engine.isPlaying && currentPlayingSlot === '8d') {
        engine.pause();
        currentPlayingSlot = null;
        updatePlaybackState(false);
      } else {
        currentPlayingSlot = '8d';
        engine.set8DEnabled(true);
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  // Presets
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyPreset(pill.getAttribute('data-preset'));
    };
  });

  // Simplified Sliders (adjusting unlocks 8D layer without autoplay)
  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed = document.getElementById('val-speed');
  if (sliderSpeed && valSpeed) {
    sliderSpeed.oninput = (e) => {
      unlock8DLayer();
      const v = parseFloat(e.target.value);
      engine.setOrbitSpeed(v);
      valSpeed.textContent = `${v.toFixed(1)}s`;
    };
  }

  const sliderDepth = document.getElementById('slider-depth');
  const valDepth = document.getElementById('val-depth');
  if (sliderDepth && valDepth) {
    sliderDepth.oninput = (e) => {
      unlock8DLayer();
      const v = parseFloat(e.target.value);
      engine.setDepth(v);
      valDepth.textContent = `${v.toFixed(1)}m`;
    };
  }

  const switchEditorReverb = document.getElementById('switch-editor-reverb');
  if (switchEditorReverb) {
    switchEditorReverb.onchange = (e) => {
      unlock8DLayer();
      engine.updateReverbMix(e.target.checked ? 0.5 : 0);
    };
  }

  const switchEditorBass = document.getElementById('switch-editor-bass');
  if (switchEditorBass) {
    switchEditorBass.onchange = (e) => {
      unlock8DLayer();
      engine.setBassBoost(e.target.checked);
    };
  }

  // Convert Action Button
  const btnEditorExportAction = document.getElementById('btn-editor-export-action');
  if (btnEditorExportAction) btnEditorExportAction.onclick = startConversionFlow;

  // Back Buttons
  const btnBackFromSelect = document.getElementById('btn-back-from-select');
  const btnBackFromEditor = document.getElementById('btn-back-from-editor');
  const btnBackFromPreview = document.getElementById('btn-back-from-preview');
  const btnBackFromSettings = document.getElementById('btn-back-from-settings');

  if (btnBackFromSelect) btnBackFromSelect.onclick = () => openScreen('tab-home');
  if (btnBackFromEditor) btnBackFromEditor.onclick = () => openScreen('tab-home');
  if (btnBackFromPreview) btnBackFromPreview.onclick = () => openScreen('screen-audio-editor');
  if (btnBackFromSettings) btnBackFromSettings.onclick = () => openScreen('tab-home');

  // Preview Screen A/B Comparison
  const cardModeOriginal = document.getElementById('card-mode-original');
  const cardMode8d = document.getElementById('card-mode-8d');
  const btnPlayOriginal = document.getElementById('btn-play-original');
  const btnPlay8d = document.getElementById('btn-play-8d');
  const previewModeIndicator = document.getElementById('preview-mode-indicator');
  const btnConvertTo8d = document.getElementById('btn-convert-to-8d');

  if (cardModeOriginal) {
    cardModeOriginal.onclick = () => {
      engine.set8DEnabled(false);
      cardModeOriginal.classList.add('active-card');
      if (cardMode8d) cardMode8d.classList.remove('active-8d', 'active-card');
      if (btnPlayOriginal) btnPlayOriginal.classList.add('active-btn');
      if (btnPlay8d) btnPlay8d.classList.remove('active-btn');
      if (previewModeIndicator) {
        previewModeIndicator.textContent = 'Original Stereo';
        previewModeIndicator.style.color = '#93c5fd';
        previewModeIndicator.style.borderColor = 'rgba(96,165,250,0.4)';
      }
      if (!engine.isPlaying) {
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  if (cardMode8d) {
    cardMode8d.onclick = () => {
      engine.set8DEnabled(true);
      cardMode8d.classList.add('active-8d');
      if (cardModeOriginal) cardModeOriginal.classList.remove('active-card');
      if (btnPlay8d) btnPlay8d.classList.add('active-btn');
      if (btnPlayOriginal) btnPlayOriginal.classList.remove('active-btn');
      if (previewModeIndicator) {
        previewModeIndicator.textContent = '8D Spatial Active';
        previewModeIndicator.style.color = '#00f084';
        previewModeIndicator.style.borderColor = 'rgba(0,240,132,0.4)';
      }
      if (!engine.isPlaying) {
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  if (btnConvertTo8d) btnConvertTo8d.onclick = startConversionFlow;

  // Processing Cancel Buttons
  const btnCancelProc = document.getElementById('btn-cancel-processing');
  const btnAbortConversion = document.getElementById('btn-abort-conversion');
  if (btnCancelProc) btnCancelProc.onclick = abortConversion;
  if (btnAbortConversion) btnAbortConversion.onclick = abortConversion;

  // Result Screen Buttons
  const btnResultPlay = document.getElementById('btn-result-play');
  const btnResultActionPlay = document.getElementById('btn-result-action-play');
  const btnResultActionSave = document.getElementById('btn-result-action-save');
  const btnResultActionShare = document.getElementById('btn-result-action-share');
  const btnResultActionAnother = document.getElementById('btn-result-action-another');

  if (btnResultPlay) {
    btnResultPlay.onclick = () => {
      if (engine.isPlaying) {
        engine.pause();
        updatePlaybackState(false);
      } else {
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  if (btnResultActionPlay) {
    btnResultActionPlay.onclick = () => {
      if (engine.isPlaying) {
        engine.pause();
        updatePlaybackState(false);
      } else {
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  if (btnResultActionSave) {
    btnResultActionSave.onclick = () => {
      if (convertedAudioBlob) {
        const url = URL.createObjectURL(convertedAudioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (currentTrack ? currentTrack.title.replace(/\.[^/.]+$/, "") : "audio") + "_8D_converted.wav";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        startConversionFlow();
      }
    };
  }

  if (btnResultActionShare) {
    btnResultActionShare.onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: '8D Audio Converted',
            text: `Listen to ${currentTrack ? currentTrack.title : 'this track'} in 360° 8D Audio!`,
            url: window.location.href
          });
        } catch (e) {}
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('8D Audio link copied to clipboard!');
      }
    };
  }

  if (btnResultActionAnother) {
    btnResultActionAnother.onclick = () => openScreen('screen-audio-select');
  }

  // My Audio Library Search & Filters
  const libraryFilterPills = document.querySelectorAll('#library-filter-tabs .filter-pill');
  libraryFilterPills.forEach(pill => {
    pill.onclick = () => {
      libraryFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeLibraryFilter = pill.getAttribute('data-filter') || 'all';
      renderTracksList();
    };
  });

  const inputLibSearch = document.getElementById('input-library-search');
  const btnClearLibSearch = document.getElementById('btn-clear-library-search');
  if (inputLibSearch) {
    inputLibSearch.oninput = (e) => {
      librarySearchQuery = e.target.value;
      renderTracksList();
    };
  }
  if (btnClearLibSearch && inputLibSearch) {
    btnClearLibSearch.onclick = () => {
      inputLibSearch.value = '';
      librarySearchQuery = '';
      renderTracksList();
    };
  }

  // Mini Player
  const miniPlayerOpen = document.getElementById('mini-player-open');
  const miniBtnPlay = document.getElementById('mini-btn-play');
  if (miniPlayerOpen) miniPlayerOpen.onclick = () => openScreen('screen-audio-editor');
  if (miniBtnPlay) {
    miniBtnPlay.onclick = () => {
      if (engine.isPlaying) {
        engine.pause();
        updatePlaybackState(false);
      } else {
        engine.play();
        updatePlaybackState(true);
      }
    };
  }

  // Settings Handlers
  const btnOpenAdvancedDsp = document.getElementById('btn-open-advanced-dsp');
  if (btnOpenAdvancedDsp) {
    btnOpenAdvancedDsp.onclick = () => openScreen('screen-advanced-settings');
  }

  const settingRowPrivacy = document.getElementById('setting-row-privacy');
  if (settingRowPrivacy) {
    settingRowPrivacy.onclick = () => alert('Privacy Policy: All 8D Audio conversion is processed locally on device.');
  }

  const settingRowTerms = document.getElementById('setting-row-terms');
  if (settingRowTerms) {
    settingRowTerms.onclick = () => alert('Terms of Service: Personal 8D audio spatialization license.');
  }

  const settingRowAbout = document.getElementById('setting-row-about');
  if (settingRowAbout) {
    settingRowAbout.onclick = () => alert('8D Audio Converter v1.2.0\nHigh-Resolution 360° Binaural HRTF Spatial Acoustic Synthesis Engine.');
  }

  const btnSeeAll = document.getElementById('btn-see-all');
  if (btnSeeAll) btnSeeAll.onclick = () => openScreen('tab-my-audio');

  engine.onEnded = () => {
    currentPlayingSlot = null;
    updatePlaybackState(false);
  };
}

/**
 * Independent Timeline Updater Loop
 */
function startTimelineUpdater() {
  setInterval(() => {
    if (engine.isPlaying && engine.duration > 0) {
      const cur = engine.getCurrentTime();
      const timeStr = formatTime(cur);
      const normalTimeCurrent = document.getElementById('normal-time-current');
      const spatialTimeCurrent = document.getElementById('spatial-time-current');
      const prevTimeCurrent = document.getElementById('prev-time-current');
      const resultTimeCurrent = document.getElementById('result-time-current');

      if (currentPlayingSlot === 'normal') {
        if (normalTimeCurrent) normalTimeCurrent.textContent = timeStr;
      } else if (currentPlayingSlot === '8d') {
        if (spatialTimeCurrent) spatialTimeCurrent.textContent = timeStr;
      }

      if (prevTimeCurrent) prevTimeCurrent.textContent = timeStr;
      if (resultTimeCurrent) resultTimeCurrent.textContent = timeStr;
    }
  }, 200);
}

/**
 * QR Code Generator
 */
async function setupNetworkQR() {
  const currentHost = window.location.hostname || '192.168.10.20';
  const currentPort = window.location.port || '5173';
  const url = `http://${currentHost}:${currentPort}`;

  const qrCanvasBox = document.getElementById('qr-canvas-box');
  if (qrCanvasBox) {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, url, {
      width: 200,
      margin: 1,
      color: { dark: '#111118', light: '#ffffff' }
    });
    qrCanvasBox.innerHTML = '';
    qrCanvasBox.appendChild(canvas);
  }
}

// Start App
function init() {
  renderTracksList();
  setupEventListeners();
  setupWaveformCanvases();
  setupProcessingBgCanvas();
  setupNetworkQR();
  startTimelineUpdater();
  engine.createDemoTrackBuffer();
}

init();
