/* ═══════════════════════════════════════════════════════════
   ttt.js — Tic-Tac-Toe Logic & AI Engine (Fixed)
   Color Tube Master 3D - Arcade Expansion
   ═══════════════════════════════════════════════════════════ */

const TicTacToe3D = (() => {
  'use strict';

  let board = Array(9).fill(null);
  let currentPlayer = 'X';   // Player is X, CPU/P2 is O
  let gameActive = true;
  let gameMode = 'cpu';       // 'cpu' or '2p'
  let difficulty = 'medium';  // 'easy', 'medium', 'hard'
  let scores = { X: 0, O: 0 };

  const WIN_PATTERNS = [
    [0,1,2], [3,4,5], [6,7,8],   // rows
    [0,3,6], [1,4,7], [2,5,8],   // cols
    [0,4,8], [2,4,6]             // diagonals
  ];

  // ── Init ─────────────────────────────────────────────
  function init() {
    setupEventListeners();
    resetBoard();
  }

  function setupEventListeners() {
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
      const idx = parseInt(cell.dataset.index);
      cell.addEventListener('click', () => {
        handleCellClick(idx);
      });
    });

    document.getElementById('ttt-reset')?.addEventListener('click', () => {
      Audio.click();
      resetBoard();
    });

    document.getElementById('ttt-mode-cpu')?.addEventListener('click', () => { Audio.click(); setMode('cpu'); });
    document.getElementById('ttt-mode-2p')?.addEventListener('click',  () => { Audio.click(); setMode('2p'); });

    document.querySelectorAll('#ttt-diff-group button').forEach(btn => {
      btn.addEventListener('click', () => {
        Audio.click();
        document.querySelectorAll('#ttt-diff-group button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        resetBoard();
      });
    });
  }

  // ── Game Mode ─────────────────────────────────────────
  function setMode(mode) {
    gameMode = mode;
    document.getElementById('ttt-mode-cpu').classList.toggle('active', mode === 'cpu');
    document.getElementById('ttt-mode-2p').classList.toggle('active',  mode === '2p');

    const diffGroup = document.getElementById('ttt-diff-group');
    if (diffGroup) diffGroup.style.display = mode === '2p' ? 'none' : 'flex';

    document.getElementById('ttt-p2-name').textContent = mode === '2p' ? 'Player 2' : 'CPU';

    scores = { X: 0, O: 0 };
    updateScoresUI();
    resetBoard();
  }

  // ── Reset ─────────────────────────────────────────────
  function resetBoard() {
    board.fill(null);
    currentPlayer = 'X';
    gameActive = true;

    // Clear cells
    document.querySelectorAll('.ttt-cell').forEach(cell => {
      cell.innerHTML = '';
      cell.style.pointerEvents = '';
      cell.classList.remove('winning-cell');
    });

    // Hide strike line
    const strike = document.getElementById('ttt-strike-line');
    if (strike) { strike.style.display = 'none'; strike.style.animation = 'none'; }

    setStatus(gameMode === 'cpu' ? '🎮 Your Turn!' : "🎮 Player 1's Turn (X)", '');

    document.getElementById('ttt-p1-card')?.classList.add('active');
    document.getElementById('ttt-p2-card')?.classList.remove('active');
  }

  // ── Cell Click ────────────────────────────────────────
  function handleCellClick(index) {
    if (!gameActive || board[index] !== null) return;
    if (gameMode === 'cpu' && currentPlayer !== 'X') return;

    placeMove(index, currentPlayer);
    Audio.click();

    if (checkWin(board, currentPlayer)) {
      endGame('win', currentPlayer);
      return;
    }
    if (board.every(c => c !== null)) {
      endGame('tie');
      return;
    }

    switchTurn();
    if (gameMode === 'cpu' && gameActive) {
      setTimeout(doCPUMove, 550);
    }
  }

  function placeMove(index, player) {
    board[index] = player;
    const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
    if (!cell) return;
    const piece = document.createElement('div');
    piece.className = `piece ${player.toLowerCase()}-piece`;
    cell.appendChild(piece);
    cell.style.pointerEvents = 'none';
  }

  function switchTurn() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    const p1 = document.getElementById('ttt-p1-card');
    const p2 = document.getElementById('ttt-p2-card');
    if (currentPlayer === 'X') {
      p1?.classList.add('active');
      p2?.classList.remove('active');
      setStatus(gameMode === 'cpu' ? '🎮 Your Turn!' : "Player 1's Turn (X)", '');
    } else {
      p2?.classList.add('active');
      p1?.classList.remove('active');
      setStatus(gameMode === 'cpu' ? '🤖 CPU Thinking…' : "Player 2's Turn (O)", '');
    }
  }

  // ── Game Over ─────────────────────────────────────────
  function endGame(result, player) {
    gameActive = false;

    if (result === 'win') {
      const pattern = getWinPattern(board, player);
      highlightWinners(pattern);
      drawStrike(pattern);

      scores[player]++;
      updateScoresUI();

      if (gameMode === 'cpu') {
        if (player === 'X') { setStatus('🏆 You Won!', 'win'); Audio.win(); }
        else                { setStatus('🤖 CPU Won!', 'lose'); Audio.lose(); }
      } else {
        setStatus(`🎉 Player ${player === 'X' ? '1' : '2'} (${player}) Won!`, 'win');
        Audio.win();
      }
    } else {
      setStatus("🤝 It's a Draw!", '');
      Audio.click();
    }
  }

  function setStatus(msg, cls) {
    const el = document.getElementById('ttt-status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ttt-status' + (cls ? ' ' + cls : '');
  }

  function updateScoresUI() {
    const s1 = document.getElementById('ttt-score-p1');
    const s2 = document.getElementById('ttt-score-p2');
    if (s1) s1.textContent = scores.X;
    if (s2) s2.textContent = scores.O;
  }

  function highlightWinners(pattern) {
    if (!pattern) return;
    pattern.forEach(idx => {
      const cell = document.querySelector(`.ttt-cell[data-index="${idx}"]`);
      if (cell) cell.classList.add('winning-cell');
    });
  }

  // ── Strike Line ───────────────────────────────────────
  function drawStrike(pattern) {
    if (!pattern) return;
    const strike = document.getElementById('ttt-strike-line');
    const wrapper = strike?.parentElement; // .ttt-board-wrapper
    if (!strike || !wrapper) return;

    const wRect = wrapper.getBoundingClientRect();
    const cells = pattern.map(idx =>
      document.querySelector(`.ttt-cell[data-index="${idx}"]`)
    ).filter(Boolean);
    if (cells.length < 2) return;

    const firstRect = cells[0].getBoundingClientRect();
    const lastRect  = cells[cells.length - 1].getBoundingClientRect();

    const x1 = firstRect.left + firstRect.width / 2 - wRect.left;
    const y1 = firstRect.top  + firstRect.height / 2 - wRect.top;
    const x2 = lastRect.left  + lastRect.width / 2  - wRect.left;
    const y2 = lastRect.top   + lastRect.height / 2 - wRect.top;

    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle  = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    strike.style.width     = length + 'px';
    strike.style.left      = x1 + 'px';
    strike.style.top       = (y1 - 3) + 'px'; // center the 6px height
    strike.style.transform = `rotate(${angle}deg)`;
    strike.style.animation = '';
    strike.style.display   = 'block';

    // Re-trigger animation
    void strike.offsetWidth;
    strike.style.animation = 'strikeFade 0.4s ease forwards';
  }

  // ── AI ────────────────────────────────────────────────
  function doCPUMove() {
    if (!gameActive) return;
    let move;
    if (difficulty === 'easy') {
      move = randomMove();
    } else if (difficulty === 'medium') {
      move = Math.random() < 0.65 ? bestMinimax() : randomMove();
    } else {
      move = bestMinimax();
    }

    if (move !== undefined && move !== -1) {
      placeMove(move, 'O');
      Audio.click();
      if (checkWin(board, 'O')) { endGame('win', 'O'); return; }
      if (board.every(c => c !== null)) { endGame('tie'); return; }
      switchTurn();
    }
  }

  function randomMove() {
    const empty = board.map((c,i) => c === null ? i : null).filter(i => i !== null);
    return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
  }

  function bestMinimax() {
    let best = -Infinity, move = -1;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        const s = minimax(board, 0, false);
        board[i] = null;
        if (s > best) { best = s; move = i; }
      }
    }
    return move !== -1 ? move : randomMove();
  }

  function minimax(b, depth, maximizing) {
    if (checkWin(b, 'O')) return 10 - depth;
    if (checkWin(b, 'X')) return depth - 10;
    if (b.every(c => c !== null)) return 0;

    if (maximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) { b[i]='O'; best = Math.max(best, minimax(b,depth+1,false)); b[i]=null; }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i] === null) { b[i]='X'; best = Math.min(best, minimax(b,depth+1,true)); b[i]=null; }
      }
      return best;
    }
  }

  // ── Helpers ───────────────────────────────────────────
  function checkWin(b, player) {
    return WIN_PATTERNS.some(p => p.every(i => b[i] === player));
  }

  function getWinPattern(b, player) {
    return WIN_PATTERNS.find(p => p.every(i => b[i] === player)) || null;
  }

  return { init, resetBoard, setMode };
})();

window.TicTacToe3D = TicTacToe3D;
