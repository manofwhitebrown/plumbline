// Screen size, safe areas (notch, home bar) and wide-screen check.
// Also sets CSS variables on <html> so screens can use them:
//   --app-h (real visible height), --safe-top / --safe-right / --safe-bottom / --safe-left,
// and data-wide="true" when the screen is a laptop-sized window.
import { log } from '../core/log.js';

const WIDE_MIN = 900;
const DEFAULT = { w: 360, h: 640, dpr: 1 };
let probe = null;
let safeCache = null;
const listeners = new Set();
let watching = false;

function hasDom() { return typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.documentElement; }

// Read env(safe-area-inset-*) by measuring a hidden element.
export function getSafeArea() {
  if (safeCache) return safeCache;
  const out = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!hasDom() || !document.body) return out;
  try {
    if (!probe) {
      probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(probe);
    }
    const cs = getComputedStyle(probe);
    const px = (s) => { const n = parseFloat(s); return Number.isFinite(n) && n > 0 ? n : 0; };
    out.top = px(cs.paddingTop); out.right = px(cs.paddingRight);
    out.bottom = px(cs.paddingBottom); out.left = px(cs.paddingLeft);
    safeCache = out;
  } catch (err) { log.warn('could not read safe area', err); }
  return out;
}

export function getViewport() {
  if (!hasDom()) return { ...DEFAULT, safe: { top: 0, right: 0, bottom: 0, left: 0 }, wide: false };
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round((vv && vv.width) || window.innerWidth || DEFAULT.w));
  const h = Math.max(1, Math.round((vv && vv.height) || window.innerHeight || DEFAULT.h));
  const dpr = Math.min(2, Math.max(1, Number(window.devicePixelRatio) || 1)); // capped at 2 on purpose
  return { w, h, dpr, safe: getSafeArea(), wide: w >= WIDE_MIN && w > h };
}

// True on a laptop-sized window in landscape.
export function isLandscapeWide() {
  if (!hasDom()) return false;
  return getViewport().wide;
}

export function applyViewportVars() {
  if (!hasDom()) return;
  try {
    const v = getViewport();
    const s = document.documentElement.style;
    s.setProperty('--app-h', `${v.h}px`);
    s.setProperty('--safe-top', `${v.safe.top}px`);
    s.setProperty('--safe-right', `${v.safe.right}px`);
    s.setProperty('--safe-bottom', `${v.safe.bottom}px`);
    s.setProperty('--safe-left', `${v.safe.left}px`);
    document.documentElement.dataset.wide = v.wide ? 'true' : 'false';
  } catch (err) { log.warn('applyViewportVars failed', err); }
}

// Call fn(viewport) when the window size or rotation changes. Returns a function that stops it.
export function watchViewport(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  if (!watching && hasDom()) {
    watching = true;
    let pending = false;
    const fire = () => {
      if (pending) return;       // many resize events in one frame count as one
      pending = true;
      const run = () => {
        pending = false;
        safeCache = null;
        applyViewportVars();
        const v = getViewport();
        for (const f of Array.from(listeners)) { try { f(v); } catch (err) { log.error('viewport listener failed', err); } }
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else setTimeout(run, 0);
    };
    window.addEventListener('resize', fire);
    window.addEventListener('orientationchange', fire);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fire);
  }
  return () => { listeners.delete(fn); };
}

export default { getSafeArea, getViewport, isLandscapeWide, applyViewportVars, watchViewport };
