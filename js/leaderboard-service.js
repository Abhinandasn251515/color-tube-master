/* ═══════════════════════════════════════════════════════════
   leaderboard-service.js — Real-Time Firestore Leaderboard
═══════════════════════════════════════════════════════════ */

const LeaderboardService = (() => {

  let _listener = null;
  let _entries  = [];
  let _onUpdate = null;

  // ── Subscribe to real-time leaderboard ───────────────
  function subscribe(onUpdate) {
    _onUpdate = onUpdate;

    if (!Auth.isFirebaseReady()) {
      // Offline: use local fake data from Progression
      const fakeData = Progression.getLeaderboard();
      _entries = fakeData;
      if (_onUpdate) _onUpdate(_entries);
      return;
    }

    const db = Auth.getDb();
    if (!db) return;

    // Unsubscribe previous listener
    if (_listener) { _listener(); _listener = null; }

    // Listen to top 100 by score, real-time
    _listener = db.collection('leaderboard')
      .orderBy('score', 'desc')
      .limit(100)
      .onSnapshot(snapshot => {
        _entries = [];
        snapshot.forEach((doc, idx) => {
          const d = doc.data();
          _entries.push({
            uid:           doc.id,
            name:          d.displayName || 'Player',
            avatar:        d.avatar || '🧪',
            score:         d.score || 0,
            xp:            d.xp || 0,
            completedCount: d.completedCount || 0,
            rank:          idx + 1,
            isMe:          Auth.isLoggedIn() && Auth.getCurrentUser()?.uid === doc.id,
          });
        });

        // If logged-in user not in top 100, find their position
        if (Auth.isLoggedIn()) {
          const uid = Auth.getCurrentUser().uid;
          const meInList = _entries.find(e => e.uid === uid);

          if (!meInList) {
            // Append local player at bottom
            const localXP    = Storage.get('xp') || 0;
            const localComp  = Storage.countCompleted();
            const localScore = localXP + localComp * 100;
            _entries.push({
              uid:  uid,
              name: Storage.get('playerName') || 'You',
              avatar: Storage.get('playerAvatar') || '🧪',
              score: localScore,
              xp: localXP,
              completedCount: localComp,
              rank: _entries.length + 1,
              isMe: true,
              isEstimated: true,
            });
          } else {
            meInList.isMe = true;
          }
        }

        if (_onUpdate) _onUpdate(_entries);
      }, err => {
        console.warn('[Leaderboard] Snapshot error:', err.message);
        // Fallback to local
        _entries = Progression.getLeaderboard();
        if (_onUpdate) _onUpdate(_entries);
      });
  }

  // ── Unsubscribe ───────────────────────────────────────
  function unsubscribe() {
    if (_listener) { _listener(); _listener = null; }
  }

  // ── Get cached entries ────────────────────────────────
  function getEntries() { return _entries; }

  // ── Render leaderboard list into DOM ─────────────────
  function renderList(entries, containerId = 'lb-list') {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = '';

    if (!entries.length) {
      list.innerHTML = '<div class="lb-empty">No players yet. Be the first! 🏆</div>';
      return;
    }

    entries.slice(0, 50).forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = `lb-row ${entry.isMe ? 'me' : ''}`;
      if (entry.isEstimated) row.classList.add('lb-estimated');

      let rankDisplay;
      if (entry.rank === 1) rankDisplay = '🥇';
      else if (entry.rank === 2) rankDisplay = '🥈';
      else if (entry.rank === 3) rankDisplay = '🥉';
      else rankDisplay = `#${entry.rank}`;

      let rankClass = '';
      if (entry.rank === 1) rankClass = 'gold';
      else if (entry.rank === 2) rankClass = 'silver';
      else if (entry.rank === 3) rankClass = 'bronze';

      const scoreFormatted = Utils.formatNumber(entry.score);
      const completedStr   = entry.completedCount > 0 ? `${entry.completedCount} lvls` : '';

      row.innerHTML = `
        <div class="lb-rank-badge ${rankClass}">${rankDisplay}</div>
        <div class="lb-avatar-box">${entry.avatar}</div>
        <div class="lb-info">
          <div class="lb-name">${entry.isMe ? '⭐ ' : ''}${escapeHtml(entry.name)}${entry.isMe ? ' (You)' : ''}</div>
          <div class="lb-sub">${completedStr ? completedStr + ' · ' : ''}${Utils.formatNumber(entry.xp)} XP</div>
        </div>
        <div class="lb-score-box">
          <div class="lb-score-val">${scoreFormatted}</div>
          <div class="lb-score-lbl">pts</div>
        </div>
      `;

      list.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const el = document.createElement('div');
    el.textContent = str || '';
    return el.innerHTML;
  }

  return { subscribe, unsubscribe, getEntries, renderList };
})();

window.LeaderboardService = LeaderboardService;
