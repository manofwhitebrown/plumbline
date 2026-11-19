// motion/micro.js: micro-interactions with no edits to any screen. Everything is delegated or observed:
//   button release spring, number glow on counters, tab indicator that slides, list stagger-in (max 8), sheets and modals spring in.
// Transform and opacity only. Nothing here ever calls preventDefault or blocks a pointer event. Reduce motion turns it all off.
import { ease, DUR } from './easing.js';
import { springIn } from './transitions.js';

export const STAGGER_MAX = 8, STAGGER_STEP = 40;

// Pure: which of n children animate and with what delay. Only the first 8, 40 ms apart.
export function staggerPlan(n, max, step) {
  const m = Math.min(Math.max(0, n | 0), max == null ? STAGGER_MAX : max), s = step == null ? STAGGER_STEP : step;
  const out = [];
  for (let i = 0; i < m; i++) out.push({ index: i, delay: i * s });
  return out;
}

const LISTS = '.rw-list, .crew-list, .cx-list, .ws-uplist, [data-stagger]';

export function installMicro(opts) {
  const o = opts || {};
  const doc = o.doc || (typeof document !== 'undefined' ? document : null);
  const isReduced = typeof o.isReduced === 'function' ? o.isReduced : () => false;
  const root = o.root || (doc && doc.getElementById ? doc.getElementById('app') : null);
  const cleanups = [];
  const live = new Set();
  const m = { staggered: 0, sheets: 0, glows: 0, disposed: false };
  if (!doc || !root) return Object.assign(m, { dispose() {}, staggerIn() {}, placeIndicator() {} });

  const anim = (el, frames, ms, easing) => {
    if (isReduced() || !el || typeof el.animate !== 'function') return null;
    let a = null;
    try { a = el.animate(frames, { duration: ms, easing: easing || 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards', composite: 'add' }); } catch (e) { return null; }
    live.add(a); a.onfinish = a.oncancel = () => live.delete(a);
    return a;
  };

  // 1. button release: a tiny springy rebound when a finger lifts (the CSS :active press-in is polish.css, AI-2)
  const pressed = new Set();
  const down = (e) => { const b = e.target && e.target.closest ? e.target.closest('.btn:not(.disabled), .tabbar button') : null; if (b) pressed.add(b); };
  const up = () => {
    for (const b of Array.from(pressed)) { pressed.delete(b); anim(b, [{ transform: 'scale(-0.03)' }, { transform: 'scale(0.015)', offset: 0.55 }, { transform: 'scale(0)' }], 220, 'cubic-bezier(0.2, 0.9, 0.25, 1.06)'); }
  };
  root.addEventListener('pointerdown', down, { capture: true, passive: true });
  root.addEventListener('pointerup', up, { capture: true, passive: true });
  root.addEventListener('pointercancel', () => pressed.clear(), { capture: true, passive: true });
  cleanups.push(() => { root.removeEventListener('pointerdown', down, true); root.removeEventListener('pointerup', up, true); });

  // 2. number glow: when a counter's text starts changing, add .num-glow for one pulse. Not on the Drop HUD (it changes every frame).
  let mo = null;
  if (typeof MutationObserver === 'function') {
    mo = new MutationObserver((list) => {
      if (isReduced()) return;
      for (const r of list) {
        const el = r.target && (r.target.nodeType === 3 ? r.target.parentElement : r.target);
        if (!el || !el.classList || !el.classList.contains('num') || el.closest('.screen-drop') || el.classList.contains('num-glow')) continue;
        el.classList.add('num-glow'); m.glows++;
        const off = () => { el.classList.remove('num-glow'); el.removeEventListener('animationend', off); };
        el.addEventListener('animationend', off);
      }
    });
    mo.observe(root, { subtree: true, characterData: true, childList: true });
    cleanups.push(() => mo.disconnect());
  }

  // 3. list stagger: children of known lists slide in, max 8
  function staggerIn(scope) {
    if (isReduced() || !scope || !scope.querySelectorAll) return;
    for (const list of scope.querySelectorAll(LISTS)) {
      const kids = list.children;
      for (const p of staggerPlan(kids.length)) {
        const k = kids[p.index];
        const a = anim(k, [{ opacity: -1, transform: 'translate3d(0,10px,0)' }, { opacity: 0, transform: 'translate3d(0,0,0)' }], DUR.ui, undefined);
        if (a) { try { a.effect.updateTiming({ delay: p.delay }); } catch (e) { /* older engines: no stagger, still fine */ } m.staggered++; }
      }
    }
  }

  // 4. tab indicator: one bar that slides under the active tab
  let bar = null, barX = null;
  function placeIndicator() {
    const nav = doc.querySelector && doc.querySelector('.tabbar');
    if (!nav) return;
    const cur = nav.querySelector('[aria-current="page"]');
    if (!bar) {
      bar = doc.createElement('i'); bar.setAttribute('aria-hidden', 'true'); bar.className = 'tab-indicator';
      nav.appendChild(bar);
      if (typeof MutationObserver === 'function') { const o2 = new MutationObserver(() => placeIndicator()); o2.observe(nav, { subtree: true, attributes: true, attributeFilter: ['aria-current'] }); cleanups.push(() => o2.disconnect()); }
    }
    if (!cur) { bar.style.opacity = '0'; return; }
    const x = cur.offsetLeft + cur.offsetWidth / 2 - 14;
    bar.style.opacity = '1';
    const from = barX;
    barX = x; bar.style.transform = 'translate3d(' + x + 'px,0,0)';
    if (from != null && from !== x && !isReduced() && typeof bar.animate === 'function') {
      try { const a = bar.animate([{ transform: 'translate3d(' + from + 'px,0,0)' }, { transform: 'translate3d(' + x + 'px,0,0)' }], { duration: DUR.screen + 40, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.06)' }); live.add(a); a.onfinish = a.oncancel = () => live.delete(a); } catch (e) { /* ignore */ }
    }
  }

  // 5. sheets and modals spring in (the .scrim holds the panel; its backdrop blur is static CSS)
  let mo2 = null;
  if (typeof MutationObserver === 'function') {
    mo2 = new MutationObserver((list) => {
      for (const r of list) for (const n of r.addedNodes) {
        if (n.nodeType !== 1 || !n.classList || !n.classList.contains('scrim')) continue;
        const panel = n.firstElementChild; if (!panel) continue;
        m.sheets++; const s = springIn(panel, null, { reduce: isReduced(), from: n.classList.contains('sheet-scrim') ? 'bottom' : 'center' });
        if (s && s.anims) for (const a of s.anims) { live.add(a); a.onfinish = a.oncancel = () => live.delete(a); }
      }
    });
    mo2.observe(root, { childList: true, subtree: true });
    cleanups.push(() => mo2.disconnect());
  }

  m.staggerIn = staggerIn; m.placeIndicator = placeIndicator;
  m.dispose = () => { m.disposed = true; for (const f of cleanups.splice(0)) { try { f(); } catch (e) { /* ignore */ } } for (const a of Array.from(live)) { try { a.cancel(); } catch (e) { /* ignore */ } } live.clear(); if (bar && bar.remove) bar.remove(); bar = null; };
  Object.defineProperty(m, 'running', { get: () => live.size });
  return m;
}
export { ease };
