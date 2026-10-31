/* ==========================================================================
   Workbench 3.0 - Procedural Chill Music & Focus Soundscapes
   ========================================================================== */

let audioCtx = null;
let masterGain = null;
let isAudioRunning = false;
let currentTrack = "lofi";
let activeNodes = [];
let sequencerTimer = null;

function initAudio() {
  if (audioCtx) return audioCtx;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioCtx = new AudioContextClass();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(state.audio?.volume ?? 0.4, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);
  return audioCtx;
}

function stopAudioNodes() {
  if (sequencerTimer) {
    clearInterval(sequencerTimer);
    sequencerTimer = null;
  }
  activeNodes.forEach(node => {
    try {
      if (typeof node.stop === "function") node.stop();
      if (typeof node.disconnect === "function") node.disconnect();
    } catch {}
  });
  activeNodes = [];
}

// 1. Lo-Fi Chill Chords Engine
function startLoFiChords() {
  stopAudioNodes();
  const ctx = initAudio();
  if (!ctx) return;

  // Soft brown noise vinyl bed
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = output[i];
    output[i] *= 0.15; // low vinyl hiss
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 1000;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.25;

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start();
  activeNodes.push(noiseSource, noiseGain, noiseFilter);

  // Mellow Lo-Fi chords progression: Dm9 -> G13 -> Cmaj9 -> Am7
  const chords = [
    [146.83, 220.00, 261.63, 329.63], // Dm9
    [196.00, 246.94, 329.63, 392.00], // G13
    [130.81, 196.00, 246.94, 329.63], // Cmaj9
    [110.00, 164.81, 220.00, 261.63]  // Am7
  ];
  let chordIndex = 0;

  function playChord(frequencies) {
    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.001, ctx.currentTime);
    chordGain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 1.2);
    chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.8);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 2.0);
    filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 4.8);

    frequencies.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(filter);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 5.0);
    });

    filter.connect(chordGain);
    chordGain.connect(masterGain);
  }

  playChord(chords[0]);
  sequencerTimer = setInterval(() => {
    chordIndex = (chordIndex + 1) % chords.length;
    playChord(chords[chordIndex]);
  }, 4800);
}

// 2. Ambient Rain & Hearth Engine
function startAmbientRain() {
  stopAudioNodes();
  const ctx = initAudio();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }

  const rain = ctx.createBufferSource();
  rain.buffer = buffer;
  rain.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;

  const rainGain = ctx.createGain();
  rainGain.gain.value = 0.35;

  rain.connect(filter);
  filter.connect(rainGain);
  rainGain.connect(masterGain);
  rain.start();
  activeNodes.push(rain, rainGain, filter);
}

// 3. Zen Pentatonic Bells Engine
function startZenBells() {
  stopAudioNodes();
  const ctx = initAudio();
  if (!ctx) return;

  const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
  sequencerTimer = setInterval(() => {
    if (Math.random() > 0.4) return;
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = ctx.createOscillator();
    const bellGain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    bellGain.gain.setValueAtTime(0.001, ctx.currentTime);
    bellGain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);

    osc.connect(bellGain);
    bellGain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 3.3);
  }, 1200);
}

// 4. Deep Focus Drone Engine
function startFocusDrone() {
  stopAudioNodes();
  const ctx = initAudio();
  if (!ctx) return;

  const freqs = [65.41, 130.81, 134.81]; // 4Hz binaural beat for deep focus
  freqs.forEach(f => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    g.gain.value = 0.15;
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    activeNodes.push(osc, g);
  });
}

function playTrack(track = currentTrack) {
  currentTrack = track;
  state.audio = state.audio || {};
  state.audio.track = track;
  state.audio.playing = true;

  const ctx = initAudio();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }

  if (track === "lofi") startLoFiChords();
  else if (track === "rain") startAmbientRain();
  else if (track === "bells") startZenBells();
  else if (track === "drone") startFocusDrone();

  isAudioRunning = true;
  updateAudioUI();
}

function stopTrack() {
  stopAudioNodes();
  state.audio = state.audio || {};
  state.audio.playing = false;
  isAudioRunning = false;
  updateAudioUI();
}

function toggleAudio() {
  if (isAudioRunning) stopTrack();
  else playTrack(currentTrack);
}

function setAudioVolume(vol) {
  const v = Math.max(0, Math.min(1, parseFloat(vol)));
  state.audio = state.audio || {};
  state.audio.volume = v;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(v, audioCtx.currentTime);
  }
}

function updateAudioUI() {
  const pillBtn = document.getElementById("audio-pill-btn");
  const playBtn = document.getElementById("focus-play-btn");
  const trackSelect = document.getElementById("focus-track-select");

  if (pillBtn) {
    pillBtn.classList.toggle("playing", isAudioRunning);
    pillBtn.innerHTML = isAudioRunning ? `🎵 Playing <span class="eq-bars"><span></span><span></span><span></span></span>` : `🎵 Chill Music`;
  }
  if (playBtn) {
    playBtn.textContent = isAudioRunning ? "⏸ Pause Soundscape" : "▶ Play Soundscape";
  }
  if (trackSelect) {
    trackSelect.value = currentTrack;
  }
}

if (typeof window !== "undefined") {
  window.initAudio = initAudio;
  window.playTrack = playTrack;
  window.stopTrack = stopTrack;
  window.toggleAudio = toggleAudio;
  window.setAudioVolume = setAudioVolume;
  window.updateAudioUI = updateAudioUI;
}
