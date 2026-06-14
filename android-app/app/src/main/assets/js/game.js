/* ═══════════════════════════════════════════════════════════
   game.js — Core Game Engine & State Machine
═══════════════════════════════════════════════════════════ */

const Game = (() => {

  // ── State ────────────────────────────────────────────
  let state = {
    phase:       'IDLE',   // IDLE | SELECTED | POURING | WIN
    tubes:       [],
    selected:    -1,
    history:     [],       // [{tubes, selected}]
    moves:       0,
    startTime:   0,
    elapsedSec:  0,
    timerInterval: null,
    levelData:   null,
    isInfinite:  false,
    isDaily:     false,
    usedHint:    false,
    usedUndo:    false,
    isPaused:    false,
    autoSolving: false,
    tubeSize:    'sz-md',
  };

  let onWinCallback  = null;
  let onMoveCallback = null;
  let onPourCallback = null;
  let onUndoCallback = null;

  // ── Load a Level ──────────────────────────────────────
  function loadLevel(levelData) {
    stopTimer();
    Animations.stopConfetti();

    state.levelData  = levelData;
    state.tubes      = Utils.cloneState(levelData.tubes);
    state.selected   = -1;
    state.history    = [];
    state.moves      = 0;
    state.elapsedSec = 0;
    state.phase      = 'IDLE';
    state.usedHint   = false;
    state.usedUndo   = false;
    state.isPaused   = false;
    state.autoSolving= false;
    state.isInfinite = !!levelData.isInfinite;
    state.isDaily    = !!levelData.isDaily;

    // Determine tube size based on count
    const count = state.tubes.length;
    if (count <= 5)       state.tubeSize = 'sz-lg';
    else if (count <= 8)  state.tubeSize = 'sz-md';
    else if (count <= 12) state.tubeSize = 'sz-sm';
    else                  state.tubeSize = 'sz-sm';

    // Render
    Renderer.init();
    const filters = state.levelData ? state.levelData.filters : [];
    Renderer.renderTubes(state.tubes, state.tubeSize, filters);
    setupTubeListeners();

    // Start timer
    startTimer();

    // Update HUD
    updateHUD();

    // Check if fully complete instantly (shouldn't happen but just in case)
    if (Solver.isWon(state.tubes)) handleWin();
  }

  // ── Timer ─────────────────────────────────────────────
  function startTimer() {
    state.startTime = Date.now() - state.elapsedSec * 1000;
    state.timerInterval = setInterval(() => {
      if (state.isPaused) return;
      state.elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
      const el = document.getElementById('hud-timer');
      if (el) el.textContent = Utils.formatTime(state.elapsedSec);
    }, 500);
  }

  function stopTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  }

  function pauseTimer() { state.isPaused = true; }
  function resumeTimer() { if (state.isPaused) { state.isPaused = false; state.startTime = Date.now() - state.elapsedSec * 1000; } }

  // ── Tube Click Handler ────────────────────────────────
  function setupTubeListeners() {
    const tubeEls = document.querySelectorAll('.tube-wrap');
    tubeEls.forEach((el) => {
      el.addEventListener('click', () => handleTubeClick(parseInt(el.dataset.idx)));
    });
  }

  function handleTubeClick(idx) {
    if (state.phase === 'WIN' || state.phase === 'POURING' || state.isPaused || state.autoSolving) return;

    Audio.tap();
    Utils.vibrate([15]);

    if (state.phase === 'IDLE' || state.selected === -1) {
      // Select a tube
      if (!state.tubes[idx] || state.tubes[idx].length === 0) {
        // Can't select empty
        Renderer.shakeTube(idx);
        return;
      }
      // Don't select a fully complete tube
      const tube = state.tubes[idx];
      if (tube.length === 4 && tube.every(c => c === tube[0])) {
        Renderer.shakeTube(idx);
        return;
      }
      state.selected = idx;
      state.phase    = 'SELECTED';
      Renderer.selectTube(idx);

    } else if (state.phase === 'SELECTED') {
      if (idx === state.selected) {
        // Deselect
        state.selected = -1;
        state.phase    = 'IDLE';
        Renderer.clearSelection();
        return;
      }

      // Try to pour
      executePour(state.selected, idx);
    }
  }

  // ── Pour Execution ────────────────────────────────────
  async function executePour(fromIdx, toIdx) {
    const filters = state.levelData ? state.levelData.filters : [];
    if (!Solver.canPour(state.tubes, fromIdx, toIdx, filters)) {
      Renderer.shakeTube(toIdx);
      Renderer.clearSelection();
      state.selected = -1;
      state.phase    = 'IDLE';
      return;
    }

    state.phase = 'POURING';

    // Save history for undo
    state.history.push(Utils.cloneState(state.tubes));
    if (state.history.length > 30) state.history.shift();

    // Get color before pour
    const fromColor = Solver.topColor(state.tubes[fromIdx]);

    // Execute pour on state
    Solver.pour(state.tubes, fromIdx, toIdx, filters);
    state.moves++;

    if (onPourCallback) {
      onPourCallback(fromIdx, toIdx);
    }

    // Visual: animate pour
    Renderer.clearSelection();
    await Renderer.animatePour(fromIdx, toIdx, fromColor);

    // Update both tubes visually
    Renderer.updateTube(fromIdx, state.tubes[fromIdx]);
    Renderer.updateTube(toIdx,   state.tubes[toIdx]);

    Audio.pour();

    // Check win
    if (Solver.isWon(state.tubes)) {
      state.phase = 'WIN';
      stopTimer();
      await Utils.wait(300);
      handleWin();
      return;
    }

    state.selected = -1;
    state.phase    = 'IDLE';

    // Update HUD moves
    updateHUD();

    // Check for any newly complete tubes
    Renderer.markAllDone(state.tubes);

    if (onMoveCallback) onMoveCallback(state.moves);
  }

  // ── Undo ─────────────────────────────────────────────
  function undo() {
    if (!state.history.length) return;
    if (state.phase === 'WIN' || state.phase === 'POURING' || state.isPaused) return;

    state.tubes    = state.history.pop();
    state.selected = -1;
    state.phase    = 'IDLE';
    state.usedUndo = true;
    state.moves    = Math.max(0, state.moves - 1);

    if (onUndoCallback) {
      onUndoCallback();
    }

    const filters = state.levelData ? state.levelData.filters : [];
    Renderer.renderTubes(state.tubes, state.tubeSize, filters);
    setupTubeListeners();
    Renderer.markAllDone(state.tubes);
    updateHUD();

    Audio.undo();
    Utils.vibrate([20]);
  }

  // ── Hint ─────────────────────────────────────────────
  function getHint() {
    if (state.phase === 'WIN' || state.phase === 'POURING' || state.isPaused) return false;

    const hints = Storage.get('hintsRemaining') || 0;
    if (hints <= 0) return false;

    const filters = state.levelData ? state.levelData.filters : [];
    const move = Solver.getHint(state.tubes, filters);
    if (!move) return false;

    state.usedHint = true;
    Storage.set('hintsRemaining', hints - 1);
    updateHintBadge();

    Renderer.clearSelection();
    state.selected = -1;
    state.phase    = 'IDLE';

    Renderer.hintTube(move[0], move[1]);
    return true;
  }

  // ── Add Hint ─────────────────────────────────────────
  function addHint() {
    const hints = (Storage.get('hintsRemaining') || 0) + 1;
    Storage.set('hintsRemaining', hints);
    updateHintBadge();
  }

  // ── Restart ──────────────────────────────────────────
  function restart() {
    if (state.levelData) loadLevel(state.levelData);
  }

  // ── Auto-Solve ───────────────────────────────────────
  async function autoSolve() {
    if (state.autoSolving || state.phase === 'WIN') return;

    const filters = state.levelData ? state.levelData.filters : [];
    const solution = Solver.solve(state.tubes, 80000, filters);
    if (!solution || !solution.length) {
      alert('No solution found for current state! Try restarting.');
      return;
    }

    state.autoSolving = true;
    state.phase = 'POURING';

    for (const [from, to] of solution) {
      if (!state.autoSolving) break;
      await Utils.wait(80);
      const fromColor = Solver.topColor(state.tubes[from]);
      Solver.pour(state.tubes, from, to, filters);
      state.moves++;

      await Renderer.animatePour(from, to, fromColor);
      Renderer.updateTube(from, state.tubes[from]);
      Renderer.updateTube(to,   state.tubes[to]);
      Audio.pour();
      Renderer.markAllDone(state.tubes);
      updateHUD();

      await Utils.wait(180);
    }

    state.autoSolving = false;

    if (Solver.isWon(state.tubes)) {
      state.phase = 'WIN';
      stopTimer();
      await Utils.wait(300);
      handleWin();
    } else {
      state.phase = 'IDLE';
    }
  }

  // ── Win Handler ───────────────────────────────────────
  function handleWin() {
    stopTimer();
    state.phase = 'WIN';

    const stars = state.levelData.isDaily
      ? 3
      : Levels.calcStars(state.levelData.id, state.moves, state.elapsedSec);

    Renderer.markAllDone(state.tubes);
    Audio.win();
    Animations.startConfetti();

    if (onWinCallback) {
      onWinCallback({
        stars,
        moves: state.moves,
        timeSec: state.elapsedSec,
        usedHint: state.usedHint,
        usedUndo: state.usedUndo,
        levelData: state.levelData
      });
    }
  }

  // ── HUD Update ────────────────────────────────────────
  function updateHUD() {
    const movesEl = document.getElementById('hud-moves');
    if (movesEl) {
      movesEl.textContent = state.moves;
      movesEl.classList.add('pulse');
      setTimeout(() => movesEl.classList.remove('pulse'), 300);
    }

    const levelEl = document.getElementById('hud-level');
    if (levelEl && state.levelData) {
      if (state.levelData.isDaily) levelEl.textContent = 'Daily';
      else if (state.isInfinite)   levelEl.textContent = 'Infinite';
      else levelEl.textContent = `Level ${state.levelData.id}`;
    }

    const diffEl = document.getElementById('hud-diff');
    if (diffEl && state.levelData) {
      const diff = state.levelData.difficulty || 'beginner';
      diffEl.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
      diffEl.className = `hud-difficulty diff-badge diff-${diff}`;
    }

    const bestEl = document.getElementById('hud-best');
    if (bestEl && state.levelData && state.levelData.id) {
      const best = Storage.getLevelData(state.levelData.id);
      bestEl.textContent = best ? best.moves : '--';
    }

    updateHintBadge();
  }

  function updateHintBadge() {
    const badge = document.getElementById('hint-badge');
    if (badge) badge.textContent = Storage.get('hintsRemaining') || 0;
  }

  // ── Getters ──────────────────────────────────────────
  function getState() { return state; }
  function getTubes()  { return state.tubes; }
  function getMoves()  { return state.moves; }
  function getTime()   { return state.elapsedSec; }
  function isWon()     { return state.phase === 'WIN'; }
  function isPaused()  { return state.isPaused; }

  function pause()  { state.isPaused = true;  pauseTimer(); }
  function resume() { state.isPaused = false; resumeTimer(); }

  // ── Callbacks ─────────────────────────────────────────
  function onWin(cb)  { onWinCallback  = cb; }
  function onMove(cb) { onMoveCallback = cb; }
  function onPour(cb) { onPourCallback = cb; }
  function onUndo(cb) { onUndoCallback = cb; }

  return {
    loadLevel, undo, getHint, addHint, restart, autoSolve,
    handleTubeClick, updateHUD, updateHintBadge,
    getState, getTubes, getMoves, getTime, isWon, isPaused,
    pause, resume, onWin, onMove, onPour, onUndo
  };
})();

window.Game = Game;
