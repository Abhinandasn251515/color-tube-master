/* ═══════════════════════════════════════════════════════════
   main.js — App Bootstrap with Auth Integration
═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  async function boot() {
    // 1. Load saved data
    Storage.load();

    // 2. Apply saved theme
    const theme = Storage.get('equippedTheme') || 'lab';
    document.body.classList.add(`theme-${theme}`);

    // 3. Init background particles & pour canvas
    Animations.initBg();
    Animations.initPour();

    // 4. Bind all UI events
    UI.bindEvents();
    UI.initSettings();
    TicTacToe3D.init();
    if (typeof MotionManager !== 'undefined') {
      MotionManager.init();
    } else {
      console.warn('[Main] MotionManager is not defined.');
    }
    if (typeof DuelsManager !== 'undefined') {
      DuelsManager.init();
    } else {
      console.warn('[Main] DuelsManager is not defined.');
    }

    // 5. Bind auth UI events
    AuthUI.bindEvents();

    // 6. Initialize Ads
    AdsManager.init();

    // 7. Splash screen animation
    await runSplash();

    // 7. Initialize Firebase Auth
    const firebaseOK = Auth.init();

    if (firebaseOK) {
      // Wait briefly for auth state to resolve (onAuthStateChanged fires quickly)
      await waitForAuthState();
    } else {
      // No Firebase config — go straight to menu as guest
      goToMenu(null);
    }
  }

  // ── Wait for Firebase auth state ─────────────────────
  function waitForAuthState() {
    return new Promise(resolve => {
      let resolved = false;

      // Timeout: if Firebase takes too long, show auth screen
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          showAuthScreen(resolve);
        }
      }, 3000);

      Auth.onAuthChanged(user => {
        if (resolved) {
          // Subsequent auth changes — update UI
          AuthUI.updateMenuAuthBadge(!!user, user);
          if (user) {
            LeaderboardService.subscribe(entries => {
              LeaderboardService.renderList(entries, 'lb-list');
            });
          }
          return;
        }

        clearTimeout(timeout);
        resolved = true;

        if (user) {
          // Already logged in — go to menu
          goToMenu(user);
          LeaderboardService.subscribe(entries => {
            LeaderboardService.renderList(entries, 'lb-list');
          });
          resolve();
        } else {
          // Not logged in — show auth screen
          showAuthScreen(resolve);
        }
      });
    });
  }

  // ── Show Auth Screen ──────────────────────────────────
  function showAuthScreen(resolve) {
    AuthUI.show(user => {
      goToMenu(user);
      if (user) {
        LeaderboardService.subscribe(entries => {
          LeaderboardService.renderList(entries, 'lb-list');
        });
      } else {
        // Guest — use local fake leaderboard
        const fakeEntries = Progression.getLeaderboard();
        LeaderboardService.renderList(fakeEntries, 'lb-list');
      }
      if (resolve) resolve();
    });
  }

  // ── Go to main menu ───────────────────────────────────
  function goToMenu(user) {
    const urlParams = new URLSearchParams(window.location.search);
    const customParam = urlParams.get('custom');
    if (customParam) {
      const customLevel = UI.parseCustomLevel(customParam);
      if (customLevel) {
        UI.startCustomLevel(customLevel);
        AuthUI.updateMenuAuthBadge(!!user, user);
        return;
      }
    }

    UI.showScreen('menu');

    // Update auth badge & player info
    AuthUI.updateMenuAuthBadge(!!user, user);

    if (user) {
      const name   = user.displayName || Storage.get('playerName') || 'Player';
      const avatar = Storage.get('playerAvatar') || '🧪';
      const nameEl   = document.getElementById('menu-player-name');
      const avatarEl = document.getElementById('menu-player-avatar');
      if (nameEl)   nameEl.textContent   = name;
      if (avatarEl) avatarEl.textContent = avatar;
    }

    // Wire avatar click to profile
    document.getElementById('menu-player-avatar')?.addEventListener('click', () => {
      Audio.click();
      AuthUI.showProfile();
    });

    // Sync + trigger ads on level win
    Game.onWin(async (result) => {
      UI.handleWin ? UI.handleWin(result) : null;
      // Trigger interstitial ad every 3 levels
      AdsManager.onLevelComplete();
      // Sync to Firestore after level complete
      if (Auth.isLoggedIn()) {
        setTimeout(() => Auth.syncProgress(), 1500);
      }
    });
  }

  // ── Splash Animation ──────────────────────────────────
  function runSplash() {
    return new Promise(resolve => {
      const fill  = document.getElementById('splash-fill');
      const label = document.querySelector('.splash-loading');
      const steps = ['Loading levels...', 'Preparing tubes...', 'Connecting...', 'Ready!'];
      let stepIdx = 0;
      let pct = 0;

      const interval = setInterval(() => {
        pct += 2.5 + Math.random() * 3;
        if (pct >= 100) pct = 100;

        if (fill) fill.style.width = pct + '%';

        const newStep = Math.floor((pct / 100) * steps.length);
        if (newStep > stepIdx && newStep < steps.length) {
          stepIdx = newStep;
          if (label) label.textContent = steps[stepIdx];
        }

        if (pct >= 100) {
          clearInterval(interval);
          setTimeout(resolve, 350);
        }
      }, 40);
    });
  }

  // ── Visibility change ─────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (window.Game && !Game.isWon()) Game.pause();
      Audio.stopMusic();
    } else {
      if (window.Game && !Game.isWon()) Game.resume();
      if (Storage.get('musicOn') !== false) Audio.startMusic();
    }
  });

  // ── Resize ────────────────────────────────────────────
  window.addEventListener('resize', () => {
    const bg = document.getElementById('bg-canvas');
    if (bg) { bg.width = window.innerWidth; bg.height = window.innerHeight; }
  });

  // ── Prevent default touch gestures (game screen only) ───
  document.addEventListener('touchmove', e => {
    // Only block touchmove during the tube-sorting game to prevent scroll
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'screen-game') {
      e.preventDefault();
    }
  }, { passive: false });

  // ── Resume audio on first interaction ────────────────
  document.addEventListener('click', () => Audio.resume(), { once: true });

  // ── Boot ─────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
