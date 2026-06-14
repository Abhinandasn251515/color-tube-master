/* ═══════════════════════════════════════════════════════════
   levels.js — Level Definitions + Procedural Generator
   100 hand-crafted levels across 5 difficulty tiers
═══════════════════════════════════════════════════════════ */

const Levels = (() => {

  const COLORS = ['red','blue','green','yellow','purple','orange','pink','cyan','lime','brown','teal','maroon','navy','indigo','white'];
  const TUBE_CAPACITY = 4;

  // ── Difficulty metadata ──────────────────────────────────
  const DIFFICULTIES = {
    beginner: { range:[1,20],   label:'Beginner', stars:['⭐','⭐⭐','⭐⭐⭐'], timeBonus:120, moveBonus:1.5 },
    easy:     { range:[21,40],  label:'Easy',     stars:['⭐','⭐⭐','⭐⭐⭐'], timeBonus:100, moveBonus:1.3 },
    medium:   { range:[41,70],  label:'Medium',   stars:['⭐','⭐⭐','⭐⭐⭐'], timeBonus:80,  moveBonus:1.2 },
    hard:     { range:[71,90],  label:'Hard',     stars:['⭐','⭐⭐','⭐⭐⭐'], timeBonus:60,  moveBonus:1.1 },
    expert:   { range:[91,100], label:'Expert',   stars:['⭐','⭐⭐','⭐⭐⭐'], timeBonus:40,  moveBonus:1.0 }
  };

  // ── Helper: build a solved level then shuffle ────────────
  function buildLevel(id, colors, empties, seed) {
    const rng = Utils.seededRng(seed || id * 7919);

    // Build solved state: each color fills exactly one tube
    const solved = colors.map(c => [c,c,c,c]);

    // Flatten all layers
    const allLayers = [];
    for (const tube of solved) allLayers.push(...tube);

    // Shuffle layers
    Utils.shuffle(allLayers, rng);

    // Distribute into tubes
    const tubes = [];
    let idx = 0;
    for (let i = 0; i < colors.length; i++) {
      tubes.push([allLayers[idx++], allLayers[idx++], allLayers[idx++], allLayers[idx++]]);
    }

    // Add empty tubes
    for (let i = 0; i < empties; i++) tubes.push([]);

    return { id, tubes, emptyTubes: empties, colors: colors.length };
  }

  // ── Hand-crafted level definitions ─────────────────────
  // Format: { id, difficulty, tubes (array of arrays, bottom→top), emptyTubes }
  const HAND_CRAFTED = [
    // ═══ BEGINNER (1-20) ═══════════════════════════════
    { id:1,  difficulty:'beginner',
      tubes: [['red','blue','red','blue'],['blue','red','blue','red'],[],[]], emptyTubes:2 },

    { id:2,  difficulty:'beginner',
      tubes: [['green','red','green','red'],['red','green','red','green'],[],[]], emptyTubes:2 },

    { id:3,  difficulty:'beginner',
      tubes: [['blue','yellow','blue','yellow'],['yellow','blue','yellow','blue'],[]], emptyTubes:1, filters:[2] },

    { id:4,  difficulty:'beginner',
      tubes: [['red','blue','green','red'],['blue','green','red','blue'],['green','red','blue','green'],[]], emptyTubes:1 },

    { id:5,  difficulty:'beginner',
      tubes: [['yellow','red','yellow','blue'],['blue','yellow','red','yellow'],['red','blue','blue','red'],[],[]], emptyTubes:2 },

    { id:6,  difficulty:'beginner',
      tubes: [['purple','red','blue','purple'],['blue','purple','red','blue'],['red','blue','purple','red'],[]], emptyTubes:1 },

    { id:7,  difficulty:'beginner', ...buildLevel(7, ['red','blue','green'], 1) },
    { id:8,  difficulty:'beginner', ...buildLevel(8, ['red','blue','yellow'], 1) },
    { id:9,  difficulty:'beginner', ...buildLevel(9, ['green','purple','orange'], 2) },
    { id:10, difficulty:'beginner', ...buildLevel(10, ['red','blue','green','yellow'], 2) },
    { id:11, difficulty:'beginner', ...buildLevel(11, ['red','blue','green','purple'], 2) },
    { id:12, difficulty:'beginner', ...buildLevel(12, ['red','blue','orange','cyan'], 2) },
    { id:13, difficulty:'beginner', ...buildLevel(13, ['yellow','green','pink','blue'], 2) },
    { id:14, difficulty:'beginner', ...buildLevel(14, ['red','purple','teal','orange'], 2) },
    { id:15, difficulty:'beginner', ...buildLevel(15, ['red','blue','green','yellow','purple'], 2) },
    { id:16, difficulty:'beginner', ...buildLevel(16, ['cyan','pink','lime','orange'], 2) },
    { id:17, difficulty:'beginner', ...buildLevel(17, ['red','blue','green','yellow','orange'], 2) },
    { id:18, difficulty:'beginner', ...buildLevel(18, ['teal','maroon','indigo','white'], 2) },
    { id:19, difficulty:'beginner', ...buildLevel(19, ['red','blue','green','purple','pink'], 2) },
    { id:20, difficulty:'beginner', ...buildLevel(20, ['red','blue','green','yellow','purple','orange'], 2) },

    // ═══ EASY (21-40) ════════════════════════════════════
    { id:21, difficulty:'easy', ...buildLevel(21, ['red','blue','green','yellow','purple'], 1) },
    { id:22, difficulty:'easy', ...buildLevel(22, ['red','blue','green','orange','cyan'], 1) },
    { id:23, difficulty:'easy', ...buildLevel(23, ['pink','lime','teal','maroon','navy'], 1) },
    { id:24, difficulty:'easy', ...buildLevel(24, ['red','blue','green','yellow','purple','orange'], 1) },
    { id:25, difficulty:'easy', ...buildLevel(25, ['red','blue','green','cyan','pink','lime'], 1) },
    { id:26, difficulty:'easy', ...buildLevel(26, ['red','blue','green','yellow','teal','brown'], 1) },
    { id:27, difficulty:'easy', ...buildLevel(27, ['purple','orange','pink','cyan','indigo','white'], 1) },
    { id:28, difficulty:'easy', ...buildLevel(28, ['red','blue','green','yellow','purple','orange','pink'], 2) },
    { id:29, difficulty:'easy', ...buildLevel(29, ['red','blue','green','yellow','cyan','lime','teal'], 2) },
    { id:30, difficulty:'easy', ...buildLevel(30, ['maroon','navy','indigo','white','brown','teal','lime'], 2) },
    { id:31, difficulty:'easy', ...buildLevel(31, ['red','blue','green','yellow','purple','orange','pink','cyan'], 2) },
    { id:32, difficulty:'easy', ...buildLevel(32, ['red','blue','green','yellow','purple','lime','teal','brown'], 2) },
    { id:33, difficulty:'easy', ...buildLevel(33, ['red','blue','cyan','yellow','pink','orange','teal','white'], 2) },
    { id:34, difficulty:'easy', ...buildLevel(34, ['red','green','purple','lime','maroon','navy','indigo','brown'], 2) },
    { id:35, difficulty:'easy', ...buildLevel(35, ['red','blue','green','yellow','purple','orange','pink','cyan','lime'], 2) },
    { id:36, difficulty:'easy', ...buildLevel(36, ['red','blue','green','yellow','teal','brown','maroon','navy','white'], 2) },
    { id:37, difficulty:'easy', ...buildLevel(37, ['red','blue','green','purple','orange','pink','cyan','lime','indigo'], 2) },
    { id:38, difficulty:'easy', ...buildLevel(38, ['red','blue','yellow','purple','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:39, difficulty:'easy', ...buildLevel(39, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal'], 2) },
    { id:40, difficulty:'easy', ...buildLevel(40, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','brown'], 2) },

    // ═══ MEDIUM (41-70) ══════════════════════════════════
    { id:41, difficulty:'medium', ...buildLevel(41, ['red','blue','green','yellow','purple','orange','pink','cyan'], 1) },
    { id:42, difficulty:'medium', ...buildLevel(42, ['red','blue','green','yellow','purple','lime','teal','navy'], 1) },
    { id:43, difficulty:'medium', ...buildLevel(43, ['red','blue','green','yellow','purple','orange','pink','cyan','lime'], 1) },
    { id:44, difficulty:'medium', ...buildLevel(44, ['red','blue','green','yellow','teal','brown','maroon','indigo','white'], 1) },
    { id:45, difficulty:'medium', ...buildLevel(45, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal'], 1) },
    { id:46, difficulty:'medium', ...buildLevel(46, ['red','blue','green','yellow','purple','orange','pink','lime','indigo','white'], 1) },
    { id:47, difficulty:'medium', ...buildLevel(47, ['red','blue','green','yellow','purple','orange','cyan','teal','maroon','navy'], 1) },
    { id:48, difficulty:'medium', ...buildLevel(48, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','brown'], 1) },
    { id:49, difficulty:'medium', ...buildLevel(49, ['red','blue','green','yellow','purple','orange','pink','teal','maroon','navy'], 1) },
    { id:50, difficulty:'medium', ...buildLevel(50, ['red','blue','green','yellow','purple','orange','cyan','lime','indigo','white','brown'], 2) },
    { id:51, difficulty:'medium', ...buildLevel(51, ['red','blue','green','yellow','purple','orange','pink','teal','lime','white','maroon'], 2) },
    { id:52, difficulty:'medium', ...buildLevel(52, ['red','blue','green','cyan','purple','orange','pink','teal','lime','navy','indigo'], 2) },
    { id:53, difficulty:'medium', ...buildLevel(53, ['red','blue','green','yellow','purple','pink','cyan','lime','teal','brown','maroon'], 2) },
    { id:54, difficulty:'medium', ...buildLevel(54, ['red','blue','green','yellow','orange','pink','cyan','lime','teal','navy','white'], 2) },
    { id:55, difficulty:'medium', ...buildLevel(55, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','indigo'], 2) },
    { id:56, difficulty:'medium', ...buildLevel(56, ['red','blue','green','yellow','purple','orange','pink','cyan','maroon','navy','white','indigo'], 2) },
    { id:57, difficulty:'medium', ...buildLevel(57, ['red','blue','green','yellow','purple','lime','teal','brown','maroon','navy','white','orange'], 2) },
    { id:58, difficulty:'medium', ...buildLevel(58, ['red','blue','cyan','yellow','purple','orange','pink','lime','teal','brown','maroon','white'], 2) },
    { id:59, difficulty:'medium', ...buildLevel(59, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','navy'], 2) },
    { id:60, difficulty:'medium', ...buildLevel(60, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','maroon','indigo'], 2) },
    { id:61, difficulty:'medium', ...buildLevel(61, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','white'], 2) },
    { id:62, difficulty:'medium', ...buildLevel(62, ['red','blue','green','yellow','purple','orange','pink','teal','maroon','navy','brown','white'], 2) },
    { id:63, difficulty:'medium', ...buildLevel(63, ['red','blue','green','cyan','purple','pink','lime','teal','indigo','maroon','navy','white'], 2) },
    { id:64, difficulty:'medium', ...buildLevel(64, ['red','blue','yellow','orange','pink','cyan','lime','teal','indigo','maroon','navy','white'], 2) },
    { id:65, difficulty:'medium', ...buildLevel(65, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon'], 2) },
    { id:66, difficulty:'medium', ...buildLevel(66, ['red','blue','green','yellow','purple','orange','cyan','lime','teal','navy','indigo','white'], 2) },
    { id:67, difficulty:'medium', ...buildLevel(67, ['red','blue','green','yellow','purple','pink','lime','teal','maroon','navy','indigo','white'], 2) },
    { id:68, difficulty:'medium', ...buildLevel(68, ['red','blue','green','yellow','orange','pink','cyan','teal','brown','maroon','navy','indigo'], 2) },
    { id:69, difficulty:'medium', ...buildLevel(69, ['red','blue','green','purple','orange','pink','cyan','lime','brown','maroon','navy','white'], 2) },
    { id:70, difficulty:'medium', ...buildLevel(70, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','maroon','indigo'], 1) },

    // ═══ HARD (71-90) ════════════════════════════════════
    { id:71, difficulty:'hard', ...buildLevel(71, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy'], 1) },
    { id:72, difficulty:'hard', ...buildLevel(72, ['red','blue','green','yellow','purple','orange','pink','teal','lime','brown','maroon','navy','indigo'], 1) },
    { id:73, difficulty:'hard', ...buildLevel(73, ['red','blue','green','yellow','purple','orange','cyan','lime','teal','brown','maroon','indigo','white'], 1) },
    { id:74, difficulty:'hard', ...buildLevel(74, ['red','blue','green','yellow','purple','pink','cyan','lime','teal','brown','navy','indigo','white'], 1) },
    { id:75, difficulty:'hard', ...buildLevel(75, ['red','blue','green','orange','purple','pink','cyan','lime','teal','brown','maroon','navy','white'], 1) },
    { id:76, difficulty:'hard', ...buildLevel(76, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo'], 2) },
    { id:77, difficulty:'hard', ...buildLevel(77, ['red','blue','green','yellow','purple','orange','pink','lime','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:78, difficulty:'hard', ...buildLevel(78, ['red','blue','green','yellow','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:79, difficulty:'hard', ...buildLevel(79, ['red','blue','cyan','yellow','purple','orange','pink','lime','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:80, difficulty:'hard', ...buildLevel(80, ['red','green','purple','yellow','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:81, difficulty:'hard', ...buildLevel(81, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo'], 1) },
    { id:82, difficulty:'hard', ...buildLevel(82, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','white','indigo'], 1) },
    { id:83, difficulty:'hard', ...buildLevel(83, ['red','blue','green','yellow','orange','pink','cyan','lime','teal','brown','navy','indigo','white','maroon'], 1) },
    { id:84, difficulty:'hard', ...buildLevel(84, ['red','blue','green','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 1) },
    { id:85, difficulty:'hard', ...buildLevel(85, ['red','blue','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 1) },
    { id:86, difficulty:'hard', ...buildLevel(86, ['red','blue','green','yellow','purple','orange','pink','cyan','teal','brown','maroon','navy','indigo','white'], 1) },
    { id:87, difficulty:'hard', ...buildLevel(87, ['red','blue','green','yellow','purple','pink','cyan','lime','brown','maroon','navy','indigo','white','orange'], 1) },
    { id:88, difficulty:'hard', ...buildLevel(88, ['red','blue','green','yellow','purple','orange','pink','lime','brown','maroon','navy','indigo','white','teal'], 1) },
    { id:89, difficulty:'hard', ...buildLevel(89, ['red','blue','green','yellow','purple','orange','cyan','lime','teal','maroon','navy','indigo','white','brown'], 1) },
    { id:90, difficulty:'hard', ...buildLevel(90, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','maroon','navy','indigo','white'], 1) },

    // ═══ EXPERT (91-100) ═════════════════════════════════
    { id:91, difficulty:'expert', ...buildLevel(91, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:92, difficulty:'expert', ...buildLevel(92, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 1) },
    { id:93, difficulty:'expert', ...buildLevel(93, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','white','indigo'], 2) },
    { id:94, difficulty:'expert', ...buildLevel(94, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','maroon','navy','indigo','white','brown'], 2) },
    { id:95, difficulty:'expert', ...buildLevel(95, ['red','blue','green','yellow','purple','orange','pink','lime','teal','brown','maroon','navy','indigo','white','cyan'], 2) },
    { id:96, difficulty:'expert', ...buildLevel(96, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 2) },
    { id:97, difficulty:'expert', ...buildLevel(97, ['red','blue','green','yellow','purple','orange','pink','cyan','teal','brown','maroon','navy','indigo','white','lime'], 2) },
    { id:98, difficulty:'expert', ...buildLevel(98, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','brown','maroon','navy','indigo','white','teal'], 2) },
    { id:99, difficulty:'expert', ...buildLevel(99, ['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','maroon','indigo','white','brown','navy'], 2) },
    { id:100,difficulty:'expert', ...buildLevel(100,['red','blue','green','yellow','purple','orange','pink','cyan','lime','teal','brown','maroon','navy','indigo','white'], 2) },
  ];

  // ── Procedural level generator (for Infinite Mode) ─────
  function generateLevel(seed, difficulty = 'medium') {
    const rng = Utils.seededRng(seed);
    const configs = {
      beginner:{ colors:3, empties:2 },
      easy:    { colors:5, empties:1 },
      medium:  { colors:7, empties:2 },
      hard:    { colors:10,empties:2 },
      expert:  { colors:13,empties:2 }
    };
    const cfg = configs[difficulty] || configs.medium;

    // Pick random colors
    const colorPool = [...COLORS];
    Utils.shuffle(colorPool, rng);
    const colors = colorPool.slice(0, cfg.colors);

    return buildLevel(seed, colors, cfg.empties, seed);
  }

  // ── Daily Challenge ────────────────────────────────────
  function getDailyChallenge() {
    const seed = Utils.dailySeed();
    const rng  = Utils.seededRng(seed);
    const difficulties = ['easy','medium','medium','hard','expert'];
    const diff = difficulties[Math.floor(rng() * difficulties.length)];
    const level = generateLevel(seed * 13, diff);
    level.isDaily = true;
    level.id = 'daily_' + Utils.todayStr();
    return level;
  }

  // ── Public API ─────────────────────────────────────────
  function getAll() { return HAND_CRAFTED; }

  function getById(id) { return HAND_CRAFTED.find(l => l.id === id); }

  function getByDifficulty(diff) { return HAND_CRAFTED.filter(l => l.difficulty === diff); }

  function getDifficulty(levelId) {
    const l = getById(levelId);
    return l ? l.difficulty : 'beginner';
  }

  function getDifficultyMeta(diff) { return DIFFICULTIES[diff] || DIFFICULTIES.beginner; }

  function getTubeSize(tubeCount) {
    if (tubeCount <= 5)  return 'sz-lg';
    if (tubeCount <= 8)  return 'sz-md';
    if (tubeCount <= 12) return 'sz-sm';
    return 'sz-sm';
  }

  /** Calculate star rating for a completed level */
  function calcStars(levelId, moves, timeSec) {
    const l = getById(levelId);
    if (!l) return 1;
    const meta = getDifficultyMeta(l.difficulty);
    const colorCount = l.colors || (l.tubes ? l.tubes.filter(t => t.length > 0).length : 3);
    const optimalMoves = colorCount * 3; // rough estimate

    let stars = 1;
    if (moves <= optimalMoves * meta.moveBonus) stars = 2;
    if (moves <= optimalMoves * meta.moveBonus * 0.85 && timeSec <= meta.timeBonus) stars = 3;
    return stars;
  }

  return {
    getAll, getById, getByDifficulty, getDifficulty, getDifficultyMeta,
    getTubeSize, calcStars, generateLevel, getDailyChallenge,
    DIFFICULTIES, COLORS, TUBE_CAPACITY
  };
})();

window.Levels = Levels;
