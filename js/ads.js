/* ═══════════════════════════════════════════════════════════
   ads.js — AdSense / Rewarded Ads Manager
   Color Tube Master 3D

   HOW TO GO LIVE WITH REAL ADS:
   1. Apply at: https://adsense.google.com
   2. Wait for approval (usually 2–4 weeks)
   3. Replace the PUBLISHER_ID and SLOT IDs below
   4. Set CONFIG.enabled = true
   5. Run: firebase deploy --only hosting
═══════════════════════════════════════════════════════════ */

const AdsManager = (() => {
  'use strict';

  // ── Config — fill in after AdSense approval ───────────
  const CONFIG = {
    enabled:          false,               // ← set TRUE after AdSense approval
    publisherId:      'ca-pub-XXXXXXXXXXXXXXXX', // ← your Publisher ID
    bannerSlotMenu:   '1234567890',        // ← Menu banner ad unit ID
    bannerSlotWin:    '0987654321',        // ← Win screen banner ad unit ID
    interstitialSlot: '1122334455',        // ← Interstitial ad unit ID
    rewardedSlot:     '5544332211',        // ← Rewarded ad unit ID
  };

  // Show interstitial after every N level completions
  const INTERSTITIAL_EVERY = 3;
  let levelsSinceLastAd = 0;
  let adsLoaded = false;

  // ── Init ─────────────────────────────────────────────
  function init() {
    if (CONFIG.enabled && CONFIG.publisherId !== 'ca-pub-XXXXXXXXXXXXXXXX') {
      _loadAdSenseScript();
    } else {
      console.log('[Ads] Demo mode — real ads disabled. Configure IDs to enable.');
      _renderDemoBanners();
    }
  }

  function _loadAdSenseScript() {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CONFIG.publisherId}`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      adsLoaded = true;
      _initBanners();
      console.log('[Ads] AdSense loaded ✅');
    };
    script.onerror = () => {
      console.warn('[Ads] AdSense failed to load (ad blocker?)');
      _renderDemoBanners();
    };
    document.head.appendChild(script);
  }

  // ── Real AdSense Banner Init ──────────────────────────
  function _initBanners() {
    document.querySelectorAll('.adsense-unit').forEach(ins => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch(e) {}
    });
  }

  // ── Demo Banners (shown before AdSense approval) ──────
  function _renderDemoBanners() {
    const messages = [
      '🎮 Like this game? Share it with friends!',
      '🏆 Can you reach #1 on the leaderboard?',
      '⭐ Rate this game to help others find it!',
      '🧪 Try Expert mode — only the best can solve it!',
      '💎 Complete all 100 levels for Puzzle Legend rank!',
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    document.querySelectorAll('.ad-banner-wrap').forEach(wrap => {
      wrap.innerHTML = `
        <div class="ad-demo-banner">
          <span class="ad-demo-text">${msg}</span>
          <span class="ad-demo-label">AD</span>
        </div>
      `;
    });
  }

  // ── Called after every level complete ─────────────────
  function onLevelComplete() {
    levelsSinceLastAd++;
    if (levelsSinceLastAd >= INTERSTITIAL_EVERY) {
      levelsSinceLastAd = 0;
      // Small delay so win screen shows first
      setTimeout(() => {
        showInterstitial();
      }, 2500);
    }
  }

  // ── Interstitial ──────────────────────────────────────
  function showInterstitial() {
    if (CONFIG.enabled && adsLoaded) {
      _showRealInterstitial();
    } else {
      // In demo mode, skip interstitials silently
      // (don't want fake ads disrupting free play)
    }
  }

  function _showRealInterstitial() {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: CONFIG.publisherId,
        enable_page_level_ads: true,
      });
    } catch(e) {
      console.warn('[Ads] Interstitial failed:', e);
    }
  }

  // ── Rewarded Ad ───────────────────────────────────────
  function showRewarded(title, desc, onReward, onSkip) {
    // Always show rewarded modal (demo or real)
    _showRewardedModal(title, desc, onReward, onSkip);
  }

  function _showRewardedModal(title, desc, onReward, onSkip) {
    const modal   = document.getElementById('modal-ad');
    const titleEl = document.getElementById('ad-title');
    const descEl  = document.getElementById('ad-desc');
    const confirm = document.getElementById('ad-confirm');
    const cancel  = document.getElementById('ad-cancel');
    const fill    = document.getElementById('ad-bar-fill');
    const timerEl = document.getElementById('ad-timer');
    const adBox   = document.getElementById('ad-content-box');

    if (!modal) { if (onReward) onReward(); return; }

    // Populate
    if (titleEl) titleEl.textContent = title || 'Watch an Ad?';
    if (descEl)  descEl.textContent  = desc  || 'Watch a short video to claim your reward!';
    if (confirm) confirm.disabled = true;
    if (timerEl) timerEl.textContent = '5';
    if (fill)    fill.style.width = '0%';

    // Show real ad in box if configured
    if (adBox) {
      if (CONFIG.enabled && adsLoaded) {
        adBox.innerHTML = `
          <ins class="adsbygoogle adsense-unit"
               style="display:block;width:300px;height:250px;"
               data-ad-client="${CONFIG.publisherId}"
               data-ad-slot="${CONFIG.rewardedSlot}"></ins>
        `;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
      } else {
        adBox.innerHTML = `
          <div class="ad-placeholder-box">
            <div class="ad-placeholder-icon">📺</div>
            <div class="ad-placeholder-text">Short Ad</div>
            <div class="ad-placeholder-sub">Your reward is almost ready!</div>
          </div>
        `;
      }
    }

    modal.style.display = 'flex';
    Audio.tap();

    // Countdown
    let secs = 5;
    let cleared = false;
    const interval = setInterval(() => {
      if (cleared) return;
      secs--;
      if (timerEl) timerEl.textContent = Math.max(0, secs);
      if (fill) fill.style.width = `${((5 - secs) / 5) * 100}%`;
      if (secs <= 0) {
        clearInterval(interval);
        if (confirm) {
          confirm.disabled = false;
          confirm.textContent = '🎁 Claim Reward!';
        }
      }
    }, 1000);

    // Confirm
    if (confirm) {
      confirm.onclick = () => {
        cleared = true;
        clearInterval(interval);
        modal.style.display = 'none';
        confirm.textContent = 'Claim Reward';
        Audio.collect();
        if (onReward) onReward();
      };
    }

    // Cancel
    if (cancel) {
      cancel.onclick = () => {
        cleared = true;
        clearInterval(interval);
        modal.style.display = 'none';
        if (onSkip) onSkip();
      };
    }
  }

  // ── Banner refresh (every 60s for AdSense compliance) ─
  function _startBannerRefresh() {
    if (!CONFIG.enabled) return;
    setInterval(() => {
      document.querySelectorAll('.adsense-unit').forEach(ins => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch(e) {}
      });
    }, 60000);
  }

  // ── Public API ────────────────────────────────────────
  return {
    init,
    onLevelComplete,
    showInterstitial,
    showRewarded,
    isEnabled: () => CONFIG.enabled && adsLoaded,
  };
})();

window.AdsManager = AdsManager;
