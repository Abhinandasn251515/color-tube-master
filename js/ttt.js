/* ═══════════════════════════════════════════════════════════
   ttt.js — Tic-Tac-Toe 3D Logic & AI Engine
   Color Tube Master 3D - Arcade Expansion
   ═══════════════════════════════════════════════════════════ */

const TicTacToe3D = (() => {
  'use strict';

  let board = Array(9).fill(null);
  let currentPlayer = 'X'; // Player is X, CPU/P2 is O
  let gameActive = true;
  let gameMode = 'cpu'; // 'cpu' or '2p'
  let difficulty = 'medium'; // 'easy', 'medium', 'hard' (unbeatable)
  let scores = { X: 0, O: 0 };

  const WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  // Strike line position mapping in percentage (CSS layout inside board grid)
  const STRIKE_STYLES = {
    '0,1,2': { top: '16.67%', left: '10%', width: '80%', transform: 'rotate(0deg)' },
    '3,4,5': { top: '50%', left: '10%', width: '80%', transform: 'rotate(0deg)' },
    '6,7,8': { top: '83.33%', left: '10%', width: '80%', transform: 'rotate(0deg)' },
    '0,3,6': { top: '10%', left: '16.67%', width: '80%', transform: 'rotate(90deg)' },
    '1,4,7': { top: '10%', left: '50%', width: '80%', transform: 'rotate(90deg)' },
    '2,5,8': { top: '10%', left: '83.33%', width: '80%', transform: 'rotate(90deg)' },
    '0,4,8': { top: '10%', left: '10%', width: '113%', transform: 'rotate(45deg)' },
    '2,4,6': { top: '10%', left: '90%', width: '113%', transform: 'rotate(135deg)' }
  };

  // ── Init / Bind UI ───────────────────────────────────
  function init() {
    setupEventListeners();
    resetBoard();
  }

  function setupEventListeners() {
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => handleCellClick(parseInt(cell.dataset.index)));
    });

    document.getElementById('ttt-reset')?.addEventListener('click', () => {
      Audio.click();
      resetBoard();
    });

    // Game mode toggle
    document.getElementById('ttt-mode-cpu')?.addEventListener('click', (e) => {
      Audio.click();
      setMode('cpu');
    });
    document.getElementById('ttt-mode-2p')?.addEventListener('click', (e) => {
      Audio.click();
      setMode('2p');
    });

    // Difficulty buttons
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

  // ── Toggle game configurations ────────────────────────
  function setMode(mode) {
    gameMode = mode;
    document.getElementById('ttt-mode-cpu').classList.toggle('active', mode === 'cpu');
    document.getElementById('ttt-mode-2p').classList.toggle('active', mode === '2p');
    
    // Hide difficulty buttons in 2P mode
    const diffGroup = document.getElementById('ttt-diff-group');
    if (diffGroup) {
      diffGroup.style.display = mode === '2p' ? 'none' : 'flex';
    }

    // Update player names
    document.getElementById('ttt-p2-name').textContent = mode === '2p' ? 'Player 2' : 'CPU';

    scores = { X: 0, O: 0 };
    updateScoresUI();
    resetBoard();
  }

  // ── Reset Board state ─────────────────────────────────
  function resetBoard() {
    board.fill(null);
    currentPlayer = 'X';
    gameActive = true;

    // Reset grid UI
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
      cell.innerHTML = '';
      cell.style.pointerEvents = 'auto';
    });

    // Hide winning strike line
    const strike = document.getElementById('ttt-strike-line');
    if (strike) strike.style.display = 'none';

    // Status message
    updateStatusMsg(gameMode === 'cpu' ? "Your Turn!" : "Player 1's Turn (X)");

    // Reset active player indicator cards
    document.getElementById('ttt-p1-card').classList.add('active');
    document.getElementById('ttt-p2-card').classList.remove('active');
  }

  // ── Handle Move Click ─────────────────────────────────
  function handleCellClick(index) {
    if (!gameActive || board[index] !== null) return;
    if (gameMode === 'cpu' && currentPlayer !== 'X') return; // Blocks clicks during CPU turn

    makeMove(index, currentPlayer);
    Audio.click();

    // Check winner
    if (checkWinnerState(board, currentPlayer)) {
      handleGameOver('win', currentPlayer);
      return;
    }

    // Check tie
    if (board.every(cell => cell !== null)) {
      handleGameOver('tie');
      return;
    }

    // Next turn
    switchTurns();

    // Trigger AI move if in CPU mode
    if (gameMode === 'cpu' && gameActive) {
      setTimeout(makeCPUMove, 500);
    }
  }

  function makeMove(index, player) {
    board[index] = player;
    
    const cell = document.querySelector(`.ttt-cell[data-index="${index}"]`);
    if (cell) {
      const piece = document.createElement('div');
      piece.className = `piece ${player.toLowerCase()}-piece`;
      piece.textContent = player;
      cell.appendChild(piece);
      cell.style.pointerEvents = 'none';
    }
  }

  function switchTurns() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    
    const p1Card = document.getElementById('ttt-p1-card');
    const p2Card = document.getElementById('ttt-p2-card');

    if (currentPlayer === 'X') {
      p1Card.classList.add('active');
      p2Card.classList.remove('active');
      updateStatusMsg(gameMode === 'cpu' ? "Your Turn!" : "Player 1's Turn (X)");
    } else {
      p2Card.classList.add('active');
      p1Card.classList.remove('active');
      updateStatusMsg(gameMode === 'cpu' ? "CPU is thinking..." : "Player 2's Turn (O)");
    }
  }

  // ── Game Over logic ───────────────────────────────────
  function handleGameOver(result, player) {
    gameActive = false;
    const statusMsg = document.getElementById('ttt-status-msg');
    
    if (result === 'win') {
      // Find winning path indices
      const winningPattern = getWinningPattern(board, player);
      drawStrikeLine(winningPattern);

      scores[player]++;
      updateScoresUI();

      if (gameMode === 'cpu') {
        if (player === 'X') {
          statusMsg.textContent = "🏆 You Won!";
          statusMsg.className = "ttt-status win";
          Audio.win();
        } else {
          statusMsg.textContent = "❌ CPU Won!";
          statusMsg.className = "ttt-status lose";
          Audio.lose();
        }
      } else {
        statusMsg.textContent = `🎉 Player ${player === 'X' ? '1' : '2'} ( ${player} ) Won!`;
        statusMsg.className = "ttt-status win";
        Audio.win();
      }
    } else {
      // Tie
      statusMsg.textContent = "🤝 It's a Draw!";
      statusMsg.className = "ttt-status";
      Audio.click();
    }
  }

  function updateStatusMsg(msg) {
    const statusMsg = document.getElementById('ttt-status-msg');
    if (statusMsg) {
      statusMsg.textContent = msg;
      statusMsg.className = "ttt-status";
    }
  }

  function updateScoresUI() {
    const s1 = document.getElementById('ttt-score-p1');
    const s2 = document.getElementById('ttt-score-p2');
    if (s1) s1.textContent = scores.X;
    if (s2) s2.textContent = scores.O;
  }

  // ── Render 3D winning strike line ─────────────────────
  function drawStrikeLine(pattern) {
    const strike = document.getElementById('ttt-strike-line');
    if (!strike || !pattern) return;

    const key = pattern.sort().join(',');
    const style = STRIKE_STYLES[key];

    if (style) {
      strike.style.top = style.top;
      strike.style.left = style.left;
      strike.style.width = style.width;
      strike.style.transform = `translateZ(22px) ${style.transform}`;
      strike.style.display = 'block';
    }
  }

  // ── Minimax AI Engine ────────────────────────────────
  function makeCPUMove() {
    if (!gameActive) return;

    let moveIndex;

    if (difficulty === 'easy') {
      moveIndex = getRandomMove();
    } else if (difficulty === 'medium') {
      // 50% chance minimax move, 50% chance random move (makes it beatable)
      moveIndex = Math.random() < 0.5 ? getBestMinimaxMove() : getRandomMove();
    } else {
      // Unbeatable Hard Mode
      moveIndex = getBestMinimaxMove();
    }

    if (moveIndex !== undefined && moveIndex !== -1) {
      makeMove(moveIndex, 'O');
      Audio.click();

      if (checkWinnerState(board, 'O')) {
        handleGameOver('win', 'O');
        return;
      }

      if (board.every(cell => cell !== null)) {
        handleGameOver('tie');
        return;
      }

      switchTurns();
    }
  }

  function getRandomMove() {
    const emptyCells = board.map((cell, idx) => cell === null ? idx : null).filter(idx => idx !== null);
    if (emptyCells.length === 0) return -1;
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  function getBestMinimaxMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O'; // CPU makes a hypothetical move
        let score = minimax(board, 0, false);
        board[i] = null; // Undo move

        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove !== -1 ? bestMove : getRandomMove();
  }

  function minimax(tempBoard, depth, isMaximizing) {
    if (checkWinnerState(tempBoard, 'O')) return 10 - depth;
    if (checkWinnerState(tempBoard, 'X')) return depth - 10;
    if (tempBoard.every(cell => cell !== null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'O';
          let score = minimax(tempBoard, depth + 1, false);
          tempBoard[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'X';
          let score = minimax(tempBoard, depth + 1, true);
          tempBoard[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }

  // ── Win Condition Check Helpers ───────────────────────
  function checkWinnerState(tempBoard, player) {
    return WIN_PATTERNS.some(pattern => {
      return pattern.every(idx => tempBoard[idx] === player);
    });
  }

  function getWinningPattern(tempBoard, player) {
    return WIN_PATTERNS.find(pattern => {
      return pattern.every(idx => tempBoard[idx] === player);
    });
  }

  return {
    init,
    resetBoard,
    setMode
  };
})();

window.TicTacToe3D = TicTacToe3D;
