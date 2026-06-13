/* ═══════════════════════════════════════════════════════════
   ui.js — UI Controller (Screens, Menus, Modals, Shop)
═══════════════════════════════════════════════════════════ */

const UI = (() => {

  let currentScreen = 'splash';
  let adCallback    = null;
  let adTimerInt    = null;
  let lastWinData   = null;

  // ── Screen Navigation ──────────────────────────────────
  function showScreen(id, animate = true) {
    const prev = document.querySelector('.screen.active');
    const next = document.getElementById(`screen-${id}`);
    if (!next) return;

    if (prev) prev.classList.remove('active');
    next.classList.add('active');
    currentScreen = id;

    if (id === 'menu')   refreshMenu();
    if (id === 'levels') refreshLevelGrid();
    if (id === 'achievements') refreshAchievements();
    if (id === 'shop')   refreshShop('themes');
    if (id === 'leaderboard') refreshLeaderboard('global');
    if (id === 'daily')  refreshDaily();
    if (id === 'ttt')    TicTacToe3D.resetBoard();
  }

  // ── Menu Refresh ──────────────────────────────────────
  function refreshMenu() {
    const save = Storage.data();

    document.getElementById('menu-player-name').textContent = save.playerName || 'Puzzle Master';
    document.getElementById('menu-player-rank').textContent = save.rank || 'Beginner';
    document.getElementById('coin-count').textContent = Utils.formatNumber(save.coins || 0);
    document.getElementById('gem-count').textContent  = Utils.formatNumber(save.gems  || 0);

    const xp   = save.xp || 0;
    const prog  = Progression.getXPProgress(xp);
    const next  = Progression.getNextRank(xp);
    document.getElementById('xp-fill').style.width = `${prog * 100}%`;
    document.getElementById('xp-label').textContent = next
      ? `${Utils.formatNumber(xp)} / ${Utils.formatNumber(next.xp)} XP`
      : `${Utils.formatNumber(xp)} XP (MAX)`;

    // Daily badge
    const dailyDone = save.dailyDone === Utils.todayStr();
    const dailyBadge = document.getElementById('daily-badge');
    if (dailyBadge) dailyBadge.style.display = dailyDone ? 'none' : 'block';

    // Settings progress
    const sp = document.getElementById('settings-progress');
    if (sp) sp.textContent = `${Storage.countCompleted()}/100`;

    // Login reward banner (show if reward available today)
    const loginResult = Storage.checkLoginReward();
    const banner = document.getElementById('login-reward-banner');
    if (loginResult && banner) {
      banner.style.display = 'flex';
    } else if (banner) {
      banner.style.display = 'none';
    }
    if (loginResult) {
      showLoginRewardModal(loginResult);
    }
  }

  // ── Level Grid ────────────────────────────────────────
  function refreshLevelGrid(diff = 'beginner') {
    const grid = document.getElementById('levels-grid');
    if (!grid) return;

    const allLevels = Levels.getByDifficulty(diff);
    const completed = Storage.countCompleted();

    // Update progress text
    const progEl = document.getElementById('levels-progress-text');
    if (progEl) progEl.textContent = `${completed}/100`;

    grid.innerHTML = '';

    // Find what's unlocked: any level up to (last completed + 1 per difficulty)
    const lastDone = getLastCompletedInRange(diff);

    allLevels.forEach((level, i) => {
      const levelData = Storage.getLevelData(level.id);
      const isCompleted = !!levelData;
      const prevId = i > 0 ? allLevels[i-1].id : null;
      const prevDone = prevId ? !!Storage.getLevelData(prevId) : true;
      const isUnlocked = i === 0 || prevDone;
      const isCurrent  = !isCompleted && isUnlocked;

      const cell = document.createElement('div');
      cell.className = 'level-cell';
      if (isCompleted) cell.classList.add('completed');
      else if (isCurrent)  cell.classList.add('current');
      else if (!isUnlocked)cell.classList.add('locked');

      const numEl = document.createElement('div');
      numEl.className = 'lc-num';
      numEl.textContent = isUnlocked ? level.id : '🔒';

      const starsEl = document.createElement('div');
      starsEl.className = 'lc-stars';
      if (isCompleted && levelData) {
        starsEl.textContent = '⭐'.repeat(levelData.stars);
      }

      cell.appendChild(numEl);
      cell.appendChild(starsEl);

      if (isUnlocked) {
        cell.addEventListener('click', () => {
          Audio.click();
          startLevel(level.id);
        });
      }

      grid.appendChild(cell);
    });
  }

  function getLastCompletedInRange(diff) {
    const levels = Levels.getByDifficulty(diff);
    let last = -1;
    levels.forEach((l, i) => {
      if (Storage.getLevelData(l.id)) last = i;
    });
    return last;
  }

  // ── Start Level ───────────────────────────────────────
  function startLevel(levelId) {
    const levelData = Levels.getById(levelId);
    if (!levelData) return;

    showScreen('game');
    Animations.stopConfetti();

    Game.onWin(handleWin);
    Game.loadLevel(levelData);

    Audio.startMusic();
  }

  function startDailyChallenge() {
    const dailyLevel = Levels.getDailyChallenge();
    showScreen('game');
    Game.onWin(handleWin);
    Game.loadLevel(dailyLevel);
    Audio.startMusic();
  }

  function startInfiniteMode() {
    const seed  = Date.now();
    const level = Levels.generateLevel(seed, 'medium');
    level.isInfinite = true;
    level.id = 'inf_' + seed;
    showScreen('game');
    Game.onWin(handleWin);
    Game.loadLevel(level);
    Audio.startMusic();
  }

  // ── Win Handler ───────────────────────────────────────
  function handleWin({ stars, moves, timeSec, usedHint, usedUndo, levelData }) {
    lastWinData = { levelData, moves, timeSec };
    const diff = levelData.difficulty || 'beginner';

    // Process progression
    const result = Progression.onLevelComplete({
      levelId: levelData.id,
      moves, timeSec,
      usedHint, usedUndo,
      difficulty: diff,
      stars
    });

    // Mark daily done
    if (levelData.isDaily) Storage.set('dailyDone', Utils.todayStr());

    // Show win screen
    showScreen('win');
    Animations.animateStars(stars);

    document.getElementById('win-moves').textContent = moves;
    document.getElementById('win-time').textContent  = Utils.formatTime(timeSec);
    document.getElementById('win-xp').textContent    = `+${result.xpGained}`;
    document.getElementById('win-coins').textContent = `+${result.coins}`;
    document.getElementById('win-gems').textContent  = `+${result.gems}`;

    // XP pop
    setTimeout(() => Animations.showXPPop(result.xpGained), 800);

    // Achievement toasts (queue them)
    result.achUnlocked.forEach((ach, i) => {
      setTimeout(() => Animations.showAchievementToast(ach), 1500 + i * 3500);
    });

    // Wire next level button
    const nextBtn = document.getElementById('win-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        Audio.click();
        Animations.stopConfetti();
        // Find next level
        const nextId = typeof levelData.id === 'number' ? levelData.id + 1 : null;
        const next   = nextId ? Levels.getById(nextId) : null;
        if (next) startLevel(next.id);
        else { showScreen('levels'); }
      };
    }

    const menuBtn = document.getElementById('win-menu');
    if (menuBtn) {
      menuBtn.onclick = () => {
        Audio.click();
        Animations.stopConfetti();
        showScreen('menu');
      };
    }
  }

  // ── Achievements ──────────────────────────────────────
  function refreshAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Progression.ACHIEVEMENTS.forEach(ach => {
      const unlocked = Storage.isAchievementUnlocked(ach.id);
      const card = document.createElement('div');
      card.className = `ach-card ${unlocked ? 'unlocked' : ''}`;

      card.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        <div class="ach-progress"><div class="ach-progress-fill" style="width:${unlocked?'100':'0'}%"></div></div>
      `;
      grid.appendChild(card);
    });
  }

  // ── Shop ──────────────────────────────────────────────
  let currentShopTab = 'themes';

  const THEMES_FOR_SALE = [
    { id:'lab',     name:'Laboratory', icon:'🔬', price:0,   currency:'free',  unlockLevel:0  },
    { id:'neon',    name:'Neon Cyber', icon:'⚡', price:200, currency:'gems',  unlockLevel:20 },
    { id:'space',   name:'Space Stn.', icon:'🚀', price:300, currency:'gems',  unlockLevel:40 },
    { id:'fantasy', name:'Fantasy',    icon:'🧙', price:400, currency:'gems',  unlockLevel:60 },
    { id:'ocean',   name:'Ocean',      icon:'🌊', price:500, currency:'gems',  unlockLevel:80 },
  ];

  const SKINS_FOR_SALE = [
    { id:'default', name:'Classic',   icon:'🧪', price:0,   currency:'free'  },
    { id:'crystal', name:'Crystal',   icon:'💎', price:100, currency:'coins' },
    { id:'neon',    name:'Neon Glow', icon:'⚡', price:150, currency:'coins' },
    { id:'gold',    name:'Gold',      icon:'🥇', price:200, currency:'coins' },
    { id:'shadow',  name:'Shadow',    icon:'🌑', price:250, currency:'coins' },
  ];

  const BOOSTS = [
    { id:'hint_x3',  name:'3 Hints',    icon:'💡', price:50,  currency:'coins', action: () => { for(let i=0;i<3;i++) Game.addHint(); } },
    { id:'hint_x10', name:'10 Hints',   icon:'💡', price:150, currency:'coins', action: () => { for(let i=0;i<10;i++) Game.addHint(); } },
    { id:'gems_5',   name:'5 Gems',     icon:'💎', price:200, currency:'coins', action: () => Storage.addGems(5) },
    { id:'coins_100',name:'100 Coins',  icon:'🪙', price:5,   currency:'gems',  action: () => Storage.addCoins(100) },
  ];

  function refreshShop(tab) {
    currentShopTab = tab;

    // Update tab styles
    document.querySelectorAll('.shop-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.shop === tab);
    });

    // Update currency display
    document.getElementById('shop-coins').textContent = Storage.get('coins') || 0;
    document.getElementById('shop-gems').textContent  = Storage.get('gems')  || 0;

    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const completed = Storage.countCompleted();

    let items = [];
    if (tab === 'themes') items = THEMES_FOR_SALE;
    else if (tab === 'skins') items = SKINS_FOR_SALE;
    else items = BOOSTS;

    items.forEach(item => {
      const isOwned    = tab === 'themes' ? Storage.isThemeOwned(item.id) : tab === 'skins' ? Storage.isSkinOwned(item.id) : false;
      const isEquipped = tab === 'themes' ? Storage.get('equippedTheme') === item.id : tab === 'skins' ? Storage.get('equippedSkin') === item.id : false;
      const lockedByLevel = item.unlockLevel && completed < item.unlockLevel;

      const card = document.createElement('div');
      card.className = `shop-item ${isOwned || item.currency==='free' ? 'owned' : ''}`;

      const priceStr = item.currency === 'free' ? 'Free' : `${item.currency === 'coins' ? '🪙' : '💎'} ${item.price}`;
      const btnText  = isEquipped ? 'Equipped' : isOwned ? 'Equip' : lockedByLevel ? `🔒 Lv.${item.unlockLevel}` : priceStr;
      const btnClass = isEquipped ? 'shop-item-btn equipped' : isOwned ? 'shop-item-btn owned' : 'shop-item-btn';

      card.innerHTML = `
        <div class="shop-item-preview" style="background:${tab==='themes'?getThemePreviewBg(item.id):'rgba(255,255,255,0.05)'}">${item.icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-price">${priceStr}</div>
        <button class="${btnClass}" ${lockedByLevel && !isOwned ? 'disabled' : ''}>${btnText}</button>
      `;

      const btn = card.querySelector('button');
      btn.addEventListener('click', () => {
        Audio.click();
        handleShopPurchase(tab, item, isOwned, isEquipped);
      });

      grid.appendChild(card);
    });
  }

  function getThemePreviewBg(themeId) {
    const bgs = {
      lab:     'radial-gradient(ellipse, #1a0545 0%, #050510 100%)',
      neon:    'radial-gradient(ellipse, #200040 0%, #050010 100%)',
      space:   'radial-gradient(ellipse, #0c1a40 0%, #020610 100%)',
      fantasy: 'radial-gradient(ellipse, #2a0850 0%, #0a0414 100%)',
      ocean:   'radial-gradient(ellipse, #043060 0%, #010812 100%)',
    };
    return bgs[themeId] || bgs.lab;
  }

  function handleShopPurchase(tab, item, isOwned, isEquipped) {
    if (isEquipped) return;

    if (isOwned || item.currency === 'free') {
      // Just equip
      if (tab === 'themes') {
        applyTheme(item.id);
        Storage.set('equippedTheme', item.id);
      } else if (tab === 'skins') {
        Storage.set('equippedSkin', item.id);
      } else if (item.action) {
        item.action();
      }
      refreshShop(tab);
      return;
    }

    // Purchase
    const cost   = item.price;
    const curr   = item.currency;
    let canAfford = false;

    if (curr === 'coins') canAfford = Storage.spendCoins(cost);
    else if (curr === 'gems') canAfford = Storage.spendGems(cost);

    if (!canAfford) {
      showToast('Not enough ' + (curr === 'coins' ? '🪙 Coins' : '💎 Gems') + '!');
      return;
    }

    if (tab === 'themes') { Storage.ownTheme(item.id); applyTheme(item.id); Storage.set('equippedTheme', item.id); }
    else if (tab === 'skins') { Storage.ownSkin(item.id); Storage.set('equippedSkin', item.id); }
    else if (item.action) { item.action(); }

    Audio.collect();
    refreshShop(tab);
  }

  // ── Theme Application ─────────────────────────────────
  function applyTheme(themeId) {
    document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
    document.body.classList.add(`theme-${themeId}`);
    Storage.set('equippedTheme', themeId);

    // Update theme picker
    document.querySelectorAll('.theme-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === themeId);
    });
  }

  // ── Settings ──────────────────────────────────────────
  function initSettings() {
    const save = Storage.data();

    const sfxToggle = document.getElementById('toggle-sfx');
    const musToggle = document.getElementById('toggle-music');
    const hapToggle = document.getElementById('toggle-haptic');
    const nameInput = document.getElementById('player-name-input');

    if (sfxToggle) { sfxToggle.checked = !!save.sfxOn; sfxToggle.addEventListener('change', e => { Storage.set('sfxOn', e.target.checked); Audio.setSfxEnabled(e.target.checked); }); }
    if (musToggle) { musToggle.checked = !!save.musicOn; musToggle.addEventListener('change', e => { Storage.set('musicOn', e.target.checked); Audio.setMusicEnabled(e.target.checked); }); }
    if (hapToggle) { hapToggle.checked = !!save.hapticOn; hapToggle.addEventListener('change', e => Storage.set('hapticOn', e.target.checked)); }
    if (nameInput) {
      nameInput.value = save.playerName || '';
      nameInput.addEventListener('input', e => Storage.set('playerName', e.target.value || 'Puzzle Master'));
    }

    // Theme picker in settings
    const completed = Storage.countCompleted();
    document.querySelectorAll('.theme-opt').forEach(opt => {
      const theme = opt.dataset.theme;
      const unlock = parseInt(opt.dataset.unlock) || 0;
      const isOwned = Storage.isThemeOwned(theme) || unlock === 0;
      opt.classList.toggle('locked', !isOwned);
      opt.classList.toggle('active', theme === (save.equippedTheme || 'lab'));

      opt.addEventListener('click', () => {
        if (!isOwned) { showToast(`Complete ${unlock} levels to unlock!`); return; }
        Audio.click();
        applyTheme(theme);
      });
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        Storage.reset();
        location.reload();
      }
    });
  }

  // ── Leaderboard ───────────────────────────────────────
  function refreshLeaderboard(tab) {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.toggle('active', t.dataset.lb === tab));

    const list = document.getElementById('lb-list');
    if (!list) return;

    // Show LIVE badge only when Firebase is configured
    const liveBadge = document.getElementById('lb-live-badge');
    if (liveBadge) liveBadge.style.display = Auth.isFirebaseReady() ? 'flex' : 'none';

    // Get cached entries or show loading
    const cached = LeaderboardService.getEntries();
    if (cached.length > 0) {
      LeaderboardService.renderList(cached, 'lb-list');
    } else if (!Auth.isFirebaseReady()) {
      // Guest / offline mode — use local fake data
      const fakeEntries = Progression.getLeaderboard().map(e => ({
        ...e,
        xp: e.score,
        completedCount: 0,
      }));
      LeaderboardService.renderList(fakeEntries, 'lb-list');
    } else {
      list.innerHTML = '<div class="lb-empty">🌐 Loading live leaderboard...</div>';
    }

    // Subscribe for real-time updates (no-op if already subscribed)
    LeaderboardService.subscribe(entries => {
      if (currentScreen === 'leaderboard') {
        LeaderboardService.renderList(entries, 'lb-list');
      }
    });
  }


  // ── Daily Challenge Screen ─────────────────────────────
  function refreshDaily() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    document.getElementById('daily-date').textContent = dateStr;
    document.getElementById('daily-title').textContent = "Today's Challenge";

    // Streak
    const streak = Storage.get('loginStreak') || 1;
    document.getElementById('streak-count').textContent = streak;

    const streakDaysEl = document.getElementById('streak-days');
    if (streakDaysEl) {
      streakDaysEl.innerHTML = '';
      for (let i = 1; i <= 7; i++) {
        const d = document.createElement('div');
        d.className = `streak-day ${i < streak ? 'done' : i === streak ? 'today' : ''}`;
        d.textContent = `D${i}`;
        streakDaysEl.appendChild(d);
      }
    }

    // Check if already done today
    const doneSel = document.getElementById('btn-play-daily');
    if (doneSel) {
      const done = Storage.get('dailyDone') === Utils.todayStr();
      doneSel.textContent = done ? '✅ Completed Today!' : 'Play Now';
      doneSel.disabled = done;
    }
  }

  // ── Ad Modal ──────────────────────────────────────────
  function showAdModal(title, desc, onReward) {
    adCallback = onReward;
    document.getElementById('ad-title').textContent = title;
    document.getElementById('ad-desc').textContent  = desc;

    const modal  = document.getElementById('modal-ad');
    const fill   = document.getElementById('ad-bar-fill');
    const timer  = document.getElementById('ad-timer');
    const btn    = document.getElementById('ad-confirm');

    modal.style.display = 'flex';
    btn.disabled = true;
    fill.style.width = '0%';
    timer.textContent = '5';

    let elapsed = 0;
    adTimerInt = setInterval(() => {
      elapsed++;
      const pct = (elapsed / 5) * 100;
      fill.style.width = pct + '%';
      timer.textContent = 5 - elapsed;
      if (elapsed >= 5) {
        clearInterval(adTimerInt);
        btn.disabled = false;
      }
    }, 1000);
  }

  function closeAdModal() {
    document.getElementById('modal-ad').style.display = 'none';
    clearInterval(adTimerInt);
    adCallback = null;
  }

  // ── Login Reward Modal ────────────────────────────────
  function showLoginRewardModal({ day, streak }) {
    const reward = Progression.getLoginReward(day);

    const modal    = document.getElementById('modal-login-reward');
    const dayEl    = document.getElementById('rc-day-num');
    const itemsEl  = document.getElementById('rc-items');

    dayEl.textContent = day;
    itemsEl.innerHTML = '';

    reward.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'reward-item';
      div.innerHTML = `<div class="reward-item-icon">${item.icon}</div><div class="reward-item-amount">${item.amount}</div>`;
      itemsEl.appendChild(div);
    });

    modal.style.display = 'flex';
  }

  // ── Pause Modal ───────────────────────────────────────
  function showPauseModal() {
    Game.pause();
    document.getElementById('modal-pause').style.display = 'flex';
  }

  function hidePauseModal() {
    document.getElementById('modal-pause').style.display = 'none';
    Game.resume();
  }

  // ── Simple Toast ──────────────────────────────────────
  function showToast(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
      background:rgba(13,13,43,0.95); border:1px solid rgba(255,255,255,0.15);
      color:#fff; padding:10px 20px; border-radius:999px; font-size:0.85rem;
      font-weight:600; z-index:1000; animation:toastIn 0.3s ease;
      font-family:'Outfit',sans-serif;
    `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // ── Bind All Button Events ─────────────────────────────
  function bindEvents() {

    // Menu buttons
    document.getElementById('btn-play')?.addEventListener('click', () => {
      Audio.click(); Audio.resume();
      // Go directly to the next unplayed level, or level select if all done
      const completed = Storage.countCompleted();
      const nextId = completed + 1 <= 100 ? completed + 1 : null;
      if (nextId) startLevel(nextId);
      else showScreen('levels');
    });

    document.getElementById('btn-level-select')?.addEventListener('click', () => { Audio.click(); showScreen('levels'); });
    document.getElementById('btn-daily')?.addEventListener('click', () => { Audio.click(); showScreen('daily'); });
    document.getElementById('btn-achievements')?.addEventListener('click', () => { Audio.click(); showScreen('achievements'); });
    document.getElementById('btn-shop')?.addEventListener('click', () => { Audio.click(); showScreen('shop'); });
    document.getElementById('btn-leaderboard')?.addEventListener('click', () => { Audio.click(); showScreen('leaderboard'); });
    document.getElementById('btn-settings')?.addEventListener('click', () => { Audio.click(); showScreen('settings'); });
    document.getElementById('btn-arcade')?.addEventListener('click', () => { Audio.click(); showScreen('arcade'); });
    document.getElementById('arcade-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });
    document.getElementById('btn-play-infinite')?.addEventListener('click', () => { Audio.click(); startInfiniteMode(); });
    document.getElementById('btn-play-ttt')?.addEventListener('click', () => { Audio.click(); showScreen('ttt'); });
    document.getElementById('ttt-back')?.addEventListener('click', () => { Audio.click(); showScreen('arcade'); });
    document.getElementById('lr-claim-btn')?.addEventListener('click', () => { Audio.click(); showScreen('daily'); });

    // Share button
    document.getElementById('btn-share')?.addEventListener('click', () => {
      Audio.click();
      const shareData = {
        title: 'Color Tube Master 3D 🧪',
        text: 'I\'m playing this awesome puzzle game! Can you beat my score? 🏆',
        url: 'https://color-tube-master.web.app'
      };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText('🧪 Play Color Tube Master 3D! https://color-tube-master.web.app')
          .then(() => showToast('🔗 Link copied! Share it with friends!'))
          .catch(() => showToast('Share: color-tube-master.web.app'));
      }
    });
    document.getElementById('btn-share-hero')?.addEventListener('click', () => {
      document.getElementById('btn-share')?.click();
    });

    // Win Screen Share button
    document.getElementById('win-share')?.addEventListener('click', () => {
      Audio.click();
      if (!lastWinData) return;

      const { levelData, moves, timeSec } = lastWinData;
      let text = '';
      if (levelData.isDaily) {
        text = `📅 I solved today's Daily Challenge in Color Tube Master 3D in ${moves} moves! Can you beat my score?`;
      } else if (levelData.isInfinite) {
        text = `🧪 I cleared a level in Infinite Mode in Color Tube Master 3D! Can you beat my score?`;
      } else {
        text = `🧪 I cleared Level ${levelData.id} (${levelData.difficulty}) in Color Tube Master 3D in ${moves} moves! Can you beat my score?`;
      }

      const shareData = {
        title: 'Color Tube Master 3D 🧪',
        text: text,
        url: 'https://color-tube-master.web.app'
      };

      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        navigator.clipboard.writeText(`${text} Play free at: https://color-tube-master.web.app`)
          .then(() => showToast('🔗 Score copied to clipboard! Share it!'))
          .catch(() => showToast('Failed to copy to clipboard'));
      }
    });

    // Leaderboard Share button
    document.getElementById('btn-share-lb')?.addEventListener('click', () => {
      Audio.click();
      const save = Storage.data();
      const xp = save.xp || 0;
      const rank = save.rank || 'Beginner';
      const text = `🏆 I'm playing Color Tube Master 3D! I've achieved the rank "${rank}" with ${xp} XP! Can you beat my rank?`;

      const shareData = {
        title: 'Color Tube Master 3D 🧪',
        text: text,
        url: 'https://color-tube-master.web.app'
      };

      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        navigator.clipboard.writeText(`${text} Play free at: https://color-tube-master.web.app`)
          .then(() => showToast('🔗 Rank copied to clipboard! Share it!'))
          .catch(() => showToast('Failed to copy to clipboard'));
      }
    });

    // Floating donate FAB + menu tile
    const donateFab   = document.getElementById('donate-fab');
    const donatePanel = document.getElementById('donate-panel');
    const donateClose = document.getElementById('donate-close');
    const openDonatePanel = () => {
      Audio.click();
      donatePanel.style.display = donatePanel.style.display === 'none' ? 'flex' : 'none';
    };
    donateFab?.addEventListener('click', openDonatePanel);
    document.getElementById('btn-donate')?.addEventListener('click', openDonatePanel);
    donateClose?.addEventListener('click', () => {
      Audio.click();
      donatePanel.style.display = 'none';
    });

    // Level select
    document.getElementById('levels-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });

    document.querySelectorAll('.diff-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Audio.click();
        document.querySelectorAll('.diff-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        refreshLevelGrid(tab.dataset.diff);
      });
    });

    // Back buttons
    document.getElementById('ach-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });
    document.getElementById('shop-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });
    document.getElementById('settings-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });
    document.getElementById('lb-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });
    document.getElementById('daily-back')?.addEventListener('click', () => { Audio.click(); showScreen('menu'); });

    // Shop tabs
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => { Audio.click(); refreshShop(tab.dataset.shop); });
    });

    // Leaderboard tabs
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => { Audio.click(); refreshLeaderboard(tab.dataset.lb); });
    });

    // Daily play
    document.getElementById('btn-play-daily')?.addEventListener('click', () => { Audio.click(); startDailyChallenge(); });

    // Game HUD
    document.getElementById('btn-game-menu')?.addEventListener('click', () => { Audio.click(); showPauseModal(); });
    document.getElementById('btn-undo')?.addEventListener('click', () => { Audio.click(); Game.undo(); });
    document.getElementById('btn-hint')?.addEventListener('click', () => {
      Audio.click();
      const hints = Storage.get('hintsRemaining') || 0;
      if (hints > 0) {
        Game.getHint();
      } else {
        AdsManager.showRewarded(
          '💡 Free Hint!',
          'Watch a short ad to get a free hint!',
          () => { Game.addHint(); Game.getHint(); }, // onReward
          null // onSkip
        );
      }
    });
    document.getElementById('btn-restart')?.addEventListener('click', () => { Audio.click(); Game.restart(); });

    // Auto-solve
    document.getElementById('btn-autosolve')?.addEventListener('click', () => {
      AdsManager.showRewarded(
        '🤖 Auto-Solve!',
        'Watch a short ad to let the AI solve this level for you!',
        async () => { await Game.autoSolve(); }, // onReward
        null // onSkip
      );
    });

    // Pause modal
    document.getElementById('pause-resume')?.addEventListener('click', () => { Audio.click(); hidePauseModal(); });
    document.getElementById('pause-restart')?.addEventListener('click', () => { Audio.click(); hidePauseModal(); Game.restart(); });
    document.getElementById('pause-levels')?.addEventListener('click', () => { Audio.click(); hidePauseModal(); showScreen('levels'); Audio.stopMusic(); });
    document.getElementById('pause-menu')?.addEventListener('click', () => { Audio.click(); hidePauseModal(); showScreen('menu'); Audio.stopMusic(); });

    // Ad modal
    document.getElementById('ad-confirm')?.addEventListener('click', () => { if (adCallback) adCallback(); else closeAdModal(); });
    document.getElementById('ad-cancel')?.addEventListener('click', () => { closeAdModal(); });

    // Login reward
    document.getElementById('rc-claim')?.addEventListener('click', () => {
      Audio.collect();
      document.getElementById('modal-login-reward').style.display = 'none';
    });

    // Any click to resume AudioContext
    document.addEventListener('click', () => Audio.resume(), { once: true });
  }

  return {
    showScreen, refreshMenu, startLevel, startDailyChallenge,
    startInfiniteMode, applyTheme, initSettings, showAdModal,
    closeAdModal, showLoginRewardModal, showPauseModal, hidePauseModal,
    showToast, bindEvents
  };
})();

window.UI = UI;
