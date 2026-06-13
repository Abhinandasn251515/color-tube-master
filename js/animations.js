/* ═══════════════════════════════════════════════════════════
   animations.js — Canvas Animations (Confetti, Particles, Pour)
═══════════════════════════════════════════════════════════ */

const Animations = (() => {

  // ── Background Particle System ─────────────────────────
  let bgCanvas, bgCtx, bgParticles = [], bgRaf;

  function initBg() {
    bgCanvas = document.getElementById('bg-canvas');
    if (!bgCanvas) return;
    resizeBg();
    spawnBgParticles();
    bgLoop();
    window.addEventListener('resize', resizeBg);
  }

  function resizeBg() {
    if (!bgCanvas) return;
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  function spawnBgParticles() {
    bgParticles = [];
    const count = Math.min(40, Math.floor(window.innerWidth / 24));
    for (let i = 0; i < count; i++) {
      bgParticles.push(createBgParticle());
    }
  }

  function createBgParticle() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * 2.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: -0.2 - Math.random() * 0.4,
      alpha: 0.1 + Math.random() * 0.3,
      color: getThemeColor(),
      pulse: Math.random() * Math.PI * 2
    };
  }

  function getThemeColor() {
    const theme = document.body.className.split(' ').find(c => c.startsWith('theme-')) || 'theme-lab';
    const colors = {
      'theme-lab':     ['#7c4dff','#00d4ff','#bf5fff','#3d9eff'],
      'theme-neon':    ['#00ff88','#ff0080','#00ffcc','#80ff40'],
      'theme-space':   ['#4080ff','#ff8040','#80c0ff','#ffc080'],
      'theme-fantasy': ['#c060ff','#ffcc00','#ff80ff','#ffee80'],
      'theme-ocean':   ['#00a8d8','#00ffcc','#40d0ff','#80ffe0'],
    };
    const palette = colors[theme] || colors['theme-lab'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function bgLoop() {
    if (!bgCtx) {
      bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
    }
    if (!bgCtx) return;

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    for (const p of bgParticles) {
      p.x += p.dx;
      p.y += p.dy;
      p.pulse += 0.02;
      p.alpha = 0.1 + Math.abs(Math.sin(p.pulse)) * 0.25;

      if (p.y < -10) { p.y = bgCanvas.height + 10; p.x = Math.random() * bgCanvas.width; p.color = getThemeColor(); }
      if (p.x < -10) p.x = bgCanvas.width + 10;
      if (p.x > bgCanvas.width + 10) p.x = -10;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = p.color;
      bgCtx.globalAlpha = p.alpha;
      bgCtx.fill();
    }

    bgCtx.globalAlpha = 1;
    bgRaf = requestAnimationFrame(bgLoop);
  }

  // ── Confetti System (Win Screen) ─────────────────────
  let confCanvas, confCtx, confParticles = [], confRaf, confRunning = false;

  const CONFETTI_COLORS = ['#ff3860','#3d9eff','#00e676','#ffe500','#bf5fff','#ff7a00','#ff5fa0','#00e5ff'];

  function startConfetti() {
    confCanvas = document.getElementById('confetti-canvas');
    if (!confCanvas) return;
    confCanvas.width  = window.innerWidth;
    confCanvas.height = window.innerHeight;
    confCtx = confCanvas.getContext('2d');
    confParticles = [];
    confRunning = true;

    for (let i = 0; i < 120; i++) {
      confParticles.push(createConfetti());
    }

    confLoop();
  }

  function createConfetti() {
    return {
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      r: 4 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      drot: (Math.random() - 0.5) * 0.15,
      dx: (Math.random() - 0.5) * 3,
      dy: 2 + Math.random() * 4,
      gravity: 0.08 + Math.random() * 0.06,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      alpha: 1
    };
  }

  function confLoop() {
    if (!confRunning) return;
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);

    confParticles = confParticles.filter(p => p.y < confCanvas.height + 50 && p.alpha > 0.01);

    for (const p of confParticles) {
      p.x += p.dx;
      p.y += p.dy;
      p.dy += p.gravity;
      p.rot += p.drot;
      if (p.y > confCanvas.height * 0.7) p.alpha = Math.max(0, p.alpha - 0.02);

      confCtx.save();
      confCtx.translate(p.x, p.y);
      confCtx.rotate(p.rot);
      confCtx.globalAlpha = p.alpha;
      confCtx.fillStyle = p.color;

      if (p.shape === 'rect') {
        confCtx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
      } else {
        confCtx.beginPath();
        confCtx.arc(0, 0, p.r/2, 0, Math.PI*2);
        confCtx.fill();
      }
      confCtx.restore();
    }

    confCtx.globalAlpha = 1;
    confRaf = requestAnimationFrame(confLoop);

    // Add new confetti burst for first 2 seconds
    if (confParticles.length < 80) {
      for (let i = 0; i < 3; i++) confParticles.push(createConfetti());
    }
  }

  function stopConfetti() {
    confRunning = false;
    if (confRaf) cancelAnimationFrame(confRaf);
    if (confCtx && confCanvas) confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
  }

  // ── Pour Arc Animation ─────────────────────────────────
  let pourCanvas, pourCtx;

  function initPour() {
    pourCanvas = document.getElementById('pour-canvas');
    if (!pourCanvas) return;
    pourCtx = pourCanvas.getContext('2d');
  }

  function resizePour() {
    if (!pourCanvas) return;
    const area = document.getElementById('game-area');
    if (!area) return;
    const rect = area.getBoundingClientRect();
    pourCanvas.width  = rect.width;
    pourCanvas.height = rect.height;
    pourCanvas.style.left = rect.left + 'px';
    pourCanvas.style.top  = rect.top  + 'px';
  }

  function animatePour(fromEl, toEl, color, onComplete) {
    if (!pourCanvas || !pourCtx) { if(onComplete)onComplete(); return; }
    resizePour();

    const area = document.getElementById('game-area');
    const areaRect = area.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect   = toEl.getBoundingClientRect();

    const sx = fromRect.left + fromRect.width/2  - areaRect.left;
    const sy = fromRect.top  - areaRect.top;
    const ex = toRect.left   + toRect.width/2    - areaRect.left;
    const ey = toRect.top    - areaRect.top;

    // Get liquid color
    const colorMap = {
      red:'#ff5076', blue:'#5db8ff', green:'#20f890', yellow:'#ffe840',
      purple:'#d070ff', orange:'#ff9030', pink:'#ff80c0', cyan:'#30f0ff',
      lime:'#c0ff30', brown:'#c07040', teal:'#30d0b0', maroon:'#e03040',
      navy:'#3060d0', indigo:'#7080f0', white:'#f0f0ff'
    };
    const fillColor = colorMap[color] || '#ffffff';

    let t = 0;
    const drops = [];
    const DUR = 400;
    const startTime = performance.now();

    function drawFrame(now) {
      t = Math.min((now - startTime) / DUR, 1);
      pourCtx.clearRect(0, 0, pourCanvas.width, pourCanvas.height);

      // Draw arc path
      const cx = (sx + ex) / 2;
      const cy = Math.min(sy, ey) - 40;

      pourCtx.beginPath();
      pourCtx.moveTo(sx, sy);
      pourCtx.quadraticCurveTo(cx, cy, ex, ey);
      pourCtx.strokeStyle = fillColor;
      pourCtx.lineWidth = 5;
      pourCtx.globalAlpha = 0.7 * (1 - t * 0.5);
      pourCtx.stroke();
      pourCtx.globalAlpha = 1;

      // Animated drop along arc
      const pt = t;
      const dx = (1-pt)*(1-pt)*sx + 2*(1-pt)*pt*cx + pt*pt*ex;
      const dy = (1-pt)*(1-pt)*sy + 2*(1-pt)*pt*cy + pt*pt*ey;

      pourCtx.beginPath();
      pourCtx.arc(dx, dy, 6, 0, Math.PI*2);
      pourCtx.fillStyle = fillColor;
      pourCtx.globalAlpha = 0.9;
      pourCtx.fill();
      pourCtx.globalAlpha = 1;

      // Splash drops at destination
      if (t > 0.8) {
        const st = (t - 0.8) / 0.2;
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + Math.PI * 0.5;
          const dist  = st * 14;
          pourCtx.beginPath();
          pourCtx.arc(ex + Math.cos(angle)*dist, ey + Math.sin(angle)*dist, 3*(1-st), 0, Math.PI*2);
          pourCtx.fillStyle = fillColor;
          pourCtx.globalAlpha = (1-st) * 0.8;
          pourCtx.fill();
        }
        pourCtx.globalAlpha = 1;
      }

      if (t < 1) {
        requestAnimationFrame(drawFrame);
      } else {
        pourCtx.clearRect(0, 0, pourCanvas.width, pourCanvas.height);
        if (onComplete) onComplete();
      }
    }

    requestAnimationFrame(drawFrame);
  }

  // ── XP Pop ────────────────────────────────────────────
  function showXPPop(amount) {
    const el = document.createElement('div');
    el.className = 'xp-pop';
    el.textContent = `+${amount} XP`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ── Combo Pop ────────────────────────────────────────
  function showComboPop(text) {
    const el = document.createElement('div');
    el.className = 'combo-pop';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  // ── Achievement Toast ─────────────────────────────────
  function showAchievementToast(ach) {
    const toast = document.getElementById('achievement-toast');
    const nameEl = document.getElementById('at-name');
    const iconEl = document.getElementById('at-icon');
    if (!toast || !nameEl) return;

    iconEl.textContent = ach.icon;
    nameEl.textContent = ach.name;
    toast.style.display = 'flex';
    toast.style.animation = 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)';

    Audio.achievement();
    Utils.vibrate([40, 20, 40]);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => { toast.style.display = 'none'; }, 350);
    }, 3000);
  }

  // ── Stars Animation (Win) ─────────────────────────────
  function animateStars(count) {
    ['star1','star2','star3'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('earned');
      if (i < count) {
        setTimeout(() => {
          el.classList.add('earned');
          Audio.collect();
          Utils.vibrate([20]);
        }, 400 + i * 250);
      }
    });
  }

  // ── Tube Shake ───────────────────────────────────────
  function shakeTube(tubeEl) {
    tubeEl.classList.remove('shake');
    void tubeEl.offsetWidth; // reflow
    tubeEl.classList.add('shake');
    setTimeout(() => tubeEl.classList.remove('shake'), 400);
    Audio.invalid();
    Utils.vibrate([50]);
  }

  // ── Win Pulse for completed tubes ────────────────────
  function markTubeWin(tubeEl) {
    tubeEl.classList.add('win-done');
  }

  return {
    initBg, startConfetti, stopConfetti,
    initPour, animatePour,
    showXPPop, showComboPop, showAchievementToast,
    animateStars, shakeTube, markTubeWin
  };
})();

window.Animations = Animations;
