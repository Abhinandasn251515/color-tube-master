/* ═══════════════════════════════════════════════════════════
   auth-ui.js — Auth Screen UI Controller
   Manages: Login, Sign Up, Profile Modal, Avatar Picker
═══════════════════════════════════════════════════════════ */

const AuthUI = (() => {

  let activeTab = 'login';
  let selectedAvatar = '🧪';
  let passwordVisible = false;
  let isLoading = false;
  let onAuthSuccess = null;

  // ── Show Auth Overlay ─────────────────────────────────
  function show(onSuccess) {
    onAuthSuccess = onSuccess;
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    renderAvatarGrid();
    switchTab('login');
    clearErrors();
  }

  // ── Hide Auth Overlay ─────────────────────────────────
  function hide() {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) return;
    overlay.classList.add('hiding');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('hiding');
    }, 500);
  }

  // ── Switch Login / Sign Up Tab ─────────────────────────
  function switchTab(tab) {
    activeTab = tab;

    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    const loginFields  = document.getElementById('auth-login-fields');
    const signupFields = document.getElementById('auth-signup-fields');
    const submitBtn    = document.getElementById('auth-submit-btn');

    if (tab === 'login') {
      if (loginFields)  loginFields.style.display  = 'flex';
      if (signupFields) signupFields.style.display = 'none';
      if (submitBtn)    submitBtn.textContent       = 'Login';
    } else {
      if (loginFields)  loginFields.style.display  = 'none';
      if (signupFields) signupFields.style.display = 'flex';
      if (submitBtn)    submitBtn.textContent       = 'Create Account';
    }

    clearErrors();
  }

  // ── Render Avatar Grid ────────────────────────────────
  function renderAvatarGrid() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Auth.getAvatars().forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = `avatar-opt ${emoji === selectedAvatar ? 'selected' : ''}`;
      btn.textContent = emoji;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        selectedAvatar = emoji;
        grid.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      grid.appendChild(btn);
    });
  }

  // ── Google Sign-In ────────────────────────────────────
  async function handleGoogle() {
    if (isLoading || !Auth.isFirebaseReady()) {
      if (!Auth.isFirebaseReady()) {
        showError('Firebase is not configured yet. Please set up your Firebase project.');
      }
      return;
    }

    setLoading(true, 'google');
    try {
      const user = await Auth.loginWithGoogle();
      Audio.collect();
      await postAuth(user);
    } catch (e) {
      showError(friendlyError(e.code || e.message));
    } finally {
      setLoading(false, 'google');
    }
  }

  // ── Email/Password Submit ─────────────────────────────
  async function handleSubmit() {
    if (isLoading) return;
    clearErrors();

    // For login tab only — validate shared fields
    if (activeTab === 'login') {
      const email    = (document.getElementById('auth-email')?.value || '').trim();
      const password =  document.getElementById('auth-password')?.value || '';

      if (!email || !password) { showError('Please fill in all fields.'); return; }
      if (!isValidEmail(email)) { showError('Please enter a valid email address.'); return; }

      setLoading(true);
      try {
        const user = await Auth.login(email, password);
        Audio.collect();
        await postAuth(user);
      } catch (e) {
        showError(friendlyError(e.code || e.message));
      } finally {
        setLoading(false);
      }
      return;
    }
      const nameEl  = document.getElementById('auth-name');
      const emailEl = document.getElementById('auth-email-signup');
      const pwdEl   = document.getElementById('auth-password-signup');
      const name    = (nameEl?.value || '').trim();
      const sEmail  = (emailEl?.value || '').trim();
      const sPwd    = pwdEl?.value || '';

      if (!name || name.length < 2) {
        showError('Please enter a display name (at least 2 characters).');
        return;
      }
      if (!sEmail || !isValidEmail(sEmail)) {
        showError('Please enter a valid email address.');
        return;
      }
      if (sPwd.length < 6) {
        showError('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      try {
        const user = await Auth.signUp(sEmail, sPwd, name, selectedAvatar);
        Audio.collect();
        showSuccess('Account created! Welcome 🎉');
        await Utils.wait(1000);
        await postAuth(user);
      } catch (e) {
        showError(friendlyError(e.code || e.message));
      } finally {
        setLoading(false);
      }
  }

  // ── Guest Play ────────────────────────────────────────
  function handleGuest() {
    hide();
    if (onAuthSuccess) onAuthSuccess(null); // null = guest
    updateMenuAuthBadge(false);
  }

  // ── Post-Auth (on any successful login) ──────────────
  async function postAuth(user) {
    hide();
    updateMenuAuthBadge(true, user);

    // Update menu header with real user data
    const displayName = user.displayName || Storage.get('playerName') || 'Player';
    const avatar = Storage.get('playerAvatar') || '🧪';

    const nameEl = document.getElementById('menu-player-name');
    const avatarEl = document.getElementById('menu-player-avatar');
    if (nameEl)   nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = avatar;

    // Subscribe real-time leaderboard
    LeaderboardService.subscribe(entries => {
      LeaderboardService.renderList(entries, 'lb-list');
    });

    if (onAuthSuccess) onAuthSuccess(user);
  }

  // ── Update Menu Auth Badge ────────────────────────────
  function updateMenuAuthBadge(isLoggedIn, user) {
    const badge = document.getElementById('auth-status-badge');
    if (!badge) return;
    if (isLoggedIn && user) {
      badge.className = 'user-auth-badge logged-in';
      badge.innerHTML = '<span class="online-dot"></span> Online';
    } else {
      badge.className = 'user-auth-badge guest';
      badge.innerHTML = '👤 Guest';
    }
  }

  // ── Profile Modal ─────────────────────────────────────
  function showProfile() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    const user = Auth.getCurrentUser();
    const name   = user?.displayName || Storage.get('playerName') || 'Guest';
    const email  = user?.email || 'Not signed in';
    const avatar = Storage.get('playerAvatar') || '🧪';
    const xp     = Storage.get('xp') || 0;
    const coins  = Storage.get('coins') || 0;
    const completed = Storage.countCompleted();

    document.getElementById('profile-name-display').textContent = name;
    document.getElementById('profile-email-display').textContent = email;
    document.getElementById('profile-avatar-display').textContent = avatar;
    document.getElementById('profile-xp-val').textContent = Utils.formatNumber(xp);
    document.getElementById('profile-coins-val').textContent = Utils.formatNumber(coins);
    document.getElementById('profile-lvl-val').textContent = completed;

    // Update signout button visibility
    const signoutBtn = document.getElementById('profile-signout-btn');
    const loginBtn   = document.getElementById('profile-login-btn');
    if (signoutBtn) signoutBtn.style.display = Auth.isLoggedIn() ? 'block' : 'none';
    if (loginBtn)   loginBtn.style.display   = Auth.isLoggedIn() ? 'none' : 'block';

    // Populate avatar edit grid in profile
    const editGrid = document.getElementById('profile-avatar-grid');
    if (editGrid) {
      editGrid.innerHTML = '';
      Auth.getAvatars().forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = `avatar-opt ${emoji === avatar ? 'selected' : ''}`;
        btn.textContent = emoji;
        btn.type = 'button';
        btn.addEventListener('click', async () => {
          editGrid.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          Storage.set('playerAvatar', emoji);
          document.getElementById('profile-avatar-display').textContent = emoji;
          document.getElementById('menu-player-avatar').textContent = emoji;
          if (Auth.isLoggedIn()) {
            await Auth.updateProfile(name, emoji).catch(() => {});
          }
          Audio.tap();
        });
        editGrid.appendChild(btn);
      });
    }

    modal.style.display = 'flex';
  }

  function hideProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
  }

  async function handleSignOut() {
    try {
      await Auth.signOut();
      hideProfile();
      updateMenuAuthBadge(false);
      // Show auth overlay again
      show(null);
      Audio.tap();
    } catch (e) {
      console.error('[AuthUI] Sign-out error:', e);
    }
  }

  // ── Password Visibility Toggle ─────────────────────────
  function togglePassword() {
    const inp = document.getElementById('auth-password');
    const btn = document.getElementById('pwd-toggle');
    if (!inp) return;
    passwordVisible = !passwordVisible;
    inp.type = passwordVisible ? 'text' : 'password';
    if (btn) btn.textContent = passwordVisible ? '🙈' : '👁️';
  }

  // ── Forgot Password ───────────────────────────────────
  async function handleForgotPassword() {
    const email = (document.getElementById('auth-email')?.value || '').trim();
    if (!email) { showError('Enter your email first, then click Forgot Password.'); return; }
    if (!isValidEmail(email)) { showError('Please enter a valid email.'); return; }
    try {
      await Auth.resetPassword(email);
      showSuccess('Reset link sent! Check your inbox.');
    } catch (e) {
      showError(friendlyError(e.code));
    }
  }

  // ── Helpers ───────────────────────────────────────────
  function setLoading(on, type = 'submit') {
    isLoading = on;
    const btn = type === 'google'
      ? document.getElementById('btn-google-signin')
      : document.getElementById('auth-submit-btn');
    if (btn) {
      btn.disabled = on;
      if (on) {
        btn.dataset.origText = btn.textContent;
        btn.textContent = type === 'google' ? 'Signing in...' : 'Please wait...';
      } else {
        btn.textContent = btn.dataset.origText || btn.textContent;
      }
    }
  }

  function showError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = '⚠️ ' + msg; el.classList.add('visible'); }
  }
  function showSuccess(msg) {
    const el = document.getElementById('auth-success');
    if (el) { el.textContent = '✅ ' + msg; el.classList.add('visible'); }
  }
  function clearErrors() {
    const e = document.getElementById('auth-error');
    const s = document.getElementById('auth-success');
    if (e) e.classList.remove('visible');
    if (s) s.classList.remove('visible');
  }

  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  function friendlyError(code) {
    const map = {
      'auth/user-not-found':        'No account with that email. Try signing up!',
      'auth/wrong-password':        'Incorrect password. Try again.',
      'auth/email-already-in-use':  'Email already registered. Try logging in.',
      'auth/weak-password':         'Password too short (min 6 characters).',
      'auth/invalid-email':         'Invalid email address.',
      'auth/popup-closed-by-user':  'Sign-in cancelled.',
      'auth/network-request-failed':'Network error. Check your connection.',
      'auth/too-many-requests':     'Too many attempts. Please wait a moment.',
      'auth/invalid-credential':    'Invalid credentials. Please try again.',
    };
    return map[code] || (code ? code.replace('auth/', '') : 'Something went wrong. Please try again.');
  }

  // ── Bind Events ───────────────────────────────────────
  function bindEvents() {
    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Google
    document.getElementById('btn-google-signin')?.addEventListener('click', handleGoogle);

    // Submit
    document.getElementById('auth-submit-btn')?.addEventListener('click', handleSubmit);

    // Enter key on password
    document.getElementById('auth-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSubmit();
    });

    // Password toggle
    document.getElementById('pwd-toggle')?.addEventListener('click', togglePassword);

    // Forgot password
    document.getElementById('forgot-password-btn')?.addEventListener('click', handleForgotPassword);

    // Guest
    document.getElementById('btn-guest-play')?.addEventListener('click', handleGuest);

    // Profile modal
    document.getElementById('menu-player-avatar')?.addEventListener('click', showProfile);
    document.getElementById('profile-close-btn')?.addEventListener('click', hideProfile);
    document.getElementById('profile-signout-btn')?.addEventListener('click', handleSignOut);
    document.getElementById('profile-login-btn')?.addEventListener('click', () => {
      hideProfile();
      show(null);
    });
    document.getElementById('profile-avatar-display')?.addEventListener('click', () => {
      const section = document.getElementById('profile-avatar-edit');
      if (section) section.classList.toggle('open');
    });

    // Close profile on backdrop click
    document.getElementById('profile-modal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('profile-modal')) hideProfile();
    });
  }

  return { show, hide, bindEvents, showProfile, hideProfile, updateMenuAuthBadge, switchTab };
})();

window.AuthUI = AuthUI;
