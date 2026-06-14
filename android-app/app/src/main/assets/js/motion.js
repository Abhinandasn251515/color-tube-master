/* ═══════════════════════════════════════════════════════════
   motion.js — Accelerometer Shake Undo & Device Tilt Controls
   Uses DeviceMotion and DeviceOrientation APIs with permission prompts
 ═══════════════════════════════════════════════════════════ */

const MotionManager = (() => {
  let isEnabled = false;
  let activeIndex = -1;
  let lastShakeTime = 0;
  let lastMoveTime = 0;
  let lastTapTime = 0;

  // Shake threshold (m/s^2)
  const SHAKE_THRESHOLD = 15;
  // Tilt threshold (degrees)
  const TILT_THRESHOLD = 15;

  function init() {
    const toggle = document.getElementById('toggle-motion');
    if (!toggle) return;

    // Load setting
    isEnabled = Storage.get('motionControlsEnabled') === 'true';
    toggle.checked = isEnabled;

    toggle.addEventListener('click', async () => {
      isEnabled = toggle.checked;
      if (isEnabled) {
        const granted = await requestPermissions();
        if (!granted) {
          isEnabled = false;
          toggle.checked = false;
          showToast('❌ Motion permissions denied!');
        } else {
          Storage.set('motionControlsEnabled', 'true');
          showToast('🚀 Motion Controls Enabled! Tilt to highlight, tilt forward to tap, shake to undo.');
          startListening();
        }
      } else {
        Storage.set('motionControlsEnabled', 'false');
        stopListening();
        clearHighlights();
      }
    });

    if (isEnabled) {
      startListening();
    }
  }

  async function requestPermissions() {
    // iOS 13+ requires explicit permission request
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const orientPromise = DeviceOrientationEvent.requestPermission();
        const motionPromise = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'
          ? DeviceMotionEvent.requestPermission()
          : Promise.resolve('granted');

        const [orient, motion] = await Promise.all([orientPromise, motionPromise]);
        return orient === 'granted' && motion === 'granted';
      } catch (err) {
        console.error('[Motion] Permission error:', err);
        return false;
      }
    }
    return true; // Android/Desktop doesn't need permissions
  }

  function startListening() {
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
  }

  function stopListening() {
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);
  }

  // ── Shake Detection ───────────────────────────────────
  function handleMotion(e) {
    if (!isEnabled || !isGameActive()) return;

    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;

    // Calculate total acceleration magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const diff = Math.abs(magnitude - 9.8); // subtract gravity

    if (diff > SHAKE_THRESHOLD) {
      const now = Date.now();
      if (now - lastShakeTime > 1500) { // 1.5s debounce
        lastShakeTime = now;
        console.log('[Motion] Shake detected! Triggering undo.');
        Game.undo();
      }
    }
  }

  // ── Tilt Navigation ───────────────────────────────────
  function handleOrientation(e) {
    if (!isEnabled || !isGameActive()) {
      clearHighlights();
      return;
    }

    const now = Date.now();

    // gamma = left/right tilt (-90 to 90)
    // beta = front/back tilt (-180 to 180)
    const gamma = e.gamma || 0;
    const beta = e.beta || 0;

    const tubeEls = document.querySelectorAll('.tube-wrap');
    if (!tubeEls.length) return;

    // 1. Move selection left/right
    if (now - lastMoveTime > 600) { // 600ms scroll speed
      if (gamma < -TILT_THRESHOLD) {
        // Tilt Left
        if (activeIndex === -1) activeIndex = 0;
        else activeIndex = Math.max(0, activeIndex - 1);
        highlightActiveTube(tubeEls);
        lastMoveTime = now;
      } else if (gamma > TILT_THRESHOLD) {
        // Tilt Right
        if (activeIndex === -1) activeIndex = 0;
        else activeIndex = Math.min(tubeEls.length - 1, activeIndex + 1);
        highlightActiveTube(tubeEls);
        lastMoveTime = now;
      }
    }

    // 2. Select/Pour (tilt forward)
    if (beta > 45 && activeIndex !== -1) {
      if (now - lastTapTime > 1200) { // 1.2s action debounce
        lastTapTime = now;
        console.log('[Motion] Tilt tap triggered on tube index:', activeIndex);
        const tubeEl = tubeEls[activeIndex];
        if (tubeEl) {
          // Trigger virtual click on the tube
          tubeEl.click();
        }
      }
    }
  }

  function highlightActiveTube(tubeEls) {
    tubeEls.forEach((el, idx) => {
      if (idx === activeIndex) {
        el.classList.add('tilt-highlight');
      } else {
        el.classList.remove('tilt-highlight');
      }
    });
  }

  function clearHighlights() {
    const tubeEls = document.querySelectorAll('.tube-wrap');
    tubeEls.forEach(el => el.classList.remove('tilt-highlight'));
    activeIndex = -1;
  }

  function isGameActive() {
    const screenGame = document.getElementById('screen-game');
    return screenGame && screenGame.classList.contains('active');
  }

  return { init };
})();

window.MotionManager = MotionManager;
