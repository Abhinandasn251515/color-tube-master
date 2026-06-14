/* ═══════════════════════════════════════════════════════════
   utils.js — Helper Utilities
═══════════════════════════════════════════════════════════ */

const Utils = (() => {

  /** Deep clone an array of arrays */
  function cloneState(tubes) {
    return tubes.map(t => [...t]);
  }

  /** Check if two states are equal */
  function statesEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].length !== b[i].length) return false;
      for (let j = 0; j < a[i].length; j++) {
        if (a[i][j] !== b[i][j]) return false;
      }
    }
    return true;
  }

  /** Serialize state to string for BFS visited set */
  function stateKey(tubes) {
    return tubes.map(t => t.join(',')).join('|');
  }

  /** Format seconds to mm:ss */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2,'0');
    const s = (seconds % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  /** Clamp a value between min and max */
  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  /** Linear interpolation */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Get element bounding rect relative to viewport */
  function getRect(el) {
    return el.getBoundingClientRect();
  }

  /** Shuffle array in-place (Fisher-Yates) */
  function shuffle(arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Seeded random number generator (mulberry32) */
  function seededRng(seed) {
    let s = seed >>> 0;
    return function() {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /** Get today's date string YYYY-MM-DD */
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /** Get today's date seed (for daily challenge) */
  function dailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  /** Ease functions */
  const ease = {
    outCubic:  t => 1 - Math.pow(1 - t, 3),
    inOutCubic:t => t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2,
    outBounce: t => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1/d1) return n1*t*t;
      else if (t < 2/d1) { t -= 1.5/d1; return n1*t*t + 0.75; }
      else if (t < 2.5/d1) { t -= 2.25/d1; return n1*t*t + 0.9375; }
      else { t -= 2.625/d1; return n1*t*t + 0.984375; }
    },
    outElastic:t => {
      const c4 = (2*Math.PI)/3;
      return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t*10-0.75)*c4)+1;
    }
  };

  /** Animate a value over time */
  function animate({ from, to, duration, easing = ease.outCubic, onUpdate, onComplete }) {
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      onUpdate(lerp(from, to, easing(t)));
      if (t < 1) requestAnimationFrame(tick);
      else if (onComplete) onComplete();
    }
    requestAnimationFrame(tick);
  }

  /** Wait for ms milliseconds */
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Number format with commas */
  function formatNumber(n) {
    return n.toLocaleString();
  }

  /** Vibrate (if available and enabled in settings) */
  function vibrate(pattern = [20]) {
    if (navigator.vibrate && typeof Storage !== 'undefined' && Storage.data && Storage.data() && Storage.data().hapticOn) {
      navigator.vibrate(pattern);
    }
  }

  return {
    cloneState, statesEqual, stateKey, formatTime, clamp, lerp,
    getRect, shuffle, seededRng, todayStr, dailySeed,
    ease, animate, wait, formatNumber, vibrate
  };
})();

window.Utils = Utils;
