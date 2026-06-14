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
      p.pulse += 0.025;
      p.alpha = 0.12 + Math.abs(Math.sin(p.pulse)) * 0.32;

      if (p.y < -15) { p.y = bgCanvas.height + 15; p.x = Math.random() * bgCanvas.width; p.color = getThemeColor(); }
      if (p.x < -15) p.x = bgCanvas.width + 15;
      if (p.x > bgCanvas.width + 15) p.x = -15;

      // Draw soft glowing orb using radial gradient
      const radGrad = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
      radGrad.addColorStop(0, p.color);
      radGrad.addColorStop(0.25, p.color);
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
      bgCtx.fillStyle = radGrad;
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

    // Bounding metrics for target tube
    const targetTubeCenterX = ex;
    const cylinderHeight = toRect.height;
    const targetLiquidCount = toEl.querySelectorAll('.liquid-layer').length;
    const liquidSurfaceY = ey + cylinderHeight * (1 - (targetLiquidCount + 0.5) / 4);

    // Get liquid color
    const colorMap = {
      red:'#ff3366', blue:'#3399ff', green:'#2ae89b', yellow:'#ffee55',
      purple:'#d27cff', orange:'#ff9e42', pink:'#ff7ab8', cyan:'#33f0ff',
      lime:'#bdff33', brown:'#c47c4d', teal:'#33f5d1', maroon:'#ff4d6d',
      navy:'#4d7cff', indigo:'#8c8cff', white:'#ffffff'
    };
    const fillColor = colorMap[color] || '#ffffff';

    const DUR = 400;
    const startTime = performance.now();

    const splashParticles = [];
    const bubbles = [];
    let frameCount = 0;

    function drawFrame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DUR, 1);
      frameCount++;

      pourCtx.clearRect(0, 0, pourCanvas.width, pourCanvas.height);

      // 1. Draw & Update Bubbles inside target tube
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += b.vy;
        b.wobblePhase += b.wobbleSpeed;
        b.x = targetTubeCenterX + Math.sin(b.wobblePhase) * b.wobbleAmount;
        
        // check if popped at surface
        if (b.y <= liquidSurfaceY || b.alpha <= 0.01) {
          bubbles.splice(i, 1);
          continue;
        }

        pourCtx.beginPath();
        pourCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        pourCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        pourCtx.lineWidth = 0.75;
        pourCtx.stroke();

        // bubble specular shine
        pourCtx.beginPath();
        pourCtx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
        pourCtx.fillStyle = '#ffffff';
        pourCtx.fill();
      }

      // 2. Draw & Update Splash Particles
      for (let i = splashParticles.length - 1; i >= 0; i--) {
        const p = splashParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;

        if (p.alpha <= 0.01) {
          splashParticles.splice(i, 1);
          continue;
        }

        pourCtx.beginPath();
        pourCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        pourCtx.fillStyle = p.color;
        pourCtx.globalAlpha = p.alpha;
        pourCtx.fill();
        pourCtx.globalAlpha = 1;
      }

      // 3. Draw Pour Stream Arc (if pouring is active)
      if (t < 0.98) {
        const cx = (sx + ex) / 2;
        const cy = Math.min(sy, ey) - 40;

        // Pass A: Outer glow stream
        pourCtx.beginPath();
        pourCtx.moveTo(sx, sy);
        pourCtx.quadraticCurveTo(cx, cy, ex, ey);
        pourCtx.strokeStyle = fillColor;
        pourCtx.lineWidth = 7.5;
        pourCtx.lineCap = 'round';
        pourCtx.globalAlpha = 0.45 * (1 - t * 0.3);
        pourCtx.stroke();

        // Pass B: Inner hot-white core stream
        pourCtx.beginPath();
        pourCtx.moveTo(sx, sy);
        pourCtx.quadraticCurveTo(cx, cy, ex, ey);
        pourCtx.strokeStyle = '#ffffff';
        pourCtx.lineWidth = 2.5;
        pourCtx.lineCap = 'round';
        pourCtx.globalAlpha = 0.95;
        pourCtx.stroke();
        pourCtx.globalAlpha = 1;

        // Animated drop along arc
        const pt = t;
        const dx = (1-pt)*(1-pt)*sx + 2*(1-pt)*pt*cx + pt*pt*ex;
        const dy = (1-pt)*(1-pt)*sy + 2*(1-pt)*pt*cy + pt*pt*ey;

        pourCtx.beginPath();
        pourCtx.arc(dx, dy, 7, 0, Math.PI*2);
        pourCtx.fillStyle = fillColor;
        pourCtx.shadowColor = fillColor;
        pourCtx.shadowBlur = 8;
        pourCtx.fill();
        pourCtx.shadowBlur = 0; // reset shadow

        // Spawn Splash Particles
        if (t > 0.25) {
          const spawnCount = Math.random() > 0.5 ? 2 : 1;
          for (let k = 0; k < spawnCount; k++) {
            splashParticles.push({
              x: ex + (Math.random() - 0.5) * 8,
              y: liquidSurfaceY + (Math.random() - 0.5) * 4,
              vx: (Math.random() - 0.5) * 5,
              vy: -1.5 - Math.random() * 4,
              gravity: 0.22,
              radius: 1.5 + Math.random() * 2,
              color: fillColor,
              alpha: 1.0,
              decay: 0.03 + Math.random() * 0.04
            });
          }
        }

        // Spawn Bubbles rising from bottom
        if (frameCount % 4 === 0) {
          bubbles.push({
            x: targetTubeCenterX + (Math.random() - 0.5) * (toRect.width - 12),
            y: ey + cylinderHeight - 12,
            vy: -1.2 - Math.random() * 1.5,
            wobbleSpeed: 0.06 + Math.random() * 0.1,
            wobbleAmount: 0.8 + Math.random() * 1.5,
            wobblePhase: Math.random() * Math.PI * 2,
            radius: 1.2 + Math.random() * 2.2,
            alpha: 0.8
          });
        }
      }

      // 4. Continue Loop until animation completes AND particles fade out
      if (t < 1 || splashParticles.length > 0 || bubbles.length > 0) {
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
