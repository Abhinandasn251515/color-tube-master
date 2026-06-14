/* ═══════════════════════════════════════════════════════════
   addictive.js — Streak, Spin Wheel, Time Attack, 50 Achievements
   Color Tube Master 3D
═══════════════════════════════════════════════════════════ */

const Addictive = (() => {

  // ── 50 Extended Achievements ─────────────────────────────
  const EXTRA_ACHIEVEMENTS = [
    // Speed
    { id:'speed_30s',    icon:'⚡', name:'Lightning Fast',    desc:'Solve a level in under 30 seconds',     check: s => s.fastestTime <= 30 },
    { id:'speed_10m',    icon:'🏎️', name:'Speed Runner',      desc:'Complete 10 levels under 60s each',    check: s => s.fastLevelCount >= 10 },
    { id:'speedrun_1',   icon:'🏁', name:'First Speedrun',    desc:'Complete your first speedrun challenge', check: s => s.speedrunDone },

    // Streak
    { id:'streak_3',     icon:'🔥', name:'On Fire!',          desc:'Login 3 days in a row',                check: s => s.loginStreak >= 3 },
    { id:'streak_14',    icon:'🔥🔥', name:'Two Week Warrior', desc:'Login 14 days in a row',              check: s => s.loginStreak >= 14 },
    { id:'streak_60',    icon:'💫', name:'Streak Legend',     desc:'Login 60 days in a row',               check: s => s.loginStreak >= 60 },

    // XP Milestones
    { id:'xp_500',       icon:'🌱', name:'Rising Star',       desc:'Earn 500 XP',                          check: s => s.totalXP >= 500 },
    { id:'xp_2000',      icon:'🌟', name:'XP Hunter',         desc:'Earn 2,000 XP',                        check: s => s.totalXP >= 2000 },
    { id:'xp_5000',      icon:'💎', name:'XP Master',         desc:'Earn 5,000 XP',                        check: s => s.totalXP >= 5000 },
    { id:'xp_10000',     icon:'👑', name:'XP Legend',         desc:'Earn 10,000 XP',                       check: s => s.totalXP >= 10000 },

    // Coins
    { id:'coins_500',    icon:'🪙', name:'Pocket Change',     desc:'Collect 500 coins',                    check: s => s.totalCoins >= 500 },
    { id:'coins_5000',   icon:'💰', name:'Treasure Hunter',   desc:'Collect 5,000 coins',                  check: s => s.totalCoins >= 5000 },
    { id:'coins_spend',  icon:'🛍️', name:'Big Spender',       desc:'Spend 100 coins on power-ups',         check: s => s.coinsSpent >= 100 },

    // Power-Ups
    { id:'first_powerup',icon:'⚡', name:'Powered Up!',       desc:'Use your first power-up',              check: s => s.powerupUsed },
    { id:'bomb_used',    icon:'💣', name:'Bomb Squad',        desc:'Use a Color Bomb power-up',            check: s => s.bombUsed },
    { id:'autosolved',   icon:'🤖', name:'Let AI Win',        desc:'Use Auto-Solve power-up',              check: s => s.autoSolveUsed },

    // Spin Wheel
    { id:'first_spin',   icon:'🎡', name:'Wheel of Fortune',  desc:'Spin the daily wheel for the first time', check: s => s.spinDone },
    { id:'spin_7',       icon:'🎰', name:'Lucky Week',        desc:'Spin the wheel 7 days in a row',       check: s => s.spinStreak >= 7 },
    { id:'spin_jackpot', icon:'🎉', name:'Jackpot!',          desc:'Win the jackpot on the spin wheel',    check: s => s.jackpotWon },

    // Stars
    { id:'stars_25',     icon:'⭐', name:'Star Collector',    desc:'Get 3 stars on 25 levels',             check: s => s.threeStarCount >= 25 },
    { id:'stars_50',     icon:'🌟', name:'Star Master',       desc:'Get 3 stars on 50 levels',             check: s => s.threeStarCount >= 50 },
    { id:'stars_all',    icon:'✨', name:'Perfect Game',      desc:'Get 3 stars on all 100 levels',        check: s => s.threeStarCount >= 100 },
    { id:'first_star3',  icon:'⭐', name:'Perfectionist',     desc:'Get 3 stars on a level',               check: s => s.threeStarCount >= 1 },

    // Time Attack
    { id:'ta_first',     icon:'⏱️', name:'Against the Clock', desc:'Complete your first Time Attack',      check: s => s.timeAttackDone },
    { id:'ta_60',        icon:'🔥', name:'60 Second Hero',    desc:'Beat the 60-second Time Attack',       check: s => s.ta60Done },
    { id:'ta_5',         icon:'🏆', name:'Time Attack Pro',   desc:'Complete 5 Time Attack challenges',    check: s => s.timeAttackCount >= 5 },

    // Levels
    { id:'lvl_25',       icon:'🗺️', name:'Explorer',          desc:'Complete 25 levels',                   check: s => s.completedCount >= 25 },
    { id:'lvl_75',       icon:'🧠', name:'Puzzle Brain',      desc:'Complete 75 levels',                   check: s => s.completedCount >= 75 },
    { id:'perfect_10',   icon:'💯', name:'Perfect Ten',       desc:'Complete 10 levels in a row perfectly',check: s => s.perfectStreak >= 10 },

    // Sharing
    { id:'first_share',  icon:'📤', name:'Social Butterfly',  desc:'Share the game with a friend',         check: s => s.shared },
    { id:'challenge_sent',icon:'📣', name:'Challenger',       desc:'Send a friend challenge link',          check: s => s.challengeSent },
    { id:'qr_used',      icon:'📷', name:'QR Master',         desc:'Share via QR code',                    check: s => s.qrShared },

    // Daily
    { id:'daily_3',      icon:'📅', name:'Daily Devotee',     desc:'Complete 3 daily challenges',          check: s => s.dailyCount >= 3 },
    { id:'daily_7',      icon:'🗓️', name:'Weekly Champion',   desc:'Complete 7 daily challenges',          check: s => s.dailyCount >= 7 },
    { id:'daily_30',     icon:'🏅', name:'Monthly Master',    desc:'Complete 30 daily challenges',         check: s => s.dailyCount >= 30 },

    // Fun
    { id:'undo_10',      icon:'↩️', name:'Second Guesser',    desc:'Use undo 10 times total',              check: s => s.undoCount >= 10 },
    { id:'no_undo_5',    icon:'🎯', name:'Decisive Mind',     desc:'Complete 5 levels without undo',       check: s => s.noUndoCount >= 5 },
    { id:'no_hint_10',   icon:'🧩', name:'Pure Logic Pro',    desc:'Complete 10 levels without hints',     check: s => s.noHintCount >= 10 },
    { id:'gems_10',      icon:'💎', name:'Gem Collector',     desc:'Collect 10 gems',                      check: s => s.totalGems >= 10 },
    { id:'login_early',  icon:'🌅', name:'Early Bird',        desc:'Login before 7 AM',                    check: s => s.earlyBird },

    // Ranks
    { id:'rank_skilled', icon:'🟢', name:'Skilled Up!',       desc:'Reach Skilled rank',                   check: s => s.totalXP >= 500 },
    { id:'rank_expert',  icon:'🟣', name:'Expert Achieved',   desc:'Reach Expert rank',                    check: s => s.totalXP >= 1500 },
    { id:'rank_master',  icon:'🟡', name:'Master Class',      desc:'Reach Master rank',                    check: s => s.totalXP >= 3500 },
    { id:'rank_legend',  icon:'⭐', name:'Puzzle Legend',     desc:'Reach Grand Master rank',              check: s => s.totalXP >= 7500 },
  ];

  // ── Register extra achievements with Progression ─────────
  function registerExtraAchievements() {
    if (!window.Progression) return;
    const existing = Progression.ACHIEVEMENTS.map(a => a.id);
    EXTRA_ACHIEVEMENTS.forEach(ea => {
      if (!existing.includes(ea.id)) {
        Progression.ACHIEVEMENTS.push(ea);
      }
    });
  }

  // ── Streak System ────────────────────────────────────────
  function checkAndUpdateStreak() {
    const today = new Date().toDateString();
    const lastLogin = Storage.get('lastLoginDate') || '';
    const streak = Storage.get('loginStreak') || 0;

    if (lastLogin === today) {
      return streak; // Already counted today
    }

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = (lastLogin === yesterday) ? streak + 1 : 1;

    Storage.set('loginStreak', newStreak);
    Storage.set('lastLoginDate', today);

    // Early bird check
    const hour = new Date().getHours();
    if (hour < 7) Storage.set('earlyBird', true);

    // Streak milestone coins
    const milestones = { 3: 30, 7: 100, 14: 200, 30: 500, 60: 1000 };
    if (milestones[newStreak]) {
      Storage.addCoins(milestones[newStreak]);
      UI.showToast(`🔥 ${newStreak} day streak! +${milestones[newStreak]}🪙`);
    }

    return newStreak;
  }

  function updateStreakUI(streak) {
    const countEl = document.getElementById('streak-count');
    const fireEl  = document.getElementById('streak-fire');
    if (countEl) countEl.textContent = streak;
    if (fireEl) {
      // More fire emojis for longer streaks
      fireEl.textContent = streak >= 30 ? '🔥🔥🔥' : streak >= 14 ? '🔥🔥' : '🔥';
    }
  }

  // ── Spin Wheel ───────────────────────────────────────────
  const SPIN_PRIZES = [
    { label: '🪙 50',  value: 50,   type: 'coins', color: '#fbbf24' },
    { label: '💡 Hint', value: 1,   type: 'hint',  color: '#7c3aed' },
    { label: '🪙 20',  value: 20,   type: 'coins', color: '#f59e0b' },
    { label: '💎 2',   value: 2,    type: 'gems',  color: '#06b6d4' },
    { label: '🪙 100', value: 100,  type: 'coins', color: '#10b981' },
    { label: '⚡ XP',  value: 75,   type: 'xp',    color: '#8b5cf6' },
    { label: '🎁 200', value: 200,  type: 'coins', color: '#ec4899', jackpot: true },
    { label: '🪙 30',  value: 30,   type: 'coins', color: '#f97316' },
  ];

  let spinning = false;
  let currentAngle = 0;

  function drawWheel(canvas, angle) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r  = cx - 8;
    const sliceAngle = (2 * Math.PI) / SPIN_PRIZES.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer glow ring
    const grad = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 8);
    grad.addColorStop(0, 'rgba(124,58,237,0.5)');
    grad.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    SPIN_PRIZES.forEach((prize, i) => {
      const startA = angle + i * sliceAngle;
      const endA   = startA + sliceAngle;

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(prize.label, r - 10, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,58,237,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function spinWheel() {
    if (spinning) return;

    const today = new Date().toDateString();
    const lastSpin = Storage.get('lastSpinDate') || '';

    if (lastSpin === today) {
      const statusEl = document.getElementById('spin-status-text');
      if (statusEl) statusEl.textContent = '⏰ Already spun today! Come back tomorrow.';
      const btn = document.getElementById('btn-do-spin');
      if (btn) btn.disabled = true;
      return;
    }

    spinning = true;
    const canvas = document.getElementById('spin-canvas');
    const btn = document.getElementById('btn-do-spin');
    const resultEl = document.getElementById('spin-result');
    if (btn) btn.disabled = true;
    if (resultEl) resultEl.style.display = 'none';

    const prizeIndex  = Math.floor(Math.random() * SPIN_PRIZES.length);
    const sliceAngle  = (2 * Math.PI) / SPIN_PRIZES.length;
    const targetAngle = currentAngle + (Math.PI * 2 * 5) + (Math.PI * 2 - prizeIndex * sliceAngle - sliceAngle / 2) - (Math.PI / 2);

    const duration = 4000;
    const startTime = performance.now();
    const startAngle = currentAngle;

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      currentAngle = startAngle + (targetAngle - startAngle) * easeOut(progress);
      drawWheel(canvas, currentAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        spinning = false;
        const prize = SPIN_PRIZES[prizeIndex];

        // Apply prize
        if (prize.type === 'coins')  Storage.addCoins(prize.value);
        else if (prize.type === 'gems')   Storage.addGems(prize.value);
        else if (prize.type === 'xp')    Storage.addXP(prize.value);
        else if (prize.type === 'hint')  Storage.set('hintsRemaining', (Storage.get('hintsRemaining') || 0) + prize.value);

        // Record spin
        Storage.set('lastSpinDate', today);
        const spinStreak = Storage.get('spinStreak') || 0;
        const lastSpinCheck = Storage.get('lastSpinStreakDate') || '';
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newSpinStreak = (lastSpinCheck === yesterday) ? spinStreak + 1 : 1;
        Storage.set('spinStreak', newSpinStreak);
        Storage.set('lastSpinStreakDate', today);
        Storage.set('spinDone', true);
        if (prize.jackpot) Storage.set('jackpotWon', true);

        // Show result
        if (resultEl) {
          resultEl.style.display = 'block';
          resultEl.textContent = `🎉 You won: ${prize.label}!`;
        }

        // Hide spin badge (already used)
        const spinBadge = document.getElementById('spin-badge');
        if (spinBadge) spinBadge.style.display = 'none';

        // Confetti for jackpot
        if (prize.jackpot) {
          Animations.startConfetti && Animations.startConfetti();
          setTimeout(() => Animations.stopConfetti && Animations.stopConfetti(), 3000);
        }

        // Check achievements
        checkExtraAchievements();
        UI.showToast(`🎡 You won ${prize.label}!`);
        updateMenuCoins();
      }
    }

    requestAnimationFrame(animate);
  }

  function openSpinWheel() {
    const modal = document.getElementById('modal-spin-wheel');
    if (!modal) return;
    modal.style.display = 'flex';

    const canvas = document.getElementById('spin-canvas');
    if (canvas) drawWheel(canvas, currentAngle);

    // Check if already spun today
    const today = new Date().toDateString();
    const lastSpin = Storage.get('lastSpinDate') || '';
    const btn = document.getElementById('btn-do-spin');
    const statusEl = document.getElementById('spin-status-text');

    if (lastSpin === today) {
      if (btn) btn.disabled = true;
      if (statusEl) statusEl.textContent = '⏰ Already spun today! Come back tomorrow.';
    } else {
      if (btn) btn.disabled = false;
      if (statusEl) statusEl.textContent = '🎁 Spin once a day for free prizes!';
    }
  }

  function closeSpinWheel() {
    const modal = document.getElementById('modal-spin-wheel');
    if (modal) modal.style.display = 'none';
  }

  // ── Time Attack Mode ─────────────────────────────────────
  let taTimer = null;
  let taSeconds = 120;
  let taRunning = false;
  let taSelectedSec = 120;

  function openTimeAttack() {
    const modal = document.getElementById('modal-time-attack');
    if (modal) modal.style.display = 'flex';
  }

  function closeTimeAttack() {
    const modal = document.getElementById('modal-time-attack');
    if (modal) modal.style.display = 'none';
  }

  function startTimeAttack() {
    closeTimeAttack();
    taSeconds = taSelectedSec;
    taRunning = true;

    // Get or inject countdown display in HUD
    let taEl = document.getElementById('ta-countdown');
    if (!taEl) {
      taEl = document.createElement('div');
      taEl.id = 'ta-countdown';
      const hud = document.querySelector('.game-hud') || document.getElementById('screen-game');
      if (hud) hud.prepend(taEl);
    }
    taEl.style.display = 'block';
    updateTADisplay(taEl);

    taTimer = setInterval(() => {
      if (!taRunning) { clearInterval(taTimer); return; }
      taSeconds--;
      updateTADisplay(taEl);

      if (taSeconds <= 10) {
        taEl.closest('.game-hud') && taEl.closest('.game-hud').classList.add('ta-urgent');
        Audio.tap && Audio.tap();
      }

      if (taSeconds <= 0) {
        clearInterval(taTimer);
        taRunning = false;
        taEl.style.display = 'none';
        UI.showToast('⏰ Time\'s up! Better luck next time.');
        Storage.addCoins(-20); // Penalty
        setTimeout(() => UI.showScreen('menu'), 2000);
      }
    }, 1000);

    // Start a level
    const randomLevel = Levels.getAll().filter(l => l.difficulty === 'easy' || l.difficulty === 'medium');
    const lvl = randomLevel[Math.floor(Math.random() * randomLevel.length)];
    if (lvl) {
      lvl.isTimeAttack = true;
      UI.startLevel(lvl.id);
    }
  }

  function updateTADisplay(el) {
    if (!el) return;
    const m = Math.floor(taSeconds / 60);
    const s = taSeconds % 60;
    el.textContent = `⏱️ ${m}:${s.toString().padStart(2, '0')}`;
  }

  function stopTimeAttack() {
    taRunning = false;
    clearInterval(taTimer);
    const taEl = document.getElementById('ta-countdown');
    if (taEl) taEl.style.display = 'none';
  }

  function onTimeAttackWin(moves, timeSec, stars) {
    stopTimeAttack();
    const timeLeft = taSeconds;
    const bonus = Math.floor(timeLeft * 0.8) + (stars >= 3 ? 50 : 0) + 100;
    Storage.addCoins(bonus);
    Storage.addXP(25);
    Storage.set('timeAttackDone', true);
    Storage.set('timeAttackCount', (Storage.get('timeAttackCount') || 0) + 1);
    if (taSelectedSec === 60) Storage.set('ta60Done', true);
    UI.showToast(`⏱️ Time Attack cleared! +${bonus}🪙 bonus!`);
    checkExtraAchievements();
  }

  // ── Check Extra Achievements ─────────────────────────────
  function checkExtraAchievements() {
    const levelsData = Storage.get('levelsCompleted') || {};
    const threeStarCount = Object.values(levelsData).filter(l => l.stars === 3).length;
    const s = {
      totalXP: Storage.get('xp') || 0,
      totalCoins: Storage.get('coins') || 0,
      totalGems: Storage.get('gems') || 0,
      loginStreak: Storage.get('loginStreak') || 0,
      completedCount: Storage.countCompleted(),
      threeStarCount,
      spinDone: !!Storage.get('spinDone'),
      spinStreak: Storage.get('spinStreak') || 0,
      jackpotWon: !!Storage.get('jackpotWon'),
      timeAttackDone: !!Storage.get('timeAttackDone'),
      timeAttackCount: Storage.get('timeAttackCount') || 0,
      ta60Done: !!Storage.get('ta60Done'),
      fastestTime: Storage.get('fastestTime') || 999,
      fastLevelCount: Storage.get('fastLevelCount') || 0,
      speedrunDone: !!Storage.get('speedrunDone'),
      powerupUsed: !!Storage.get('powerupUsed'),
      bombUsed: !!Storage.get('bombUsed'),
      autoSolveUsed: !!Storage.get('autoSolveUsed'),
      coinsSpent: Storage.get('coinsSpent') || 0,
      shared: !!Storage.get('shared'),
      challengeSent: !!Storage.get('challengeSent'),
      qrShared: !!Storage.get('qrShared'),
      dailyCount: Storage.get('dailyCount') || 0,
      undoCount: Storage.get('undoCount') || 0,
      noUndoCount: Storage.get('noUndoCount') || 0,
      noHintCount: Storage.get('noHintCount') || 0,
      perfectStreak: Storage.get('perfectStreak') || 0,
      earlyBird: !!Storage.get('earlyBird'),
    };

    EXTRA_ACHIEVEMENTS.forEach(ach => {
      if (Storage.isAchievementUnlocked(ach.id)) return;
      if (ach.check(s)) {
        Storage.unlockAchievement(ach.id);
        Storage.addXP(75);
        // Show toast
        const toast = document.getElementById('achievement-toast');
        const nameEl = document.getElementById('at-name');
        const iconEl = document.getElementById('at-icon');
        if (toast && nameEl && iconEl) {
          iconEl.textContent = ach.icon;
          nameEl.textContent = ach.name;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 3500);
        }
      }
    });
  }

  // ── Update menu coin/gem display ─────────────────────────
  function updateMenuCoins() {
    const coinEl = document.getElementById('coin-count');
    const gemEl  = document.getElementById('gem-count');
    if (coinEl) coinEl.textContent = Storage.get('coins') || 0;
    if (gemEl)  gemEl.textContent  = Storage.get('gems')  || 0;
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    // Register extra achievements
    registerExtraAchievements();

    // Update streak
    const streak = checkAndUpdateStreak();
    updateStreakUI(streak);

    // Spin wheel buttons
    const spinBtns = ['btn-spin-mini', 'btn-spin-wheel'];
    spinBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', openSpinWheel);
    });
    const closeSpinBtn = document.getElementById('btn-spin-close');
    if (closeSpinBtn) closeSpinBtn.addEventListener('click', closeSpinWheel);
    const doSpinBtn = document.getElementById('btn-do-spin');
    if (doSpinBtn) doSpinBtn.addEventListener('click', spinWheel);

    // Time attack buttons
    const taBtn = document.getElementById('btn-time-attack');
    if (taBtn) taBtn.addEventListener('click', openTimeAttack);
    const taClose = document.getElementById('btn-ta-close');
    if (taClose) taClose.addEventListener('click', closeTimeAttack);
    const taStart = document.getElementById('btn-ta-start');
    if (taStart) taStart.addEventListener('click', startTimeAttack);

    // Time attack difficulty buttons
    document.querySelectorAll('.ta-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ta-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        taSelectedSec = parseInt(btn.dataset.sec);
      });
    });

    // Check if spin already used today
    const today = new Date().toDateString();
    const lastSpin = Storage.get('lastSpinDate') || '';
    const spinBadge = document.getElementById('spin-badge');
    if (spinBadge && lastSpin === today) spinBadge.style.display = 'none';

    // Initial achievement check
    checkExtraAchievements();
  }

  return {
    init, checkExtraAchievements, updateStreakUI, checkAndUpdateStreak,
    openSpinWheel, closeSpinWheel, spinWheel,
    openTimeAttack, closeTimeAttack, startTimeAttack, stopTimeAttack, onTimeAttackWin,
    EXTRA_ACHIEVEMENTS
  };
})();

window.Addictive = Addictive;
