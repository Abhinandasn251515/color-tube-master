/* ═══════════════════════════════════════════════════════════
   solver.js — BFS Auto-Solve & Hint Algorithm
═══════════════════════════════════════════════════════════ */

const Solver = (() => {
  const MAX_TUBE = 4;
  const MAX_BFS_NODES = 80000;

  const MIXING_RULES = {
    'red+blue': 'purple', 'blue+red': 'purple',
    'red+yellow': 'orange', 'yellow+red': 'orange',
    'blue+yellow': 'green', 'yellow+blue': 'green',
    'red+white': 'pink', 'white+red': 'pink',
    'blue+white': 'cyan', 'white+blue': 'cyan',
    'green+yellow': 'lime', 'yellow+green': 'lime',
    'red+green': 'brown', 'green+red': 'brown',
    'blue+purple': 'indigo', 'purple+blue': 'indigo'
  };

  const FILTER_SPLITS = {
    'purple': ['red', 'blue'],
    'orange': ['red', 'yellow'],
    'green': ['blue', 'yellow'],
    'pink': ['red', 'white'],
    'cyan': ['blue', 'white'],
    'lime': ['green', 'yellow'],
    'brown': ['red', 'green'],
    'indigo': ['blue', 'purple']
  };

  /** Get the top color of a tube (or null if empty) */
  function topColor(tube) {
    return tube.length > 0 ? tube[tube.length - 1] : null;
  }

  /** Count consecutive same-color layers at the top */
  function topBlock(tube) {
    if (!tube.length) return 0;
    const c = tube[tube.length - 1];
    let count = 0;
    for (let i = tube.length - 1; i >= 0; i--) {
      if (tube[i] === c) count++; else break;
    }
    return count;
  }

  /** Check if a pour from `from` to `to` is valid */
  function canPour(tubes, from, to, filterIndices = []) {
    const src = tubes[from];
    const dst = tubes[to];

    if (from === to) return false;
    if (!src.length) return false;                  // source empty
    if (dst.length >= MAX_TUBE) return false;        // dest full

    const srcColor = topColor(src);
    const dstColor = topColor(dst);
    const isDestFilter = filterIndices && filterIndices.includes(to);

    // If destination is a filter tube:
    if (isDestFilter) {
      const split = FILTER_SPLITS[srcColor];
      if (split) {
        // Mixed color split requires enough space in the filter tube
        if (dst.length + split.length > MAX_TUBE) return false;
        return true;
      }
      // If it's a primary (un-splittable) color, standard rules apply
    }

    // Standard mixing rules:
    if (dstColor !== null && dstColor !== srcColor) {
      // Check if they can mix
      const mixKey = `${dstColor}+${srcColor}`;
      if (MIXING_RULES[mixKey]) {
        return true;
      }
      return false; // Mismatch and cannot mix
    }

    // Don't pour a complete single-color tube into another
    if (src.every(c => c === srcColor) && !dst.length) return false; // would unsolve a complete tube

    // Don't pour from a complete tube
    if (src.length === MAX_TUBE && src.every(c => c === srcColor)) return false;

    return true;
  }

  /** Execute a pour (mutates cloned tubes), returns number of layers poured */
  function pour(tubes, from, to, filterIndices = []) {
    const src = tubes[from];
    const dst = tubes[to];
    const srcColor = topColor(src);
    const dstColor = topColor(dst);
    const isDestFilter = filterIndices && filterIndices.includes(to);
    let count = 0;

    // If destination is a filter tube and top is a mixed color:
    if (isDestFilter && FILTER_SPLITS[srcColor]) {
      const split = FILTER_SPLITS[srcColor];
      // Pop one layer from source (the mixed color layer)
      src.pop();
      // Push the split components to destination
      for (const componentColor of split) {
        dst.push(componentColor);
      }
      return 1;
    }

    // Standard pouring & mixing:
    if (dstColor !== null && MIXING_RULES[`${dstColor}+${srcColor}`]) {
      const mixColor = MIXING_RULES[`${dstColor}+${srcColor}`];
      src.pop();
      dst[dst.length - 1] = mixColor;
      return 1;
    }

    // Default same-color block pouring:
    while (src.length && topColor(src) === srcColor && dst.length < MAX_TUBE) {
      dst.push(src.pop());
      count++;
    }
    return count;
  }

  /** Check if a state is won */
  function isWon(tubes) {
    for (const tube of tubes) {
      if (tube.length === 0) continue;
      if (tube.length !== MAX_TUBE) return false;
      const c = tube[0];
      if (!tube.every(x => x === c)) return false;
    }
    return true;
  }

  /** Get all valid moves from current state */
  function getMoves(tubes, filterIndices = []) {
    const moves = [];
    for (let from = 0; from < tubes.length; from++) {
      for (let to = 0; to < tubes.length; to++) {
        if (canPour(tubes, from, to, filterIndices)) {
          moves.push([from, to]);
        }
      }
    }
    return moves;
  }

  /**
   * BFS to find shortest solution.
   * Returns array of [from, to] moves or null if no solution found within limit.
   */
  function solve(initialTubes, maxNodes = MAX_BFS_NODES, filterIndices = []) {
    if (isWon(initialTubes)) return [];

    const startKey = Utils.stateKey(initialTubes);
    const queue = [{ tubes: Utils.cloneState(initialTubes), moves: [] }];
    const visited = new Set([startKey]);

    let nodes = 0;
    while (queue.length && nodes < maxNodes) {
      nodes++;
      const { tubes, moves } = queue.shift();

      const validMoves = getMoves(tubes, filterIndices);
      for (const [from, to] of validMoves) {
        const next = Utils.cloneState(tubes);
        pour(next, from, to, filterIndices);
        const key = Utils.stateKey(next);

        if (visited.has(key)) continue;
        visited.add(key);

        const nextMoves = [...moves, [from, to]];

        if (isWon(next)) return nextMoves;

        queue.push({ tubes: next, moves: nextMoves });
      }
    }

    return null; // no solution found within limit
  }

  /**
   * Get hint: returns the first move of the BFS solution.
   * Returns [from, to] or null.
   */
  function getHint(tubes, filterIndices = []) {
    const solution = solve(tubes, 15000, filterIndices);
    if (solution && solution.length > 0) return solution[0];
    return greedyHint(tubes, filterIndices);
  }

  /**
   * Greedy heuristic hint when BFS fails (large boards):
   * Prefers moves that group same colors together.
   */
  function greedyHint(tubes, filterIndices = []) {
    const moves = getMoves(tubes, filterIndices);
    if (!moves.length) return null;

    const scored = moves.map(([from, to]) => {
      const next = Utils.cloneState(tubes);
      pour(next, from, to, filterIndices);
      return { move: [from, to], score: heuristicScore(next) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  /** Heuristic: count same-color groups (higher = better) */
  function heuristicScore(tubes) {
    let score = 0;
    for (const tube of tubes) {
      if (!tube.length) { score += 2; continue; } // bonus for empty tube
      const top = topBlock(tube);
      score += top;
      if (tube.length === MAX_TUBE && tube.every(c => c === tube[0])) score += 20; // full single color!
    }
    return score;
  }

  /**
   * Check if current state is solvable.
   */
  function isSolvable(tubes, filterIndices = []) {
    return solve(tubes, 5000, filterIndices) !== null;
  }

  return { solve, getHint, canPour, pour, isWon, getMoves, topColor, topBlock, heuristicScore };
})();

window.Solver = Solver;
