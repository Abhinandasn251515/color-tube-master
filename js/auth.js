/* ═══════════════════════════════════════════════════════════
   auth.js — Firebase Authentication Service
   Handles: Email/Password, Google Sign-In, Guest, Sign-Out
═══════════════════════════════════════════════════════════ */

const Auth = (() => {

  let _auth = null;
  let _db   = null;
  let _currentUser = null;
  let _onAuthChange = null;
  let _firebaseReady = false;

  // Emoji avatars pool
  const AVATARS = ['🧪','🔬','🧫','🌡️','⚗️','🔭','🌈','🎯','🏆','💎','⚡','🦊','🐉','🦋','🌟','🎮','🎯','🧠','🚀','🌙'];

  // ── Initialize Firebase ──────────────────────────────────
  function init() {
    try {
      if (!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey.includes('PLACEHOLDER')) {
        console.warn('[Auth] Firebase not configured — running in offline/guest mode');
        _firebaseReady = false;
        return false;
      }

      // Initialize app if not already
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }

      _auth = firebase.auth();
      _db   = firebase.firestore();

      // Configure Firestore offline persistence
      _db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code !== 'failed-precondition') console.warn('[Firestore] Persistence:', err.code);
      });

      _firebaseReady = true;

      // Listen for auth state changes
      _auth.onAuthStateChanged(user => {
        _currentUser = user;
        if (_onAuthChange) _onAuthChange(user);
      });

      return true;
    } catch (e) {
      console.error('[Auth] Init error:', e);
      _firebaseReady = false;
      return false;
    }
  }

  // ── Sign Up (Email/Password) ───────────────────────────
  async function signUp(email, password, displayName, avatar) {
    if (!_firebaseReady) throw new Error('Firebase not configured');

    const cred = await _auth.createUserWithEmailAndPassword(email, password);
    const uid  = cred.user.uid;

    // Set display name on Firebase user
    await cred.user.updateProfile({ displayName });

    // Create Firestore user document
    const localData = Storage.data();
    await _db.collection('users').doc(uid).set({
      uid,
      displayName,
      email,
      avatar: avatar || '🧪',
      xp: localData.xp || 0,
      coins: localData.coins || 0,
      gems: localData.gems || 0,
      completedCount: Storage.countCompleted() || 0,
      rank: localData.rank || 'Beginner',
      loginStreak: localData.loginStreak || 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Write to leaderboard
    await updateLeaderboard(uid, displayName, avatar || '🧪', localData.xp || 0, Storage.countCompleted());

    return cred.user;
  }

  // ── Login (Email/Password) ─────────────────────────────
  async function login(email, password) {
    if (!_firebaseReady) throw new Error('Firebase not configured');
    const cred = await _auth.signInWithEmailAndPassword(email, password);
    await onLoginSuccess(cred.user);
    return cred.user;
  }

  // ── Google Sign-In ────────────────────────────────────
  async function loginWithGoogle() {
    if (!_firebaseReady) throw new Error('Firebase not configured');

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    const cred = await _auth.signInWithPopup(provider);
    const user = cred.user;
    const isNew = cred.additionalUserInfo?.isNewUser;

    if (isNew) {
      // First time Google login — create user doc
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      const localData = Storage.data();
      await _db.collection('users').doc(user.uid).set({
        uid: user.uid,
        displayName: user.displayName || 'Player',
        email: user.email,
        avatar,
        photoURL: user.photoURL || null,
        xp: localData.xp || 0,
        coins: localData.coins || 0,
        gems: localData.gems || 0,
        completedCount: Storage.countCompleted() || 0,
        rank: localData.rank || 'Beginner',
        loginStreak: 1,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await updateLeaderboard(user.uid, user.displayName || 'Player', avatar, localData.xp || 0, Storage.countCompleted());
    } else {
      await onLoginSuccess(user);
    }

    return user;
  }

  // ── On Login Success — sync cloud data ────────────────
  async function onLoginSuccess(user) {
    try {
      const doc = await _db.collection('users').doc(user.uid).get();
      if (doc.exists) {
        const cloudData = doc.data();
        // Merge: take max of local vs cloud
        const localXP        = Storage.get('xp') || 0;
        const mergedXP       = Math.max(localXP, cloudData.xp || 0);
        const localCompleted = Storage.countCompleted();
        const cloudCompleted = cloudData.completedCount || 0;

        // Update local storage with cloud data (taking max)
        if (mergedXP > localXP) Storage.set('xp', mergedXP);
        if (cloudData.coins > (Storage.get('coins') || 0)) Storage.set('coins', cloudData.coins);
        if (cloudData.gems  > (Storage.get('gems')  || 0)) Storage.set('gems',  cloudData.gems);
        if (cloudData.displayName) Storage.set('playerName', cloudData.displayName);
        if (cloudData.avatar) Storage.set('playerAvatar', cloudData.avatar);

        // Update lastActive
        await _db.collection('users').doc(user.uid).update({
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          xp: mergedXP,
        });
      }
    } catch (e) {
      console.warn('[Auth] Could not sync cloud data:', e.message);
    }
  }

  // ── Sign Out ──────────────────────────────────────────
  async function signOut() {
    if (!_firebaseReady || !_auth) return;
    await _auth.signOut();
    _currentUser = null;
  }

  // ── Update Leaderboard Entry ──────────────────────────
  async function updateLeaderboard(uid, displayName, avatar, xp, completedCount) {
    if (!_firebaseReady || !_db) return;
    try {
      const score = (xp || 0) + ((completedCount || 0) * 100);
      await _db.collection('leaderboard').doc(uid).set({
        uid,
        displayName: displayName || 'Player',
        avatar: avatar || '🧪',
        xp: xp || 0,
        score,
        completedCount: completedCount || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Auth] Leaderboard update failed:', e.message);
    }
  }

  // ── Sync progress to cloud (called after level complete) ─
  async function syncProgress() {
    if (!_firebaseReady || !_currentUser) return;
    try {
      const xp        = Storage.get('xp') || 0;
      const coins     = Storage.get('coins') || 0;
      const gems      = Storage.get('gems') || 0;
      const completed = Storage.countCompleted();
      const rank      = Storage.get('rank') || 'Beginner';
      const avatar    = Storage.get('playerAvatar') || '🧪';
      const name      = Storage.get('playerName') || _currentUser.displayName || 'Player';

      await _db.collection('users').doc(_currentUser.uid).update({
        xp, coins, gems,
        completedCount: completed,
        rank,
        displayName: name,
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await updateLeaderboard(_currentUser.uid, name, avatar, xp, completed);
    } catch (e) {
      console.warn('[Auth] Sync failed:', e.message);
    }
  }

  // ── Get current user ──────────────────────────────────
  function getCurrentUser()   { return _currentUser; }
  function isLoggedIn()       { return !!_currentUser; }
  function isFirebaseReady()  { return _firebaseReady; }
  function getAvatars()       { return AVATARS; }
  function getDb()            { return _db; }

  function onAuthChanged(cb)  { _onAuthChange = cb; }

  // ── Password reset ────────────────────────────────────
  async function resetPassword(email) {
    if (!_firebaseReady) return;
    await _auth.sendPasswordResetEmail(email);
  }

  // ── Update display name / avatar ──────────────────────
  async function updateProfile(displayName, avatar) {
    if (!_firebaseReady || !_currentUser) return;
    await _currentUser.updateProfile({ displayName });
    if (_db) {
      await _db.collection('users').doc(_currentUser.uid).update({
        displayName, avatar
      });
    }
    Storage.set('playerName',   displayName);
    Storage.set('playerAvatar', avatar);
  }

  return {
    init, signUp, login, loginWithGoogle, signOut,
    syncProgress, updateLeaderboard, updateProfile,
    getCurrentUser, isLoggedIn, isFirebaseReady,
    getAvatars, getDb, onAuthChanged, resetPassword
  };
})();

window.Auth = Auth;
