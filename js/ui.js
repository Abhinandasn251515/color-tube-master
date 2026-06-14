/* ═══════════════════════════════════════════════════════════
   ui.js — UI Controller (Screens, Menus, Modals, Shop)
═══════════════════════════════════════════════════════════ */

const UI = (() => {

  let currentScreen = 'splash';
  let adCallback    = null;
  let adTimerInt    = null;
  let lastWinData   = null;

  let activePaintColor = 'red';
  let customTubes = [
    ['red', 'red', 'blue', 'blue'],
    ['blue', 'blue', 'red', 'red'],
    [],
    []
  ];
  let activeChallenge = null;

  const EMOJI_MAP = {
    red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡',
    purple: '🟣', orange: '🟠', pink: '🌸', cyan: '🔷',
    lime: '🍏', brown: '🟤', teal: '💠', maroon: '🟥',
    navy: '🟦', indigo: '🌌', white: '⚪'
  };

  function getColorHex(color) {
    const map = {
      red: '#ff5070', blue: '#60aaff', green: '#34d990', yellow: '#fde047',
      purple: '#c084fc', orange: '#fb923c', pink: '#f472b6', cyan: '#22d3ee',
      lime: '#a3e635', brown: '#d97706', teal: '#2dd4bf', maroon: '#f43f5e',
      navy: '#3b82f6', indigo: '#818cf8', white: '#e2e8f0'
    };
    return map[color] || '#ffffff';
  }

  // ── Screen Navigation ──────────────────────────────────
  function showScreen(id, animate = true) {
    if (id !== 'game' && typeof DuelsManager !== 'undefined') {
      DuelsManager.stopDuel();
    }

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
    if (id === 'editor') initEditor();
    if (id === 'rewards') {
      const codeDisplay = document.getElementById('referral-code-display');
      if (codeDisplay) codeDisplay.textContent = Storage.get('referralCode') || 'CTM-XXXXXX';
      const msg = document.getElementById('redeem-message');
      if (msg) msg.textContent = '';
      const input = document.getElementById('promo-code-input');
      if (input) input.value = '';
    }
    if (id === 'duels' && typeof DuelsManager !== 'undefined') {
      const select = document.getElementById('duel-level-select');
      if (select) {
        DuelsManager.loadChallengers(parseInt(select.value));
      }
    }
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

    activeChallenge = null;
    const chalHud = document.getElementById('challenge-hud');
    if (chalHud) chalHud.style.display = 'none';

    showScreen('game');
    Animations.stopConfetti();

    Game.onWin(handleWin);
    Game.loadLevel(levelData);

    Audio.startMusic();
  }

  function startDailyChallenge() {
    activeChallenge = null;
    const chalHud = document.getElementById('challenge-hud');
    if (chalHud) chalHud.style.display = 'none';

    const dailyLevel = Levels.getDailyChallenge();
    showScreen('game');
    Game.onWin(handleWin);
    Game.loadLevel(dailyLevel);
    Audio.startMusic();
  }

  function startInfiniteMode() {
    activeChallenge = null;
    const chalHud = document.getElementById('challenge-hud');
    if (chalHud) chalHud.style.display = 'none';

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

    // Hide active challenge HUD banner on win screen
    const chalHud = document.getElementById('challenge-hud');
    if (chalHud) chalHud.style.display = 'none';

    // Verify speedrun challenge results
    const statusEl = document.getElementById('win-challenge-status');
    if (statusEl) {
      if (activeChallenge) {
        const beaten = moves < activeChallenge.recordMoves || (moves === activeChallenge.recordMoves && timeSec < activeChallenge.recordTime);
        lastWinData.challenge = activeChallenge;
        lastWinData.challengeBeaten = beaten;

        statusEl.className = 'win-challenge-status ' + (beaten ? 'challenge-beaten' : 'challenge-missed');
        statusEl.textContent = beaten ? '🔥 Challenge Beaten!' : `❌ Beat: ${activeChallenge.recordMoves} Moves`;
        statusEl.style.display = 'inline-block';
      } else {
        statusEl.style.display = 'none';
      }
    }

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

    const pushToggle = document.getElementById('toggle-push');
    if (pushToggle) {
      pushToggle.checked = !!save.pushNotificationsEnabled;
      pushToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        if (enabled) {
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              Storage.set('pushNotificationsEnabled', true);
              showToast('🚀 Notifications enabled!');
              
              if ('serviceWorker' in navigator) {
                try {
                  const reg = await navigator.serviceWorker.ready;
                  reg.showNotification('🧪 Color Tube Master 3D', {
                    body: "Notifications are successfully activated! You'll receive daily challenge updates. 🏆",
                    icon: '/icons/icon-192.png',
                    vibrate: [100, 50, 100],
                    tag: 'ctm3d-welcome'
                  });

                  if (reg.pushManager) {
                    let sub = await reg.pushManager.getSubscription();
                    if (!sub) {
                      const pubKey = 'BEl6tzScwT0c20g9iZpxj59x7r6a7p208g9x7r6a7p208g9x7';
                      sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: pubKey
                      }).catch(() => null);
                    }
                    if (sub) {
                      console.log('[Push API] Native subscription active:', JSON.stringify(sub));
                      Storage.set('pushSubscription', JSON.stringify(sub));
                    }
                  }
                } catch (err) {
                  console.warn('[Push API] Notification setup warning:', err);
                }
              }
            } else {
              Storage.set('pushNotificationsEnabled', false);
              pushToggle.checked = false;
              showToast('❌ Notification permission denied.');
            }
          } else {
            showToast('⚠️ Notifications not supported on this browser.');
            pushToggle.checked = false;
          }
        } else {
          Storage.set('pushNotificationsEnabled', false);
          showToast('Notifications deactivated.');
        }
      });
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

  function initEditor() {
    const palette = document.getElementById('editor-palette');
    if (!palette) return;
    palette.innerHTML = '';

    Levels.COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = `swatch ${color === activePaintColor ? 'active' : ''}`;
      swatch.style.backgroundColor = getColorHex(color);
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => {
        Audio.click();
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        activePaintColor = color;
      });
      palette.appendChild(swatch);
    });

    const eraser = document.createElement('div');
    eraser.className = `swatch eraser-swatch ${activePaintColor === 'eraser' ? 'active' : ''}`;
    eraser.innerHTML = '❌';
    eraser.dataset.color = 'eraser';
    eraser.title = 'Eraser';
    eraser.addEventListener('click', () => {
      Audio.click();
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      eraser.classList.add('active');
      activePaintColor = 'eraser';
    });
    palette.appendChild(eraser);

    renderEditorTubes();
  }

  function renderEditorTubes() {
    const grid = document.getElementById('editor-tubes-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const skin = Storage.get('equippedSkin') || 'default';
    const skinClass = skin !== 'default' ? `skin-${skin}` : '';

    customTubes.forEach((tube, idx) => {
      const wrap = Renderer.buildTubeHTML(tube, idx, 'sz-md', skinClass);
      
      wrap.addEventListener('click', () => {
        Audio.click();
        if (activePaintColor === 'eraser') {
          if (tube.length > 0) {
            tube.pop();
            renderEditorTubes();
          }
        } else {
          if (tube.length < 4) {
            tube.push(activePaintColor);
            renderEditorTubes();
          } else {
            showToast('Tube is full!');
          }
        }
      });

      grid.appendChild(wrap);
    });
  }

  function serializeCustomLevel(tubes) {
    return tubes.map(tube => {
      return tube.map(color => {
        const idx = Levels.COLORS.indexOf(color);
        return idx >= 0 ? idx.toString(16) : '';
      }).join('');
    }).join('-');
  }

  function parseCustomLevel(queryStr) {
    try {
      const tubeStrings = queryStr.split('-');
      const tubes = [];
      for (const s of tubeStrings) {
        const tube = [];
        for (let i = 0; i < s.length; i++) {
          const char = s[i];
          const colorIdx = parseInt(char, 16);
          if (colorIdx >= 0 && colorIdx < Levels.COLORS.length) {
            tube.push(Levels.COLORS[colorIdx]);
          }
        }
        tubes.push(tube);
      }
      if (tubes.length < 3) return null;
      return {
        id: 'custom',
        difficulty: 'medium',
        tubes: tubes,
        emptyTubes: tubes.filter(t => t.length === 0).length,
        colors: tubes.flat().filter((v, i, a) => a.indexOf(v) === i).length,
        isCustom: true
      };
    } catch (e) {
      console.error('Failed to parse custom level:', e);
      return null;
    }
  }

  function startCustomLevel(levelData) {
    if (!levelData) return;
    showScreen('game');
    Animations.stopConfetti();
    Game.onWin(handleWin);
    Game.loadLevel(levelData);
    Audio.startMusic();

    const chalHud = document.getElementById('challenge-hud');
    const chalText = document.getElementById('challenge-text');
    if (levelData.challenge) {
      activeChallenge = levelData.challenge;
      if (chalHud && chalText) {
        chalText.textContent = `Beat ${activeChallenge.creator}'s record: ${activeChallenge.recordMoves} Moves | ${Utils.formatTime(activeChallenge.recordTime)}`;
        chalHud.style.display = 'flex';
      }
    } else {
      activeChallenge = null;
      if (chalHud) chalHud.style.display = 'none';
    }
  }

  function compileEmojiPuzzle(tubes) {
    let result = '';
    tubes.forEach((tube, i) => {
      const emojis = tube.map(color => EMOJI_MAP[color] || '❓').join('');
      result += `🧪 [${emojis}]\n`;
    });
    return result;
  }

  function adjustBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  function drawCanvasTube(ctx, x, y, w, h, colors) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h - w/2);
    ctx.arc(x + w/2, y + h - w/2, w/2, Math.PI, 0, false);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    
    ctx.fillStyle = 'rgba(30, 27, 75, 0.5)';
    ctx.fill();
    
    ctx.save();
    ctx.clip();
    
    const maxLayers = 4;
    const layerH = (h - w/2) / maxLayers;
    
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const colorHex = getColorHex(color);
      ctx.fillStyle = colorHex;
      
      const ly = y + h - w/2 - (i + 1) * layerH;
      ctx.fillRect(x, ly, w, layerH);
      
      ctx.fillStyle = adjustBrightness(colorHex, 20);
      ctx.beginPath();
      ctx.ellipse(x + w/2, ly, w/2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h - w/2);
    ctx.arc(x + w/2, y + h - w/2, w/2, Math.PI, 0, false);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(x + w/2, y, w/2 + 3, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 10);
    ctx.lineTo(x + 5, y + h - w/2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    
    ctx.restore();
  }

  function generateShareCard(levelData, moves, timeSec, starsCount) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      const bgGrad = ctx.createLinearGradient(0, 0, 800, 600);
      bgGrad.addColorStop(0, '#0a051b');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#02000a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 600);

      ctx.beginPath();
      ctx.arc(150, 150, 250, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124, 58, 237, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(650, 450, 200, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(219, 39, 119, 0.12)';
      ctx.fill();

      ctx.save();
      ctx.fillStyle = 'rgba(15, 12, 41, 0.6)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 3;
      
      function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
      
      roundRect(40, 40, 720, 520, 24);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 32px 'Outfit', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText("COLOR TUBE MASTER 3D", 400, 100);

      ctx.fillStyle = '#a78bfa';
      ctx.font = "bold 13px 'Outfit', sans-serif";
      ctx.fillText("THE ULTIMATE SORTING PUZZLE", 400, 125);

      const lineGrad = ctx.createLinearGradient(150, 0, 650, 0);
      lineGrad.addColorStop(0, 'rgba(0, 255, 204, 0)');
      lineGrad.addColorStop(0.5, '#00ffcc');
      lineGrad.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(150, 140, 500, 2);

      const isChallenge = lastWinData && lastWinData.challenge;
      const challengeBeaten = lastWinData && lastWinData.challengeBeaten;

      if (isChallenge) {
        ctx.fillStyle = challengeBeaten ? '#fbbf24' : '#ffffff';
        ctx.font = "900 44px 'Fredoka One', sans-serif";
        ctx.fillText(challengeBeaten ? "CHALLENGE BEATEN!" : "CHALLENGE PLAYED", 400, 210);

        ctx.fillStyle = '#f59e0b';
        ctx.font = "40px sans-serif";
        const starText = '⭐'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
        ctx.fillText(starText, 400, 265);

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1.5;
        roundRect(75, 300, 280, 200, 16);
        ctx.fill();
        ctx.stroke();

        roundRect(445, 300, 280, 200, 16);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const chal = lastWinData.challenge;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.fillText("CREATOR", 105, 345);
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(chal.creator, 105, 370);

        ctx.fillStyle = '#94a3b8';
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.fillText("RECORD TO BEAT", 105, 420);
        ctx.fillStyle = '#ef4444';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(`${chal.recordMoves} Moves`, 105, 445);
        ctx.font = "16px 'Outfit', sans-serif";
        ctx.fillText(Utils.formatTime(chal.recordTime), 105, 475);

        ctx.fillText("YOU", 475, 345);
        ctx.fillStyle = challengeBeaten ? '#fbbf24' : '#ffffff';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(Storage.get('playerName') || 'You', 475, 370);

        ctx.fillStyle = '#94a3b8';
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.fillText("YOUR SCORE", 475, 420);
        ctx.fillStyle = '#10b981';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(`${moves} Moves`, 475, 445);
        ctx.font = "16px 'Outfit', sans-serif";
        ctx.fillText(Utils.formatTime(timeSec), 475, 475);

        ctx.save();
        ctx.beginPath();
        ctx.arc(400, 400, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = "bold 18px 'Outfit', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText("VS", 400, 406);
        ctx.restore();

        drawCanvasTube(ctx, 375, 470, 25, 70, ['red', 'blue']);
        drawCanvasTube(ctx, 405, 470, 25, 70, ['blue', 'red']);
      } else {
        ctx.fillStyle = levelData.isDaily ? '#ec4899' : '#10b981';
        ctx.font = "900 48px 'Fredoka One', sans-serif";
        ctx.fillText(levelData.isDaily ? "DAILY CLEAR!" : "LEVEL CLEAR!", 400, 210);

        ctx.fillStyle = '#f59e0b';
        ctx.font = "40px sans-serif";
        const starText = '⭐'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
        ctx.fillText(starText, 400, 260);

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1.5;
        roundRect(100, 300, 280, 200, 16);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = "14px 'Outfit', sans-serif";
        
        let levelNameText = `Level ${levelData.id}`;
        if (levelData.isDaily) levelNameText = "Daily Challenge";
        if (levelData.isInfinite) levelNameText = "Infinite Mode";

        ctx.fillText("LEVEL", 130, 345);
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(levelNameText, 130, 370);

        ctx.fillStyle = '#94a3b8';
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.fillText("MOVES TAKEN", 130, 420);
        ctx.fillStyle = '#38bdf8';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(`${moves} Moves`, 130, 445);

        ctx.fillStyle = '#94a3b8';
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.fillText("TIME SPENT", 130, 495);
        ctx.fillStyle = '#2dd4bf';
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.fillText(Utils.formatTime(timeSec), 130, 520);

        const colors1 = ['red', 'blue', 'green', 'yellow'];
        const colors2 = ['green', 'yellow', 'red', 'blue'];
        const colors3 = [];
        drawCanvasTube(ctx, 450, 320, 45, 140, colors1);
        drawCanvasTube(ctx, 520, 320, 45, 140, colors2);
        drawCanvasTube(ctx, 590, 320, 45, 140, colors3);
      }

      const logoImg = new Image();
      logoImg.src = 'icons/icon-192.png';
      logoImg.onload = () => {
        ctx.drawImage(logoImg, 670, 470, 64, 64);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = "10px 'Outfit', sans-serif";
        ctx.fillText("SCAN OR PLAY AT", 655, 500);
        ctx.fillStyle = '#00ffcc';
        ctx.font = "bold 11px 'Outfit', sans-serif";
        ctx.fillText("COLOR TUBE MASTER 3D", 655, 515);

        resolve(canvas);
      };
      logoImg.onerror = () => {
        resolve(canvas);
      };
    });
  }

  function downloadCanvasImage(canvas, id) {
    const link = document.createElement('a');
    link.download = `ctm-victory-level-${id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function showQRShareModal(urlOrLevelId) {
    const modal = document.getElementById('qr-share-modal');
    const qrImg = document.getElementById('qr-share-img');
    const qrUrl = document.getElementById('qr-share-url');

    if (!modal || !qrImg || !qrUrl) return;

    let shareUrl = '';
    if (typeof urlOrLevelId === 'string' && urlOrLevelId.startsWith('http')) {
      shareUrl = urlOrLevelId;
    } else {
      const base = window.location.origin + window.location.pathname;
      shareUrl = `${base}?level=${urlOrLevelId || 1}`;
    }
    qrUrl.value = shareUrl;

    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
    modal.style.display = 'flex';
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
        const completed = Storage.countCompleted();
        showQRShareModal(completed + 1 <= 100 ? completed + 1 : 1);
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
      let shareUrl = window.location.origin + window.location.pathname;
      const emojiPuzzle = compileEmojiPuzzle(levelData.tubes);
      const creatorName = encodeURIComponent(Storage.get('playerName') || 'Friend');

      if (levelData.isCustom) {
        const code = serializeCustomLevel(levelData.tubes);
        
        if (lastWinData.challenge) {
          const chal = lastWinData.challenge;
          shareUrl = `${shareUrl}?custom=${code}&recordMoves=${chal.recordMoves}&recordTime=${chal.recordTime}&creator=${encodeURIComponent(chal.creator)}`;
          if (lastWinData.challengeBeaten) {
            text = `🔥 I BEAT ${chal.creator}'s Speedrun Challenge in Color Tube Master 3D! I solved it in ${moves} moves (their record: ${chal.recordMoves} moves). Can you do better?\n\n${emojiPuzzle}\nPlay challenge:`;
          } else {
            text = `🧪 I played ${chal.creator}'s Speedrun Challenge in Color Tube Master 3D! My score: ${moves} moves (target: ${chal.recordMoves}). Can you beat it?\n\n${emojiPuzzle}\nPlay challenge:`;
          }
        } else {
          shareUrl = `${shareUrl}?custom=${code}&recordMoves=${moves}&recordTime=${timeSec}&creator=${creatorName}`;
          text = `🧪 I cleared my Custom Level in Color Tube Master 3D in ${moves} moves! Can you beat my Speedrun Challenge? 🏆\n\n${emojiPuzzle}\nPlay challenge:`;
        }
      } else if (levelData.isDaily) {
        shareUrl = `${shareUrl}?daily=true`;
        text = `📅 I solved today's Daily Challenge in Color Tube Master 3D in ${moves} moves! Can you beat my score? 🏆\n\n${emojiPuzzle}\nPlay daily challenge:`;
      } else if (levelData.isInfinite) {
        text = `🧪 I cleared an Infinite Mode level in Color Tube Master 3D in ${moves} moves!\n\n${emojiPuzzle}\nPlay here:`;
      } else {
        shareUrl = `${shareUrl}?level=${levelData.id}`;
        text = `🧪 I cleared Level ${levelData.id} (${levelData.difficulty}) in Color Tube Master 3D in ${moves} moves! Can you beat my score? 🏆\n\n${emojiPuzzle}\nPlay here:`;
      }

      const shareData = {
        title: 'Color Tube Master 3D 🧪',
        text: text,
        url: shareUrl
      };

      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        showQRShareModal(shareUrl);
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
        const completed = Storage.countCompleted();
        showQRShareModal(completed + 1 <= 100 ? completed + 1 : 1);
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

    // QR Share Modal buttons
    document.getElementById('btn-qr-close')?.addEventListener('click', () => {
      Audio.click();
      document.getElementById('qr-share-modal').style.display = 'none';
    });

    document.getElementById('btn-qr-copy')?.addEventListener('click', () => {
      Audio.click();
      const qrUrlInput = document.getElementById('qr-share-url');
      if (qrUrlInput) {
        qrUrlInput.select();
        qrUrlInput.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(qrUrlInput.value)
          .then(() => showToast('🔗 Share URL copied!'))
          .catch(() => showToast('Failed to copy.'));
      }
    });

    // Custom Level Editor listeners
    document.getElementById('btn-play-editor')?.addEventListener('click', () => {
      Audio.click();
      showScreen('editor');
    });
    document.getElementById('editor-back')?.addEventListener('click', () => {
      Audio.click();
      showScreen('arcade');
    });
    document.getElementById('editor-btn-add-tube')?.addEventListener('click', () => {
      Audio.click();
      if (customTubes.length < 12) {
        customTubes.push([]);
        renderEditorTubes();
      } else {
        showToast('Max 12 tubes allowed!');
      }
    });
    document.getElementById('editor-btn-remove-tube')?.addEventListener('click', () => {
      Audio.click();
      if (customTubes.length > 3) {
        customTubes.pop();
        renderEditorTubes();
      } else {
        showToast('Min 3 tubes required!');
      }
    });
    document.getElementById('editor-btn-clear')?.addEventListener('click', () => {
      Audio.click();
      customTubes = customTubes.map(() => []);
      renderEditorTubes();
    });
    document.getElementById('editor-btn-test')?.addEventListener('click', () => {
      Audio.click();
      
      const colorCounts = {};
      let totalLayers = 0;
      for (const tube of customTubes) {
        for (const color of tube) {
          colorCounts[color] = (colorCounts[color] || 0) + 1;
          totalLayers++;
        }
      }
      if (totalLayers === 0) {
        showToast('⚠️ Draw some colors first!');
        return;
      }
      
      const emptyCount = customTubes.filter(t => t.length === 0).length;
      if (emptyCount === 0) {
        showToast('⚠️ Add at least one empty tube!');
        return;
      }

      const solvable = Solver.isSolvable(customTubes);
      if (!solvable) {
        showToast('⚠️ Warning: This board has no valid solution!');
      }

      const levelData = {
        id: 'custom',
        difficulty: 'medium',
        tubes: Utils.cloneState(customTubes),
        emptyTubes: emptyCount,
        colors: Object.keys(colorCounts).length,
        isCustom: true
      };
      startCustomLevel(levelData);
    });

    document.getElementById('editor-btn-share')?.addEventListener('click', () => {
      Audio.click();
      
      const colorCounts = {};
      let totalLayers = 0;
      for (const tube of customTubes) {
        for (const color of tube) {
          colorCounts[color] = (colorCounts[color] || 0) + 1;
          totalLayers++;
        }
      }
      if (totalLayers === 0) {
        showToast('⚠️ Paint some colors first!');
        return;
      }

      for (const [color, count] of Object.entries(colorCounts)) {
        if (count % 4 !== 0) {
          showToast(`⚠️ Each color must have exactly 4 layers! ${color} has ${count}.`);
          return;
        }
      }

      const emptyCount = customTubes.filter(t => t.length === 0).length;
      if (emptyCount === 0) {
        showToast('⚠️ Add at least one empty tube!');
        return;
      }

      const solvable = Solver.isSolvable(customTubes);
      if (!solvable) {
        showToast('⚠️ This board is not solvable! Adjust layers.');
        return;
      }

      const code = serializeCustomLevel(customTubes);
      const base = window.location.origin + window.location.pathname;
      const shareUrl = `${base}?custom=${code}`;
      const emojiPuzzle = compileEmojiPuzzle(customTubes);

      const shareText = `🧪 Challenge! Can you solve my custom level in Color Tube Master 3D?\n\n${emojiPuzzle}\nPlay here: ${shareUrl}`;

      navigator.clipboard.writeText(shareText)
        .then(() => {
          showToast('🔗 Custom level copied to clipboard!');
          showQRShareModal(shareUrl);
        })
        .catch(() => {
          showToast('Failed to copy. Sharing QR...');
          showQRShareModal(shareUrl);
        });
    });

    // Rewards & Referral screen listeners
    document.getElementById('btn-open-rewards')?.addEventListener('click', () => {
      Audio.click();
      showScreen('rewards');
    });
    document.getElementById('rewards-back')?.addEventListener('click', () => {
      Audio.click();
      showScreen('settings');
    });
    document.getElementById('btn-copy-referral')?.addEventListener('click', () => {
      Audio.click();
      const refCode = Storage.get('referralCode');
      if (refCode) {
        navigator.clipboard.writeText(refCode)
          .then(() => showToast('📋 Referral code copied!'))
          .catch(() => showToast('Failed to copy code.'));
      }
    });
    document.getElementById('btn-redeem-code')?.addEventListener('click', () => {
      Audio.click();
      const input = document.getElementById('promo-code-input');
      const msg = document.getElementById('redeem-message');
      if (!input || !msg) return;

      const result = Progression.claimPromoCode(input.value);
      if (result.success) {
        msg.style.color = '#10b981';
        msg.textContent = result.message;
        input.value = '';
        showToast('🎁 Reward Claimed!');
        refreshMenu();
      } else {
        msg.style.color = '#ef4444';
        msg.textContent = result.message;
      }
    });

    // Canvas Brag Card listener on Win Screen
    document.getElementById('win-share-card')?.addEventListener('click', () => {
      Audio.click();
      if (!lastWinData) return;
      
      showToast('Generating share card...');
      const { levelData, moves, timeSec } = lastWinData;
      const starsCount = Levels.calcStars(levelData.id, moves, timeSec);

      generateShareCard(levelData, moves, timeSec, starsCount).then(canvas => {
        canvas.toBlob((blob) => {
          if (!blob) {
            showToast('Generation failed.');
            return;
          }
          const file = new File([blob], `ctm-clear-level-${levelData.id || 'custom'}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: 'Color Tube Master 3D Victory!',
              text: `I cleared this puzzle! Can you beat my score?`
            }).catch(err => {
              console.log('Share failed, downloading instead:', err);
              downloadCanvasImage(canvas, levelData.id || 'custom');
            });
          } else {
            downloadCanvasImage(canvas, levelData.id || 'custom');
          }
        }, 'image/png');
      });
    });

    // Any click to resume AudioContext
    document.addEventListener('click', () => Audio.resume(), { once: true });
  }

  return {
    showScreen, refreshMenu, startLevel, startDailyChallenge,
    startInfiniteMode, applyTheme, initSettings, showAdModal,
    closeAdModal, showLoginRewardModal, showPauseModal, hidePauseModal,
    showToast, showQRShareModal, bindEvents,
    parseCustomLevel, startCustomLevel
  };
})();

window.UI = UI;
