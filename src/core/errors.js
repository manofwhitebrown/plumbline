// Global error handling. Any uncaught error or rejected promise is logged and the player sees a small
// friendly message that they can close. The game keeps going. Never a blank page.
import { log } from './log.js';

const COOLDOWN_MS = 5000;
const MAX_SHOWN = 6;
const FRIENDLY = 'Something went wrong, but your game is safe.';
const IGNORE = /ResizeObserver loop/i;

let lastShown = -1e9;
let shown = 0;
let toastEl = null;
let hideTimer = null;

// A tiny banner built by hand so it works even if the UI itself is broken.
export function showErrorToast(text) {
  if (typeof document === 'undefined' || !document.body) return false;
  try {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'alert');
      toastEl.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);' +
        'z-index:100000;max-width:456px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 16px;' +
        'background:#1d2740;color:#eef2ff;border:1px solid #2a3555;border-radius:16px;font:14px system-ui,sans-serif;' +
        'box-shadow:0 0 24px rgba(255,77,94,.25)';
      const msg = document.createElement('span');
      msg.style.flex = '1';
      const btn = document.createElement('button');
      btn.textContent = 'Close';
      btn.style.cssText = 'min-width:64px;min-height:44px;border:0;border-radius:12px;background:#f6c453;color:#070a12;font-weight:700;font-size:14px';
      btn.addEventListener('click', hideErrorToast);
      toastEl.append(msg, btn);
    }
    toastEl.firstChild.textContent = text;
    if (!toastEl.isConnected) document.body.appendChild(toastEl);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideErrorToast, 8000);
    return true;
  } catch (err) {
    log.warn('could not show error message', err);
    return false;
  }
}

export function hideErrorToast() {
  clearTimeout(hideTimer);
  if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
}

// Full-screen message for when the game cannot start at all. Gives a Reload button.
export function showFatal(text) {
  if (typeof document === 'undefined' || !document.body) return;
  try {
    const splash = document.getElementById('splash');
    if (splash) splash.remove();
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:100001;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:16px;padding:24px;text-align:center;background:#070a12;color:#eef2ff;font:16px system-ui,sans-serif';
    const p = document.createElement('p');
    p.textContent = text || 'The game could not start.';
    const b = document.createElement('button');
    b.textContent = 'Try again';
    b.style.cssText = 'min-width:160px;min-height:48px;border:0;border-radius:12px;background:#f6c453;color:#070a12;font-weight:700;font-size:16px';
    b.addEventListener('click', () => location.reload());
    box.append(p, b);
    document.body.appendChild(box);
  } catch (err) {
    log.error('showFatal failed', err);
  }
}

function describe(x) {
  if (x instanceof Error) return x.stack || x.message;
  if (typeof x === 'string') return x;
  try { return JSON.stringify(x); } catch { return String(x); }
}

// Returns a function that removes the handlers.
// opts.notify(text) shows the message (default: showErrorToast). opts.now() is a time source for tests.
export function installGlobalErrorHandlers(target, opts = {}) {
  const t = target || (typeof window !== 'undefined' ? window : null);
  if (!t || typeof t.addEventListener !== 'function') return () => {};
  const notify = opts.notify || showErrorToast;
  const clock = opts.now || (() => Date.now());

  function report(what) {
    try {
      log.error('uncaught', what);
      const n = clock();
      if (shown >= MAX_SHOWN || n - lastShown < COOLDOWN_MS) return;
      lastShown = n; shown++;
      notify(FRIENDLY);
    } catch { /* the handler itself must never throw */ }
  }
  const onError = (ev) => {
    if (!ev || (!ev.error && !ev.message)) return; // a broken image or file, not a code error
    if (IGNORE.test(String(ev.message || ''))) return;
    report(describe(ev.error || ev.message));
  };
  const onRejection = (ev) => report(describe(ev && ev.reason));
  t.addEventListener('error', onError);
  t.addEventListener('unhandledrejection', onRejection);
  return () => { t.removeEventListener('error', onError); t.removeEventListener('unhandledrejection', onRejection); };
}

// For tests.
export function _resetErrors() { lastShown = -1e9; shown = 0; toastEl = null; }
