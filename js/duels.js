/* ═══════════════════════════════════════════════════════════
   duels.js — Asynchronous Ghost Duels Multiplayer
   Allows recording player paths and playing back competitors' runs
 ═══════════════════════════════════════════════════════════ */

const DuelsManager = (() => {
  let isDuelActive = false;
  let movesRecord = [];
  let duelStartTime = 0;
  let ghostRun = null;          // { username, moves, timeSec, path: [{from, to, time}] }
  let ghostTubes = [];
  let ghostTimer = null;
  let ghostCurrentMoveIdx = 0;
  let ghostElapsed = 0;
  let lastTickTime = 0;

  function init() {
    // 1. Play Button on Arcade Screen
    const btnPlayDuels = document.getElementById('btn-play-duels');
    if (btnPlayDuels) {
      btnPlayDuels.addEventListener('click', () => {
        Audio.click();
        UI.showScreen('duels');
      });
    }

    // 2. Back Button on Duels Matchmaking Screen
    const duelsBack = document.getElementById('duels-back');
    if (duelsBack) {
      duelsBack.addEventListener('click', () => {
        Audio.click();
        UI.showScreen('arcade');
      });
    }

    // 3. Level Select Dropdown on Duels Screen
    const levelSelect = document.getElementById('duel-level-select');
    if (levelSelect) {
      levelSelect.addEventListener('change', () => {
        Audio.click();
        loadChallengers(parseInt(levelSelect.value));
      });
    }

    // 4. Register game engine hooks
    Game.onPour((from, to) => {
      if (!isDuelActive) return;
      const elapsed = (Date.now() - duelStartTime) / 1000;
      movesRecord.push({ from, to, time: parseFloat(elapsed.toFixed(2)) });
    });

    Game.onUndo(() => {
      if (!isDuelActive) return;
      movesRecord.pop();
    });

    Game.onWin((winData) => {
      if (!isDuelActive) return;
      handleDuelEnd(winData);
    });
  }

  // ── Load Opponents/Challengers ──────────────────────────
  async function loadChallengers(levelId) {
    const listContainer = document.getElementById('duels-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="duels-loading">Loading challengers...</div>';

    const db = Auth.getDb();
    let runs = [];

    if (db) {
      try {
        const snapshot = await db.collection('duel_runs')
          .where('levelId', '==', levelId)
          .orderBy('timeSec', 'asc')
          .limit(10)
          .get();
        
        snapshot.forEach(doc => {
          runs.push({ id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.warn('[Duels] Firestore read error, falling back to local/mock runs:', err);
      }
    }

    // Fallback/offline mock runs if no network or no records
    if (runs.length === 0) {
      runs = getMockRuns(levelId);
    }

    listContainer.innerHTML = '';
    runs.forEach(run => {
      const item = document.createElement('div');
      item.className = 'duel-list-item';
      
      const info = document.createElement('div');
      info.className = 'duel-item-info';
      info.innerHTML = `
        <div class="duel-player-name">👻 ${Utils.escapeHTML(run.username || 'Ghost Runner')}</div>
        <div class="duel-player-stats">${run.moves} moves • ${run.timeSec}s</div>
      `;

      const btn = document.createElement('button');
      btn.className = 'btn-duel-challenge';
      btn.textContent = 'Challenge';
      btn.addEventListener('click', () => {
        Audio.click();
        startDuel(run, levelId);
      });

      item.appendChild(info);
      item.appendChild(btn);
      listContainer.appendChild(item);
    });
  }

  // ── Start Duel ─────────────────────────────────────────
  function startDuel(opponentRun, levelId) {
    isDuelActive = true;
    ghostRun = opponentRun;
    movesRecord = [];
    duelStartTime = Date.now();
    ghostCurrentMoveIdx = 0;
    ghostElapsed = 0;
    lastTickTime = Date.now();

    // Fetch level details
    const levelData = Levels.get(levelId);
    if (!levelData) {
      showToast('❌ Failed to load level data!');
      return;
    }

    // Set split-screen layout
    const gameArea = document.getElementById('game-area');
    const mainBoardWrapper = document.getElementById('main-board-wrapper');
    const ghostBoardWrapper = document.getElementById('ghost-board-wrapper');
    const mainBoardLabel = document.getElementById('main-board-label');
    const ghostBoardLabel = document.getElementById('ghost-board-label');

    if (gameArea) gameArea.classList.add('duel-active');
    if (mainBoardWrapper) mainBoardWrapper.classList.add('duel-board');
    if (ghostBoardWrapper) {
      ghostBoardWrapper.style.display = 'flex';
      ghostBoardWrapper.classList.add('duel-board');
    }
    if (mainBoardLabel) mainBoardLabel.style.display = 'block';
    if (ghostBoardLabel) {
      ghostBoardLabel.textContent = `Ghost (${opponentRun.username || 'Opponent'})`;
    }

    // Load main board game
    Game.loadLevel(levelData);

    // Load ghost board state
    ghostTubes = Utils.cloneState(levelData.tubes);
    renderGhostTubes(ghostTubes, Game.getState().tubeSize);

    // Start playback timer
    if (ghostTimer) clearInterval(ghostTimer);
    ghostTimer = setInterval(updateGhostPlayback, 100);

    // Go to game screen
    UI.showScreen('game');
    showToast(`🏁 Duel Started vs ${opponentRun.username}! Go!`);
  }

  // ── Stop Duel / Cleanup ────────────────────────────────
  function stopDuel() {
    isDuelActive = false;
    ghostRun = null;
    if (ghostTimer) {
      clearInterval(ghostTimer);
      ghostTimer = null;
    }

    const gameArea = document.getElementById('game-area');
    const mainBoardWrapper = document.getElementById('main-board-wrapper');
    const ghostBoardWrapper = document.getElementById('ghost-board-wrapper');
    const mainBoardLabel = document.getElementById('main-board-label');

    if (gameArea) gameArea.classList.remove('duel-active');
    if (mainBoardWrapper) mainBoardWrapper.classList.remove('duel-board');
    if (ghostBoardWrapper) {
      ghostBoardWrapper.style.display = 'none';
      ghostBoardWrapper.classList.remove('duel-board');
    }
    if (mainBoardLabel) mainBoardLabel.style.display = 'none';
  }

  // ── Ghost Playback Loop ────────────────────────────────
  function updateGhostPlayback() {
    const now = Date.now();
    const delta = (now - lastTickTime) / 1000;
    lastTickTime = now;

    if (Game.getState().isPaused || Game.getState().phase === 'WIN') {
      return;
    }

    ghostElapsed += delta;

    while (ghostCurrentMoveIdx < ghostRun.path.length) {
      const nextMove = ghostRun.path[ghostCurrentMoveIdx];
      if (ghostElapsed >= nextMove.time) {
        executeGhostMove(nextMove.from, nextMove.to);
        ghostCurrentMoveIdx++;
      } else {
        break;
      }
    }

    if (ghostCurrentMoveIdx >= ghostRun.path.length) {
      clearInterval(ghostTimer);
      ghostTimer = null;
      showToast(`👻 Ghost (${ghostRun.username}) finished in ${ghostRun.timeSec}s!`);
    }
  }

  function executeGhostMove(from, to) {
    const filters = Game.getState().levelData ? Game.getState().levelData.filters : [];
    
    // Animate source/target tubes slightly
    const container = document.getElementById('ghost-tubes-container');
    if (container) {
      const fromEl = container.children[from];
      const toEl = container.children[to];
      if (fromEl && toEl) {
        fromEl.classList.add('ghost-pouring');
        toEl.classList.add('ghost-receiving');
        setTimeout(() => {
          fromEl.classList.remove('ghost-pouring');
          toEl.classList.remove('ghost-receiving');
        }, 400);
      }
    }

    Solver.pour(ghostTubes, from, to, filters);
    updateGhostTube(from, ghostTubes[from]);
    updateGhostTube(to, ghostTubes[to]);
  }

  // ── Render Ghost Tubes ─────────────────────────────────
  function renderGhostTubes(tubes, size) {
    const container = document.getElementById('ghost-tubes-container');
    if (!container) return;
    container.innerHTML = '';
    
    const filters = Game.getState().levelData ? Game.getState().levelData.filters : [];
    const skin = Storage.get('equippedSkin') || 'default';
    const skinClass = skin !== 'default' ? `skin-${skin}` : '';

    tubes.forEach((tube, idx) => {
      const isFilter = filters && filters.includes(idx);
      const wrap = Renderer.buildTubeHTML(tube, idx, size, skinClass, isFilter);
      container.appendChild(wrap);
    });
  }

  // ── Update Single Ghost Tube ───────────────────────────
  function updateGhostTube(idx, tube) {
    const container = document.getElementById('ghost-tubes-container');
    if (!container) return;
    const wrap = container.children[idx];
    if (!wrap) return;

    const liquids  = wrap.querySelector('.tube-liquids');
    const baseFill = wrap.querySelector('.tube-base-fill');
    if (!liquids) return;

    liquids.innerHTML = '';
    for (let i = 0; i < tube.length; i++) {
      const layer = document.createElement('div');
      layer.className = 'liquid-layer';
      layer.dataset.color = tube[i];
      if (i === tube.length - 1) layer.classList.add('top-layer');
      liquids.appendChild(layer);
    }

    if (baseFill) {
      if (tube.length > 0) {
        baseFill.dataset.color = tube[0];
        baseFill.style.opacity = '1';
      } else {
        baseFill.removeAttribute('data-color');
        baseFill.style.opacity = '0';
      }
    }
  }

  // ── Handle End of Duel ──────────────────────────────────
  async function handleDuelEnd(winData) {
    const playerTime = winData.timeSec;
    const playerMoves = winData.moves;
    const ghostTime = ghostRun.timeSec;

    let beatGhost = false;
    if (playerMoves < ghostRun.moves) beatGhost = true;
    else if (playerMoves === ghostRun.moves && playerTime < ghostTime) beatGhost = true;

    if (beatGhost) {
      showToast(`🏆 VICTORY! You beat ${ghostRun.username}!`);
      // Award extra coins
      const coins = Storage.get('coins') || 0;
      Storage.set('coins', coins + 150);
      showToast('💰 +150 Duel Winner Bonus!');
    } else {
      showToast(`👻 Duel complete! ${ghostRun.username} won this time.`);
    }

    // Save run to database
    const user = Auth.getCurrentUser();
    const db = Auth.getDb();
    
    if (db && user) {
      try {
        await db.collection('duel_runs').add({
          userId: user.uid,
          username: user.displayName || 'Anonymous Ghost',
          levelId: winData.levelData.id,
          moves: playerMoves,
          timeSec: playerTime,
          path: movesRecord,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('📤 Run uploaded to cloud leaderboard!');
      } catch (err) {
        console.error('[Duels] Error uploading run:', err);
      }
    } else {
      // Local backup for guests
      saveLocalRun(winData.levelData.id, playerMoves, playerTime, movesRecord);
      showToast('💾 Run saved locally (log in to sync online).');
    }

    stopDuel();
  }

  // ── Local Guest Saves ──────────────────────────────────
  function saveLocalRun(levelId, moves, timeSec, path) {
    const localRuns = JSON.parse(Storage.get('localDuelRuns') || '{}');
    if (!localRuns[levelId]) localRuns[levelId] = [];
    localRuns[levelId].push({
      username: Storage.get('playerName') || 'Puzzle Master (You)',
      moves,
      timeSec,
      path
    });
    // Sort local runs
    localRuns[levelId].sort((a, b) => a.timeSec - b.timeSec);
    Storage.set('localDuelRuns', JSON.stringify(localRuns));
  }

  // ── Generate Offline/Mock Challengers ─────────────────
  function getMockRuns(levelId) {
    const levelData = Levels.get(levelId);
    if (!levelData) return [];

    // Solve the level to get a baseline path
    const filters = levelData.filters || [];
    const solution = Solver.solve(levelData.tubes, 50000, filters);
    
    if (!solution || !solution.length) {
      // Return hardcoded path if solver fails
      return [
        {
          username: 'cyber_sorter',
          moves: 6,
          timeSec: 15,
          path: [
            { from: 0, to: 2, time: 2.5 },
            { from: 1, to: 2, time: 5.0 },
            { from: 0, to: 3, time: 7.5 }
          ]
        }
      ];
    }

    // Build automated paths
    const path = [];
    solution.forEach((move, idx) => {
      // Assume bots take about 2.5 seconds per move
      path.push({
        from: move[0],
        to: move[1],
        time: parseFloat((idx * 2.5 + 2.0).toFixed(2))
      });
    });

    const botTime = Math.ceil(solution.length * 2.5 + 1);

    return [
      {
        username: 'AlgoBot (AI)',
        moves: solution.length,
        timeSec: botTime,
        path: path
      },
      {
        username: 'SpeedRunner',
        moves: solution.length + 2,
        timeSec: Math.floor(botTime * 1.2),
        path: path.map(p => ({ ...p, time: parseFloat((p.time * 1.2).toFixed(2)) }))
      }
    ];
  }

  function getIsDuelActive() { return isDuelActive; }

  return { init, loadChallengers, startDuel, stopDuel, getIsDuelActive };
})();

window.DuelsManager = DuelsManager;
