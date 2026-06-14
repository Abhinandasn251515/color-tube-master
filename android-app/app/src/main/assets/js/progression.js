/* ═══════════════════════════════════════════════════════════
   progression.js — XP, Ranks, Achievements
═══════════════════════════════════════════════════════════ */

const Progression = (() => {

  // ── Rank Thresholds ─────────────────────────────────────
  const RANKS = [
    { name:'Beginner',    xp:0,    emoji:'🔵', class:'rank-beginner' },
    { name:'Skilled',     xp:500,  emoji:'🟢', class:'rank-skilled' },
    { name:'Expert',      xp:1500, emoji:'🟣', class:'rank-expert' },
    { name:'Master',      xp:3500, emoji:'🟡', class:'rank-master' },
    { name:'Grand Master',xp:7500, emoji:'🔴', class:'rank-grandmaster' },
    { name:'Puzzle Legend',xp:15000,emoji:'⭐', class:'rank-legend' },
  ];

  // ── Achievements ──────────────────────────────────────
  const ACHIEVEMENTS = [
    { id:'first_level',   icon:'🎯', name:'First Steps',       desc:'Complete your first level',          check: s => s.completedCount >= 1 },
    { id:'ten_levels',    icon:'🔟', name:'Getting Started',   desc:'Complete 10 levels',                 check: s => s.completedCount >= 10 },
    { id:'fifty_levels',  icon:'🏅', name:'Halfway There',     desc:'Complete 50 levels',                 check: s => s.completedCount >= 50 },
    { id:'all_levels',    icon:'🏆', name:'Master Solver',     desc:'Complete all 100 levels',            check: s => s.completedCount >= 100 },
    { id:'no_hints',      icon:'🧠', name:'Pure Logic',        desc:'Complete a level without hints',     check: s => s.noHintLevel },
    { id:'speed_demon',   icon:'⚡', name:'Speed Demon',       desc:'Complete a level in under 60s',      check: s => s.fastLevel },
    { id:'streak_7',      icon:'🔥', name:'Week Warrior',      desc:'Login 7 days in a row',              check: s => s.loginStreak >= 7 },
    { id:'streak_30',     icon:'💎', name:'Monthly Master',    desc:'Login 30 days in a row',             check: s => s.loginStreak >= 30 },
    { id:'undo_zero',     icon:'🎯', name:'No Regrets',        desc:'Complete a level without undo',      check: s => s.noUndoLevel },
    { id:'coins_1000',    icon:'🪙', name:'Coin Collector',    desc:'Collect 1,000 coins total',          check: s => s.coinsTotal >= 1000 },
    { id:'three_stars',   icon:'⭐', name:'Perfectionist',     desc:'Get 3 stars on a level',             check: s => s.threeStarCount >= 1 },
    { id:'ten_3stars',    icon:'🌟', name:'Star Hunter',       desc:'Get 3 stars on 10 levels',           check: s => s.threeStarCount >= 10 },
    { id:'daily_done',    icon:'📅', name:'Daily Devotion',    desc:'Complete a daily challenge',         check: s => s.dailyDone },
    { id:'expert_done',   icon:'💪', name:'Expert Mind',       desc:'Complete an Expert level',           check: s => s.expertDone },
    { id:'first_hint',    icon:'💡', name:'Need a Hand?',      desc:'Use your first hint',                check: s => s.hintUsed },
  ];

  // ── XP Rewards ────────────────────────────────────────
  const XP = {
    level_base:    50,
    level_star2:   20,
    level_star3:   50,
    level_nohint:  30,
    level_speed:   25,
    daily:         100,
    achievement:   75,
  };

  // ── Coin/Gem Rewards ──────────────────────────────────
  function levelRewards(stars, difficulty) {
    const base = { beginner:10, easy:15, medium:25, hard:40, expert:60 };
    const coins = (base[difficulty] || 10) * stars;
    const gems  = stars === 3 ? (difficulty === 'expert' ? 3 : 1) : 0;
    return { coins, gems };
  }

  // ── Rank Calculation ──────────────────────────────────
  function getRank(xp) {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (xp >= r.xp) rank = r;
    }
    return rank;
  }

  function getNextRank(xp) {
    for (const r of RANKS) {
      if (xp < r.xp) return r;
    }
    return null;
  }

  function getXPProgress(xp) {
    const rank = getRank(xp);
    const next = getNextRank(xp);
    if (!next) return 1;
    const rStart = rank.xp;
    const rEnd   = next.xp;
    return (xp - rStart) / (rEnd - rStart);
  }

  // ── Achievement Check ─────────────────────────────────
  function checkAchievements(context) {
    // context: { completedCount, noHintLevel, fastLevel, loginStreak, noUndoLevel, coinsTotal, threeStarCount, dailyDone, expertDone, hintUsed }
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      if (Storage.isAchievementUnlocked(ach.id)) continue;
      if (ach.check(context)) {
        const isNew = Storage.unlockAchievement(ach.id);
        if (isNew) {
          newlyUnlocked.push(ach);
          // Award XP
          Storage.addXP(XP.achievement);
          
          // Android Native Bridge Hook
          if (typeof AndroidBridge !== 'undefined') {
            try { AndroidBridge.unlockAchievement(ach.id); } catch(e) { console.error('[Bridge] Achievement Error:', e); }
          }
        }
      }
    }

    return newlyUnlocked;
  }

  // ── Level Complete Processing ─────────────────────────
  function onLevelComplete({ levelId, moves, timeSec, usedHint, usedUndo, difficulty, stars }) {
    let xpGained = XP.level_base;
    if (stars >= 2) xpGained += XP.level_star2;
    if (stars >= 3) xpGained += XP.level_star3;
    if (!usedHint)  xpGained += XP.level_nohint;
    if (timeSec < 60) xpGained += XP.level_speed;

    const totalXP = Storage.addXP(xpGained);
    Storage.saveLevel(levelId, stars, moves, timeSec);

    // Android Native Bridge Hook
    if (typeof AndroidBridge !== 'undefined') {
      try { AndroidBridge.submitScore(totalXP); } catch(e) { console.error('[Bridge] Submit Score Error:', e); }
    }

    const { coins, gems } = levelRewards(stars, difficulty || 'beginner');
    const totalCoins = Storage.addCoins(coins);
    if (gems > 0) Storage.addGems(gems);

    const newRank = getRank(totalXP);
    Storage.set('rank', newRank.name);

    const completedCount = Storage.countCompleted();
    const levelsData = Storage.get('levelsCompleted') || {};
    const threeStarCount = Object.values(levelsData).filter(l => l.stars === 3).length;

    const context = {
      completedCount,
      noHintLevel: !usedHint,
      fastLevel: timeSec < 60,
      loginStreak: Storage.get('loginStreak') || 0,
      noUndoLevel: !usedUndo,
      coinsTotal: totalCoins,
      threeStarCount,
      dailyDone: !!(Storage.get('dailyDone')),
      expertDone: difficulty === 'expert',
      hintUsed: usedHint,
    };

    const achUnlocked = checkAchievements(context);

    return {
      xpGained,
      totalXP,
      coins,
      gems,
      totalCoins,
      newRank,
      achUnlocked,
      stars
    };
  }

  // ── Daily Login Reward Content ─────────────────────────
  function getLoginReward(day) {
    const rewards = [
      { items: [{ icon:'🪙', amount:'+20 Coins', type:'coins', value:20 }] },
      { items: [{ icon:'💡', amount:'+1 Hint',   type:'hints', value:1  }] },
      { items: [{ icon:'🪙', amount:'+30 Coins', type:'coins', value:30 }, { icon:'💎', amount:'+1 Gem', type:'gems', value:1 }] },
      { items: [{ icon:'🎨', amount:'Theme Item', type:'theme', value:0  }] },
      { items: [{ icon:'🪙', amount:'+50 Coins', type:'coins', value:50 }] },
      { items: [{ icon:'💎', amount:'+3 Gems',   type:'gems',  value:3  }] },
      { items: [{ icon:'🎁', amount:'Special! +100 Coins +5 Gems', type:'special', coinsValue:100, gemsValue:5 }] },
    ];
    const dayReward = rewards[(day - 1) % 7];

    // Apply reward
    for (const item of dayReward.items) {
      if (item.type === 'coins')   Storage.addCoins(item.value);
      else if (item.type === 'gems')    Storage.addGems(item.value);
      else if (item.type === 'hints')   Storage.set('hintsRemaining', (Storage.get('hintsRemaining')||0) + item.value);
      else if (item.type === 'special') { Storage.addCoins(item.coinsValue); Storage.addGems(item.gemsValue); }
    }

    return dayReward;
  }

  // ── Leaderboard (local) ───────────────────────────────
  function getLeaderboard() {
    const playerName = Storage.get('playerName') || 'Player';
    const xp = Storage.get('xp') || 0;
    const completed = Storage.countCompleted();

    // Fake global leaderboard entries
    const fakeEntries = [
      { name:'PuzzleKing',   score:15234, avatar:'👑', rank:1 },
      { name:'SortMaster',   score:12100, avatar:'🧪', rank:2 },
      { name:'LiquidLegend', score:9876,  avatar:'💧', rank:3 },
      { name:'TubeWizard',   score:8543,  avatar:'🔮', rank:4 },
      { name:'ColorPro',     score:7200,  avatar:'🎨', rank:5 },
      { name:'MixMaster',    score:6100,  avatar:'🌈', rank:6 },
      { name:'SortSage',     score:5432,  avatar:'🧙', rank:7 },
      { name:'VialVictor',   score:4300,  avatar:'⚗️', rank:8 },
      { name:'FlaskFury',    score:3200,  avatar:'🔬', rank:9 },
    ];

    // Insert player
    const playerScore = xp + (completed * 50);
    const playerEntry = { name: playerName, score: playerScore, avatar:'🎮', isMe: true };
    const all = [...fakeEntries, playerEntry].sort((a,b) => b.score - a.score);
    all.forEach((e, i) => e.rank = i + 1);

    return all;
  }

  function claimPromoCode(rawCode) {
    if (!rawCode) return { success: false, message: 'Please enter a code!' };
    const code = rawCode.trim().toUpperCase();
    const save = Storage.data();
    if (!save.claimedCodes) save.claimedCodes = {};

    if (save.claimedCodes[code]) {
      return { success: false, message: 'Code already claimed!' };
    }

    const ownReferral = (save.referralCode || '').toUpperCase();
    if (code === ownReferral) {
      return { success: false, message: 'You cannot use your own referral code!' };
    }

    // Check if it's a valid referral pattern: CTM-XXXXXX
    const isReferralPattern = /^CTM-[A-Z0-9]{6}$/.test(code);

    if (isReferralPattern) {
      Storage.addCoins(150);
      Storage.addGems(10);
      save.claimedCodes[code] = true;
      Storage.save();
      return { success: true, message: 'Referral reward claimed: 🪙 150 & 💎 10!' };
    }

    if (code === 'VIRAL100') {
      Storage.addCoins(100);
      save.claimedCodes[code] = true;
      Storage.save();
      return { success: true, message: 'Promo reward claimed: 🪙 100!' };
    }

    if (code === 'SUPERGEM') {
      Storage.addGems(50);
      save.claimedCodes[code] = true;
      Storage.save();
      return { success: true, message: 'Promo reward claimed: 💎 50!' };
    }

    if (code === 'NEONSKIN') {
      Storage.ownSkin('neon');
      save.claimedCodes[code] = true;
      Storage.save();
      return { success: true, message: 'Promo reward claimed: ⚡ Neon Glow Skin!' };
    }

    return { success: false, message: 'Invalid or expired code!' };
  }

  return {
    RANKS, ACHIEVEMENTS, XP,
    getRank, getNextRank, getXPProgress,
    checkAchievements, onLevelComplete,
    levelRewards, getLoginReward, getLeaderboard,
    claimPromoCode
  };
})();

window.Progression = Progression;
