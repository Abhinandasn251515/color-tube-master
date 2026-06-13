/* ═══════════════════════════════════════════════════════════
   storage.js — LocalStorage Save System
═══════════════════════════════════════════════════════════ */

const Storage = (() => {
  const KEY = 'ctm3d_save';

  const DEFAULTS = {
    playerName:    'Puzzle Master',
    theme:         'lab',
    tubeSkin:      'default',
    coins:         50,
    gems:          5,
    xp:            0,
    rank:          'Beginner',
    levelsCompleted: {},   // { levelId: { stars, moves, time } }
    achievements:  {},     // { achId: true }
    hintsRemaining:3,
    loginStreak:   0,
    lastLoginDate: null,
    dailyDone:     null,   // date string if today's challenge done
    sfxOn:         true,
    musicOn:       true,
    hapticOn:      true,
    ownedThemes:   ['lab'],
    ownedSkins:    ['default'],
    equippedTheme: 'lab',
    equippedSkin:  'default',
    totalMoves:    0,
    totalTime:     0,
    noHintLevels:  0,
    weeklyScore:   0,
    weeklyDate:    null,
    infiniteHighScore: 0,
  };

  let _data = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        _data = Object.assign({}, DEFAULTS, JSON.parse(raw));
      } else {
        _data = { ...DEFAULTS };
      }
    } catch(e) {
      console.warn('Save load error, using defaults:', e);
      _data = { ...DEFAULTS };
    }
    return _data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(_data));
    } catch(e) {
      console.warn('Save error:', e);
    }
  }

  function get(key) {
    if (!_data) load();
    return _data[key];
  }

  function set(key, value) {
    if (!_data) load();
    _data[key] = value;
    save();
  }

  function data() {
    if (!_data) load();
    return _data;
  }

  function reset() {
    _data = { ...DEFAULTS };
    save();
  }

  function saveLevel(levelId, stars, moves, time) {
    if (!_data) load();
    const prev = _data.levelsCompleted[levelId];
    if (!prev || stars > prev.stars || (stars === prev.stars && moves < prev.moves)) {
      _data.levelsCompleted[levelId] = { stars, moves, time };
    }
    _data.totalMoves = (_data.totalMoves || 0) + moves;
    _data.totalTime  = (_data.totalTime  || 0) + time;
    save();
  }

  function getLevelData(levelId) {
    if (!_data) load();
    return _data.levelsCompleted[levelId] || null;
  }

  function countCompleted() {
    if (!_data) load();
    return Object.keys(_data.levelsCompleted).length;
  }

  function unlockAchievement(achId) {
    if (!_data) load();
    if (_data.achievements[achId]) return false; // already unlocked
    _data.achievements[achId] = true;
    save();
    return true;
  }

  function isAchievementUnlocked(achId) {
    if (!_data) load();
    return !!_data.achievements[achId];
  }

  function addCoins(n) {
    if (!_data) load();
    _data.coins = (_data.coins || 0) + n;
    save();
    return _data.coins;
  }

  function spendCoins(n) {
    if (!_data) load();
    if (_data.coins < n) return false;
    _data.coins -= n;
    save();
    return true;
  }

  function addGems(n) {
    if (!_data) load();
    _data.gems = (_data.gems || 0) + n;
    save();
    return _data.gems;
  }

  function spendGems(n) {
    if (!_data) load();
    if (_data.gems < n) return false;
    _data.gems -= n;
    save();
    return true;
  }

  function addXP(n) {
    if (!_data) load();
    _data.xp = (_data.xp || 0) + n;
    save();
    return _data.xp;
  }

  function checkLoginReward() {
    if (!_data) load();
    const today = Utils.todayStr();
    if (_data.lastLoginDate === today) return null; // already claimed today

    let streak = _data.loginStreak || 0;
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();

    if (_data.lastLoginDate === yesterday) {
      streak += 1;
    } else if (_data.lastLoginDate !== today) {
      streak = 1;
    }

    _data.loginStreak = streak;
    _data.lastLoginDate = today;
    save();

    // Return reward for this day
    const dayInCycle = ((streak - 1) % 7) + 1;
    return { day: dayInCycle, streak };
  }

  function isThemeOwned(theme) {
    if (!_data) load();
    return (_data.ownedThemes || ['lab']).includes(theme);
  }

  function ownTheme(theme) {
    if (!_data) load();
    if (!_data.ownedThemes) _data.ownedThemes = ['lab'];
    if (!_data.ownedThemes.includes(theme)) {
      _data.ownedThemes.push(theme);
    }
    save();
  }

  function isSkinOwned(skin) {
    if (!_data) load();
    return (_data.ownedSkins || ['default']).includes(skin);
  }

  function ownSkin(skin) {
    if (!_data) load();
    if (!_data.ownedSkins) _data.ownedSkins = ['default'];
    if (!_data.ownedSkins.includes(skin)) {
      _data.ownedSkins.push(skin);
    }
    save();
  }

  return {
    load, save, get, set, data, reset,
    saveLevel, getLevelData, countCompleted,
    unlockAchievement, isAchievementUnlocked,
    addCoins, spendCoins, addGems, spendGems, addXP,
    checkLoginReward,
    isThemeOwned, ownTheme, isSkinOwned, ownSkin
  };
})();

window.Storage = Storage;
