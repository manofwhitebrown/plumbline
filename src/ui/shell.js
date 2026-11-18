// The screen shell: registers screens, moves between them, shows toasts and modals.
import { log } from './soft.js';
import { showToast } from './components/toast.js';
import { openModal } from './components/modal.js';
import { openSheet } from './components/sheet.js';

const screens = new Map();
const backStack = [];
let rootEl = null;
let chrome = null; // { layer, tabbar } when the page is ready
const NO_TABS = new Set(['drop', 'results']);
let overlays = 0;
let current = null; // { id, def }
let going = false;
const toasts = [];

export const SCREEN_IDS = ['home', 'rig', 'drop', 'results', 'crew', 'workshop', 'codex', 'rewards', 'settings', 'guide'];

// Tell the shell where to draw. Safe to call many times.
export function init(el) {
  rootEl = el || null;
}

// chrome: { layer, tabbar } so the shell can show toasts and hide the tab bar.
export function attachChrome(c) {
  chrome = c || null;
}

export function registerScreen(id, def) {
  if (typeof id !== 'string' || !def || typeof def.mount !== 'function') {
    log.warn('shell.registerScreen: bad screen', id);
    return false;
  }
  screens.set(id, def);
  return true;
}

function safeUnmount() {
  if (!current) return;
  try {
    if (typeof current.def.unmount === 'function') current.def.unmount();
  } catch (e) {
    log.error('shell: unmount failed', current.id, e);
  }
  if (rootEl && 'innerHTML' in rootEl) rootEl.innerHTML = '';
  current = null;
}

// Go to a screen. Returns true when it worked.
export function go(id, params, opts) {
  if (!screens.has(id)) {
    log.warn('shell.go: unknown screen', id);
    return false;
  }
  if (going) return false; // ignore double taps while switching
  going = true;
  try {
    const keepHistory = !(opts && opts.replace);
    if (current && keepHistory && current.id !== id) backStack.push({ id: current.id, params: current.params });
    safeUnmount();
    const def = screens.get(id);
    current = { id, def, params };
    def.mount(rootEl, params || {});
    updateChrome(id);
    return true;
  } catch (e) {
    log.error('shell.go: mount failed', id, e);
    return false;
  } finally {
    going = false;
  }
}

function updateChrome(id) {
  if (!chrome || !chrome.tabbar) return;
  chrome.tabbar.hidden = NO_TABS.has(id);
  if (chrome.tabbar.setActive) chrome.tabbar.setActive(id);
}

export function setBadge(tabId, on) {
  if (chrome && chrome.tabbar && chrome.tabbar.setBadge) chrome.tabbar.setBadge(tabId, !!on);
}

// Go back one screen. Returns false when there is nowhere to go.
export function back() {
  if (current && current.def && typeof current.def.onBack === 'function') {
    try { if (current.def.onBack()) return true; } catch (e) { log.error('onBack failed', e); }
  }
  const prev = backStack.pop();
  if (!prev) return false;
  return go(prev.id, prev.params, { replace: true });
}

export function currentId() {
  return current ? current.id : null;
}

export function toast(text, kind) {
  const msg = { text: String(text == null ? '' : text), kind: kind || 'info' };
  toasts.push(msg);
  if (toasts.length > 20) toasts.shift();
  if (chrome && chrome.layer) { try { showToast(chrome.layer, msg); } catch (e) { log.error('toast failed', e); } }
  return msg;
}

// spec: { title, body, actions: [{ label, kind, onPress }] }
export function modal(spec) {
  if (!spec || typeof spec !== 'object') {
    log.warn('shell.modal: bad spec');
    return null;
  }
  if (!chrome || !chrome.layer) return { close() {} };
  try {
    overlays++;
    return openModal(chrome.layer, spec, () => { overlays = Math.max(0, overlays - 1); });
  } catch (e) {
    overlays = Math.max(0, overlays - 1);
    log.error('modal failed', e);
    return { close() {} };
  }
}

// A bottom sheet with a title and any DOM content.
export function sheet(title, content) {
  if (!chrome || !chrome.layer) return { close() {} };
  try {
    overlays++;
    return openSheet(chrome.layer, title, content, () => { overlays = Math.max(0, overlays - 1); });
  } catch (e) {
    overlays = Math.max(0, overlays - 1);
    log.error('sheet failed', e);
    return { close() {} };
  }
}

export function hasOverlay() {
  return overlays > 0;
}

export function _resetForTests() {
  screens.clear();
  backStack.length = 0;
  toasts.length = 0;
  current = null;
  going = false;
  rootEl = null;
  chrome = null;
  overlays = 0;
}

export function _recentToasts() {
  return toasts.slice();
}
