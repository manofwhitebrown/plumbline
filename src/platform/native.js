// Phone glue: the Android Back button, keep the screen awake during a drop,
// save when the app goes to the background, and pay offline income when it comes back.
// Installed once by viewport.js at boot. Everything here fails soft and does nothing
// on a laptop or in a test (no window, no phone).
import { log } from '../core/log.js';
import { bus } from '../core/bus.js';
import { saveNow } from '../core/save.js';

let installed = false;
let wantAwake = false;
let lock = null;
let locking = false;
let shellMod = null;
let lastForegroundAt = -1e9;

export function isNativeApp() {
  try {
    const cap = globalThis.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch { return false; }
}

// ---- keep the screen awake while a drop is running ----
async function takeLock() {
  if (locking || lock || !wantAwake) return false;
  try {
    if (typeof navigator === 'undefined' || !navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    locking = true;
    const l = await navigator.wakeLock.request('screen');
    locking = false;
    if (!wantAwake) { try { await l.release(); } catch { /* ignore */ } return false; }
    lock = l;
    if (typeof l.addEventListener === 'function') l.addEventListener('release', () => { if (lock === l) lock = null; });
    return true;
  } catch (err) {
    locking = false;
    log.warn('keep-awake not available', err && err.message);
    return false;
  }
}

function dropLock() {
  const l = lock;
  lock = null;
  if (l && typeof l.release === 'function') { try { const p = l.release(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ } }
}

export function keepAwake(on) {
  wantAwake = !!on;
  if (wantAwake) return takeLock();
  dropLock();
  return Promise.resolve(false);
}

export function isAwakeWanted() { return wantAwake; }

// ---- Back button ----
// The Android shell asks window.__plumblineBack(). 'handled' = the game used the press.
// 'exit' = nothing to go back to (Home), so the shell sends the app to the background.
export function handleBack() {
  try {
    if (!shellMod) return 'exit';
    if (shellMod.hasOverlay()) {
      // Same as pressing Esc: the open window closes itself (or stays, if it cannot be closed).
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      return 'handled';
    }
    return shellMod.back() ? 'handled' : 'exit';
  } catch (err) {
    log.warn('back button failed', err && err.message);
    return 'exit';
  }
}

// ---- background and foreground ----
export function onBackground() {
  try { saveNow(); } catch (err) { log.warn('save on background failed', err && err.message); }
  dropLock();
}

export async function onForeground() {
  try {
    const t = Date.now();
    if (t - lastForegroundAt < 500) return; // the page event and the app event can both fire
    lastForegroundAt = t;
    if (wantAwake) takeLock();
    // Work out away income BEFORE the next game tick can reset the "last seen" time.
    const metaMod = await import('../meta/index.js');
    if (metaMod.meta && metaMod.meta.offline) metaMod.meta.offline.peek();
    if (shellMod && !shellMod.hasOverlay() && shellMod.currentId() === 'home') {
      const w = await import('../ui/modalsWelcome.js');
      if (w && typeof w.maybeWelcomeBack === 'function') w.maybeWelcomeBack();
    }
  } catch (err) {
    log.warn('resume failed', err && err.message);
  }
}

function lockPortrait() {
  try {
    if (!isNativeApp()) return;
    const o = typeof screen !== 'undefined' && screen.orientation;
    if (o && typeof o.lock === 'function') { const p = o.lock('portrait'); if (p && p.catch) p.catch(() => {}); }
  } catch { /* the manifest also locks portrait */ }
}

export function installNative() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return false;
  installed = true;
  try {
    window.__plumblineBack = handleBack;
    import('../ui/shell.js').then((m) => { shellMod = m; }).catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.hidden) onBackground(); else onForeground(); });
    window.addEventListener('pagehide', onBackground);
    window.addEventListener('plumbline:background', onBackground);
    window.addEventListener('plumbline:foreground', onForeground);
    bus.on('run:started', () => { keepAwake(true); });
    bus.on('run:ended', () => { keepAwake(false); });
    bus.on('run:aborted', () => { keepAwake(false); });
    lockPortrait();
  } catch (err) { log.warn('phone glue failed to start', err && err.message); }
  return true;
}

// For tests.
export function _resetNative() { installed = false; wantAwake = false; lock = null; locking = false; shellMod = null; lastForegroundAt = -1e9; }
export function _setShellForTests(m) { shellMod = m; }

export default { installNative, handleBack, keepAwake, isNativeApp, onBackground, onForeground };
