// The screen shell: registers screens, moves between them, shows toasts and modals.
import { log } from './soft.js';

const screens = new Map();
const backStack = [];
let rootEl = null;
let current = null; // { id, def }
let going = false;
const toasts = [];

export const SCREEN_IDS = ['home', 'rig', 'drop', 'results', 'crew', 'workshop', 'codex', 'rewards', 'settings', 'guide'];

// Tell the shell where to draw. Safe to call many times.
export function init(el) {
  rootEl = el || null;
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
    return true;
  } catch (e) {
    log.error('shell.go: mount failed', id, e);
    return false;
  } finally {
    going = false;
  }
}

// Go back one screen. Returns false when there is nowhere to go.
export function back() {
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
  return msg;
}

// spec: { title, body, actions: [{ label, kind, onPress }] }
export function modal(spec) {
  if (!spec || typeof spec !== 'object') {
    log.warn('shell.modal: bad spec');
    return null;
  }
  return { close() {} };
}

export function _resetForTests() {
  screens.clear();
  backStack.length = 0;
  toasts.length = 0;
  current = null;
  going = false;
  rootEl = null;
}

export function _recentToasts() {
  return toasts.slice();
}
