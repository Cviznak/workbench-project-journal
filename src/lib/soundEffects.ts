'use client';

import confetti from 'canvas-confetti';

// -------------------------------------------------------------
// Web Audio API Procedural Sound Synthesizer (Zero External Assets)
// -------------------------------------------------------------

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private ambientGain: GainNode | null = null;
  private lofiAudio: HTMLAudioElement | null = null;
  private lofiFallbackTimer: any = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Task Completed Chime (3-note ascending cheerful arpeggio)
  playTaskComplete() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  }

  // 2. Level Up Fanfare (5-note triumphant fanfare)
  playLevelUp() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5]; // C5, E5, G5, B5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.65);
    });
  }

  // 3. Subtask Toggle Click / Pop
  playSubtaskCheck() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  // 4. Gentle Pomodoro Timer Bell
  playTimerBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [440, 880, 1320]; // Rich gentle singing bowl tone
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const amp = 0.18 / (idx + 1);
      gain.gain.setValueAtTime(amp, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 2.6);
    });
  }

  // 5. Tactile Bubble Pop (Soft playful organic bubble burst)
  playBubblePop() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  // 6. Retro 8-Bit Coin Pickup (Triumphant ascending dual-pulse)
  playCoinSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [987.77, 1318.51]; // B5, E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.35);
    });
  }

  // 7. Magical Shimmer (5-note glittering sparkling arpeggio)
  playMagicChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98]; // E5, G5, B5, E6, G6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.45);
    });
  }

  // 8. Cozy Rhodes Dream Chord (Lush relaxing Cmaj7 harmonic wash)
  playSuccessChord() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [261.63, 329.63, 392.00, 493.88, 523.25]; // C4, E4, G4, B4, C5
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.25);
    });
  }

  // 9. Tactile Mechanical Click (Satisfying crisp micro-switch impulse)
  playMechanicalClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  // -------------------------------------------------------------
  // Ambient Sound Engine (Procedural Noise, Binaural Beats, Lo-Fi)
  // -------------------------------------------------------------

  stopAmbient() {
    // 1. Immediately mute and disconnect ambient gain
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.ambientGain.disconnect();
      } catch (e) {
        // ignore
      }
      this.ambientGain = null;
    }

    // 2. Stop and disconnect every tracked AudioNode (oscillators, buffers, filters, merger)
    this.ambientNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch (e) {
        // ignore
      }
    });
    this.ambientNodes = [];
    this.ambientSource = null;

    // 3. Stop Lo-Fi audio stream
    if (this.lofiAudio) {
      try {
        this.lofiAudio.pause();
        this.lofiAudio.removeAttribute('src');
        this.lofiAudio.load();
      } catch (e) {
        // ignore
      }
      this.lofiAudio = null;
    }

    // 4. Clear procedural loop timer if active
    if (this.lofiFallbackTimer) {
      clearInterval(this.lofiFallbackTimer);
      this.lofiFallbackTimer = null;
    }
  }

  setAmbientVolume(volume: number) {
    const safeVol = Math.max(0, Math.min(1, volume));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(safeVol, this.ctx.currentTime);
    }
    if (this.lofiAudio) {
      this.lofiAudio.volume = safeVol;
    }
  }

  playAmbient(type: 'rain' | 'brown' | 'binaural' | 'lofi', volume = 0.3) {
    // Fully reset any active ambient sounds first
    this.stopAmbient();

    const ctx = this.getContext();
    if (!ctx) return;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(volume, ctx.currentTime);
    this.ambientGain.connect(ctx.destination);

    if (type === 'rain') {
      // Procedural Rain: Band-pass filtered white noise with soft rainfall acoustics
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.ambientGain);
      noise.start();

      this.ambientNodes.push(noise, filter);
      this.ambientSource = noise;
    } else if (type === 'brown') {
      // Procedural Deep Brown Noise (Warm rumble for deep focus)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.ambientGain);
      noise.start();

      this.ambientNodes.push(noise, filter);
      this.ambientSource = noise;
    } else if (type === 'binaural') {
      // Binaural Beats: 216Hz and 226Hz (10Hz Alpha Focus Waves)
      const oscLeft = ctx.createOscillator();
      const oscRight = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);

      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(216, ctx.currentTime);
      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(226, ctx.currentTime);

      oscLeft.connect(merger, 0, 0);
      oscRight.connect(merger, 0, 1);
      merger.connect(this.ambientGain);

      oscLeft.start();
      oscRight.start();

      // Track all generated nodes so stopAmbient cleanly terminates both left and right channels
      this.ambientNodes.push(oscLeft, oscRight, merger);
      this.ambientSource = oscLeft;
    } else if (type === 'lofi') {
      // Curated 24/7 Lo-Fi Chillhop Radio with automatic fallback
      const primaryStream = 'https://streams.ilovemusic.de/iloveradio17.mp3'; // 24/7 Chillhop / Lofi Beats
      const backupStream = 'https://ice2.somafm.com/groovesalad-128-mp3'; // SomaFM Chilled Downtempo

      try {
        const audio = new Audio();
        // Do NOT set crossOrigin='anonymous' as it triggers CORS blocks on streaming 302 redirects
        audio.preload = 'none';
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.src = primaryStream;

        audio.addEventListener('error', () => {
          if (this.lofiAudio && this.lofiAudio.src !== backupStream) {
            this.lofiAudio.src = backupStream;
            this.lofiAudio.play().catch(() => {
              this.startProceduralLofi(volume);
            });
          } else {
            this.startProceduralLofi(volume);
          }
        });

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // If primary playback fails or is blocked by browser policies, attempt backup
            if (this.lofiAudio) {
              this.lofiAudio.src = backupStream;
              this.lofiAudio.play().catch(() => {
                this.startProceduralLofi(volume);
              });
            }
          });
        }

        this.lofiAudio = audio;
      } catch (err) {
        // Fallback to offline procedural ambient lofi
        this.startProceduralLofi(volume);
      }
    }
  }

  // Offline / Resilient Procedural Lo-Fi Generator (Warm Rhodes chords + vinyl texture)
  private startProceduralLofi(volume = 0.3) {
    const ctx = this.getContext();
    if (!ctx) return;

    if (!this.ambientGain) {
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(volume, ctx.currentTime);
      this.ambientGain.connect(ctx.destination);
    }

    // Gentle vinyl surface crackle
    const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleData.length; i++) {
      if (Math.random() < 0.003) {
        crackleData[i] = (Math.random() * 2 - 1) * 0.12;
      } else {
        crackleData[i] = (Math.random() * 2 - 1) * 0.006;
      }
    }
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    crackleSource.loop = true;

    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.setValueAtTime(2200, ctx.currentTime);
    crackleFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    crackleSource.connect(crackleFilter);
    crackleFilter.connect(this.ambientGain);
    crackleSource.start();
    this.ambientNodes.push(crackleSource, crackleFilter);

    // Warm Lo-Fi 7th Chords (Cmaj7 -> Am7 -> Dm7 -> G7)
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [146.83, 220.00, 261.63, 349.23], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (!this.ambientGain || !this.ctx) return;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientGain!);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 4.0);

        this.ambientNodes.push(osc, gain, filter);
      });
    };

    playChord();
    this.lofiFallbackTimer = setInterval(playChord, 4000);
  }
}

export const sounds = new SoundEngine();
export const soundEngine = sounds;

// -------------------------------------------------------------
// Confetti Celebration
// -------------------------------------------------------------

export function triggerCelebrationConfetti() {
  if (typeof window === 'undefined') return;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  });

  // Second burst for dramatic effect
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#3b82f6', '#10b981', '#f59e0b'],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#8b5cf6', '#ec4899', '#06b6d4'],
    });
  }, 250);
}

export const triggerConfetti = triggerCelebrationConfetti;
