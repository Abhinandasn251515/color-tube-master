/* ═══════════════════════════════════════════════════════════
   renderer.js — DOM Rendering with New Premium Tube Structure
═══════════════════════════════════════════════════════════ */

const Renderer = (() => {

  let container = null;
  let tubeEls   = [];

  function init() {
    container = document.getElementById('tubes-container');
  }

  /** Build tube HTML with new premium structure */
  function buildTubeHTML(tube, idx, tubeSize, skinClass, isFilter = false) {
    const wrap = document.createElement('div');
    wrap.className = `tube-wrap ${tubeSize || 'sz-md'} ${isFilter ? 'tube-filter' : ''}`;
    wrap.dataset.idx = idx;

    // Glass rim (top opening)
    const rim = document.createElement('div');
    rim.className = 'tube-glass-rim';

    // Outer container for cylinder + base
    const outer = document.createElement('div');
    outer.className = `tube-outer ${skinClass}`;

    // Cylinder (straight part)
    const cyl = document.createElement('div');
    cyl.className = 'tube-cylinder';

    // Glass background tint
    const glassBg = document.createElement('div');
    glassBg.className = 'tube-glass-bg';

    // Glass shine layers
    const shine1 = document.createElement('div');
    shine1.className = 'tube-glass-shine';
    const shine2 = document.createElement('div');
    shine2.className = 'tube-glass-shine2';
    const center = document.createElement('div');
    center.className = 'tube-glass-center';

    // Liquids
    const liquids = document.createElement('div');
    liquids.className = 'tube-liquids';

    for (let i = 0; i < tube.length; i++) {
      const layer = document.createElement('div');
      layer.className = 'liquid-layer';
      layer.dataset.color = tube[i];
      if (i === tube.length - 1) layer.classList.add('top-layer');
      liquids.appendChild(layer);
    }

    cyl.appendChild(glassBg);
    cyl.appendChild(shine1);
    cyl.appendChild(shine2);
    cyl.appendChild(center);
    cyl.appendChild(liquids);

    // Base (rounded bottom)
    const base = document.createElement('div');
    base.className = 'tube-base';

    // Base fill (shows the bottom color)
    const baseFill = document.createElement('div');
    baseFill.className = 'tube-base-fill';
    if (tube.length > 0) {
      baseFill.dataset.color = tube[0]; // bottom color
      baseFill.style.opacity = '1';
    }
    base.appendChild(baseFill);

    outer.appendChild(cyl);
    outer.appendChild(base);

    // Shadow
    const shadow = document.createElement('div');
    shadow.className = 'tube-shadow';

    wrap.appendChild(rim);
    wrap.appendChild(outer);
    wrap.appendChild(shadow);

    return wrap;
  }

  /** Render full tube grid */
  function renderTubes(tubes, tubeSize, filterIndices = []) {
    if (!container) init();
    container.innerHTML = '';
    tubeEls = [];

    const skin = Storage.get('equippedSkin') || 'default';
    const skinClass = skin !== 'default' ? `skin-${skin}` : '';

    tubes.forEach((tube, idx) => {
      const isFilter = filterIndices && filterIndices.includes(idx);
      const wrap = buildTubeHTML(tube, idx, tubeSize, skinClass, isFilter);
      container.appendChild(wrap);
      tubeEls.push(wrap);
    });

    return tubeEls;
  }

  /** Update a single tube's liquids */
  function updateTube(idx, tube) {
    const wrap = tubeEls[idx];
    if (!wrap) return;

    const liquids  = wrap.querySelector('.tube-liquids');
    const baseFill = wrap.querySelector('.tube-base-fill');
    if (!liquids) return;

    // Rebuild liquid layers
    liquids.innerHTML = '';
    for (let i = 0; i < tube.length; i++) {
      const layer = document.createElement('div');
      layer.className = 'liquid-layer';
      layer.dataset.color = tube[i];
      if (i === tube.length - 1) layer.classList.add('top-layer');
      liquids.appendChild(layer);
    }

    // Update base fill
    if (baseFill) {
      if (tube.length > 0) {
        baseFill.dataset.color = tube[0];
        baseFill.style.opacity = '1';
      } else {
        baseFill.removeAttribute('data-color');
        baseFill.style.opacity = '0';
      }
    }
  }

  /** Select a tube */
  function selectTube(idx) {
    tubeEls.forEach((el, i) => el.classList.toggle('selected', i === idx));
  }

  /** Clear selection */
  function clearSelection() {
    tubeEls.forEach(el => el.classList.remove('selected'));
  }

  /** Hint highlight */
  function hintTube(fromIdx, toIdx) {
    tubeEls.forEach((el, i) => {
      el.classList.remove('hint-tube');
      if (i === fromIdx || i === toIdx) el.classList.add('hint-tube');
    });
    setTimeout(() => tubeEls.forEach(el => el.classList.remove('hint-tube')), 2200);
  }

  /** Shake tube */
  function shakeTube(idx) {
    const el = tubeEls[idx];
    if (el) Animations.shakeTube(el);
  }

  /** Mark win */
  function markDone(idx) {
    const el = tubeEls[idx];
    if (el) Animations.markTubeWin(el);
  }

  /** Mark all complete */
  function markAllDone(tubes) {
    tubes.forEach((tube, idx) => {
      if (tube.length === 4 && tube.every(c => c === tube[0])) markDone(idx);
    });
  }

  function getTubeEl(idx)    { return tubeEls[idx] || null; }
  function getTubeOuter(idx) {
    const wrap = tubeEls[idx];
    return wrap ? wrap.querySelector('.tube-cylinder') : null;
  }

  async function animatePour(fromIdx, toIdx, color) {
    const fromEl = getTubeOuter(fromIdx);
    const toEl   = getTubeOuter(toIdx);
    if (!fromEl || !toEl) return;
    return new Promise(resolve => Animations.animatePour(fromEl, toEl, color, resolve));
  }

  function setTubeSize(size) {
    tubeEls.forEach(el => {
      el.classList.remove('sz-sm','sz-md','sz-lg','sz-xl');
      el.classList.add(size);
    });
  }

  return { init, renderTubes, updateTube, selectTube, clearSelection, hintTube, shakeTube, markDone, markAllDone, getTubeEl, getTubeOuter, animatePour, setTubeSize };
})();

window.Renderer = Renderer;
