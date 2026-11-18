// Small buzzes for feedback. Does nothing when the device cannot buzz or when it is switched off.
// Uses the native Capacitor plugin inside the APK, and navigator.vibrate in a browser.
import { log } from '../core/log.js';

const KINDS = {
  tap: { native: ['impact', 'LIGHT'], pattern: 8, gap: 0 },
  collect: { native: ['impact', 'LIGHT'], pattern: 12, gap: 45 },   // gap: do not spam while gems pour in
  warn: { native: ['notification', 'WARNING'], pattern: [30, 40, 30], gap: 250 },
  snap: { native: ['notification', 'ERROR'], pattern: [60, 40, 140], gap: 0 },
  record: { native: ['notification', 'SUCCESS'], pattern: [20, 30, 20, 30, 70], gap: 0 }
};

let enabled = true;
let lastAt = {};
let clockFn = () => Date.now();

export function setHapticsEnabled(on) { enabled = !!on; }
export function isHapticsEnabled() { return enabled; }

function nativePlugin() {
  try {
    const cap = globalThis.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Haptics) return cap.Plugins.Haptics;
  } catch { /* ignore */ }
  return null;
}

export function buzz(kind) {
  try {
    if (!enabled) return false;
    const k = KINDS[kind];
    if (!k) { log.warn(`buzz: unknown kind "${kind}"`); return false; }
    const t = clockFn();
    if (k.gap && t - (lastAt[kind] || -1e9) < k.gap) return false;
    lastAt[kind] = t;

    const plugin = nativePlugin();
    if (plugin) {
      const [fn, arg] = k.native;
      const p = fn === 'impact' ? plugin.impact({ style: arg }) : plugin.notification({ type: arg });
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return !!navigator.vibrate(k.pattern);
    }
  } catch (err) {
    log.warn('buzz failed', err);
  }
  return false;
}

// For tests.
export function _reset(fn) { enabled = true; lastAt = {}; clockFn = fn || (() => Date.now()); }

export default { buzz, setHapticsEnabled, isHapticsEnabled };
