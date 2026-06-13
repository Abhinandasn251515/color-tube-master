/* ═══════════════════════════════════════════════════════════
   audio.js — Web Audio API Sound Manager
   Procedurally generated sounds (no audio files needed)
═══════════════════════════════════════════════════════════ */

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  let bgMusicNode = null;
  let musicRunning = false;

  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.7;
        sfxGain.connect(masterGain);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0.2;
        musicGain.connect(masterGain);
      } catch(e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Play a sound if sfx is enabled */
  function playSfx(fn) {
    if (!Storage.get('sfxOn')) return;
    const c = getCtx();
    if (!c) return;
    try { fn(c, sfxGain); } catch(e) {}
  }

  // ── Sound Effects ──────────────────────────────────────

  /** Liquid pour sound */
  function pour() {
    playSfx((c, g) => {
      const buf = c.createBuffer(1, c.sampleRate * 0.35, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / c.sampleRate;
        const envelope = Math.exp(-t * 6) * (1 - Math.exp(-t * 40));
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const src = c.createBufferSource();
      src.buffer = buf;

      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1.5;

      const filter2 = c.createBiquadFilter();
      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(2000, c.currentTime);
      filter2.frequency.linearRampToValueAtTime(400, c.currentTime + 0.3);

      src.connect(filter);
      filter.connect(filter2);
      filter2.connect(g);
      src.start();
    });
  }

  /** Tube tap / select */
  function tap() {
    playSfx((c, g) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.connect(gain); gain.connect(g);
      osc.start(); osc.stop(c.currentTime + 0.1);
    });
  }

  /** Invalid move */
  function invalid() {
    playSfx((c, g) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, c.currentTime);
      osc.frequency.linearRampToValueAtTime(80, c.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
      osc.connect(gain); gain.connect(g);
      osc.start(); osc.stop(c.currentTime + 0.12);
    });
  }

  /** Level complete! Ascending chord */
  function win() {
    playSfx((c, g) => {
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const t = c.currentTime + i * 0.1;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain); gain.connect(g);
        osc.start(t); osc.stop(t + 0.55);
      });
    });
  }

  /** Collect reward */
  function collect() {
    playSfx((c, g) => {
      [880, 1108, 1320, 1760].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const t = c.currentTime + i * 0.07;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain); gain.connect(g);
        osc.start(t); osc.stop(t + 0.28);
      });
    });
  }

  /** Button click */
  function click() {
    playSfx((c, g) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, c.currentTime);
      gain.gain.setValueAtTime(0.06, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
      osc.connect(gain); gain.connect(g);
      osc.start(); osc.stop(c.currentTime + 0.07);
    });
  }

  /** Achievement unlock */
  function achievement() {
    playSfx((c, g) => {
      const melody = [523, 659, 784, 1047, 1319];
      melody.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const t = c.currentTime + i * 0.08;
        osc.type = i === 4 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain); gain.connect(g);
        osc.start(t); osc.stop(t + 0.45);
      });
    });
  }

  /** Undo move */
  function undo() {
    playSfx((c, g) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, c.currentTime);
      osc.frequency.linearRampToValueAtTime(280, c.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
      osc.connect(gain); gain.connect(g);
      osc.start(); osc.stop(c.currentTime + 0.15);
    });
  }

  // ── Background Music ───────────────────────────────────

  let musicInterval = null;
  let musicNotes = null;
  let musicIdx = 0;

  const MUSIC_SCALE = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

  function playMusicNote(c, g) {
    const note = MUSIC_SCALE[musicIdx % MUSIC_SCALE.length];
    musicIdx++;

    const osc = c.createOscillator();
    const gainNode = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.type = 'sine';
    osc.frequency.value = note;
    gainNode.gain.setValueAtTime(0, c.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(g);
    osc.start();
    osc.stop(c.currentTime + 1.6);

    // Occasional harmony
    if (Math.random() > 0.6) {
      const osc2 = c.createOscillator();
      const g2 = c.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = note * 1.5;
      g2.gain.setValueAtTime(0, c.currentTime);
      g2.gain.linearRampToValueAtTime(0.02, c.currentTime + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.0);
      osc2.connect(g2); g2.connect(g);
      osc2.start(); osc2.stop(c.currentTime + 1.0);
    }
  }

  function startMusic() {
    if (musicRunning) return;
    if (!Storage.get('musicOn')) return;
    const c = getCtx();
    if (!c) return;

    musicRunning = true;
    musicIdx = 0;
    playMusicNote(c, musicGain);
    musicInterval = setInterval(() => {
      if (!musicRunning) return;
      const c2 = getCtx();
      if (c2) playMusicNote(c2, musicGain);
    }, 700 + Math.random() * 600);
  }

  function stopMusic() {
    musicRunning = false;
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  function setSfxEnabled(on) {
    if (sfxGain) sfxGain.gain.value = on ? 0.7 : 0;
  }

  function setMusicEnabled(on) {
    if (on && !musicRunning) startMusic();
    else if (!on) stopMusic();
  }

  /** Game over / Lose! Descending sad chord */
  function lose() {
    playSfx((c, g) => {
      const notes = [293.66, 261.63, 220.00, 196.00]; // D4, C4, A3, G3 (sad tone)
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        const t = c.currentTime + i * 0.15;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(freq * 0.8, t + 0.4);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain); gain.connect(g);
        osc.start(t); osc.stop(t + 0.65);
      });
    });
  }

  function resume() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  return { pour, tap, invalid, win, lose, collect, click, achievement, undo, startMusic, stopMusic, setSfxEnabled, setMusicEnabled, resume };
})();

window.Audio = Audio;

