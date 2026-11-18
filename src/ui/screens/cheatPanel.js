// The hidden panel. Nothing here shows until the build label has been tapped 7 times quickly
// and the right password is typed. The password itself is never written anywhere in the code.
import * as shell from '../shell.js';
import { h, createScope } from '../dom.js';
import { api } from '../api.js';
import { bus, log, buzz, ui } from '../soft.js';
import { openFrame } from '../modalsWelcome.js';
import { holdButton } from '../components/holdButton.js';
import { switchRow } from './settingsAudio.js';
import { copyText, reloadApp } from './settingsSave.js';

export const USED_TEXT = 'Cheats used — records are off';
const CONFIRM_SHOW_MS = 8000;

// ---------- small pure helpers (tested without a page) ----------

// Counts quick taps. hit(time) is true when `needed` taps happened inside `windowMs`.
export function createTapCounter(opts) {
  const o = opts || {};
  const needed = Number.isFinite(o.needed) && o.needed > 0 ? Math.floor(o.needed) : 7;
  const windowMs = Number.isFinite(o.windowMs) && o.windowMs > 0 ? o.windowMs : 3000;
  let times = [];
  return {
    hit(t) {
      if (!Number.isFinite(t)) return false;
      times.push(t);
      times = times.filter((x) => t - x >= 0 && t - x <= windowMs);
      if (times.length >= needed) { times = []; return true; }
      return false;
    },
    reset() { times = []; },
    count: () => times.length,
  };
}

export function lockText(ms) {
  const n = Number(ms);
  const s = Number.isFinite(n) && n > 0 ? Math.ceil(n / 1000) : 0;
  return s > 0 ? 'Locked. Try again in ' + s + 's.' : '';
}

export function clipText(text, max) {
  const t = String(text == null ? '' : text);
  const m = Number.isFinite(max) && max > 1 ? Math.floor(max) : 60;
  return t.length > m ? t.slice(0, m - 1) + '…' : t;
}

// What to show in the toast after a cheat ran.
export function toastFor(res) {
  const r = res && typeof res === 'object' ? res : {};
  const text = clipText(r.text || (r.ok ? 'Done' : 'That did not work'), 60);
  if (r.ok) return { text, kind: 'ok' };
  return { text, kind: r.needsConfirm ? 'warn' : 'error' };
}

// Output data (log lines, a save code) as plain text.
export function dataToText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n');
  try { return JSON.stringify(data, null, 1); } catch (e) { return ''; }
}

// Cleans the list from cheats.list() so a bad entry can never break drawing.
export function groupsView(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const g of list) {
    if (!g || typeof g.group !== 'string' || !Array.isArray(g.items)) continue;
    const items = g.items
      .filter((it) => it && typeof it.id === 'string' && typeof it.label === 'string')
      .map((it) => ({ id: it.id, label: it.label, toggle: !!it.toggle, on: !!it.on, danger: !!it.danger, needsConfirm: !!it.needsConfirm }));
    if (items.length) out.push({ group: g.group, items });
  }
  return out;
}

// One password try. Never says how close it was.
// Returns { state: 'open' | 'wrong' | 'locked', ms? }.
export function submitPassword(cheats, text) {
  try {
    if (!cheats) return { state: 'wrong' };
    const wait = cheats.lockedForMs();
    if (wait > 0) return { state: 'locked', ms: wait };
    if (cheats.tryPassword(typeof text === 'string' ? text : '')) return { state: 'open' };
    const after = cheats.lockedForMs();
    return after > 0 ? { state: 'locked', ms: after } : { state: 'wrong' };
  } catch (e) { return { state: 'wrong' }; }
}

// ---------- FPS counter (the Tools cheat sends 'cheats:debug') ----------

let fpsEl = null;
let fpsRaf = 0;
let watching = false;

function showFps(on) {
  if (typeof document === 'undefined') return;
  if (!on) {
    if (fpsRaf) cancelAnimationFrame(fpsRaf);
    fpsRaf = 0;
    if (fpsEl) fpsEl.remove();
    fpsEl = null;
    return;
  }
  if (fpsEl) return;
  const layer = document.querySelector('.layer');
  if (!layer) return;
  fpsEl = h('div', { class: 'fps-chip', 'aria-hidden': 'true', text: 'FPS …' });
  layer.append(fpsEl);
  let last = performance.now();
  let frames = 0;
  const loop = (t) => {
    frames++;
    if (t - last >= 500 && fpsEl) {
      fpsEl.textContent = 'FPS ' + Math.round((frames * 1000) / (t - last));
      frames = 0; last = t;
    }
    fpsRaf = requestAnimationFrame(loop);
  };
  fpsRaf = requestAnimationFrame(loop);
}

function watchDebug() {
  if (watching) return;
  watching = true;
  try { bus.on('cheats:debug', (p) => showFps(!!(p && p.fps))); } catch (e) { /* ignore */ }
}

// ---------- the password box ----------

export function openCheatEntry() {
  const c = api.cheats;
  if (!c) return null;
  try { c.reveal(); } catch (e) { return null; }
  if (c.isUnlocked()) return openCheatPanel();
  return openPasswordBox(c);
}

function openPasswordBox(c) {
  const scope = createScope();
  const input = h('input', { class: 'input', type: 'password', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '64', placeholder: 'Password', 'aria-label': 'Password' });
  const msg = h('p', { class: 'reason pw-msg', role: 'alert' });
  const body = h('div', { class: 'stack' }, input, msg);
  let m = null;

  function showLock(ms) {
    input.disabled = true;
    msg.textContent = lockText(ms);
    scope.interval(() => {
      const left = c.lockedForMs();
      if (left > 0) { msg.textContent = lockText(left); return; }
      input.disabled = false;
      msg.textContent = '';
      input.focus();
    }, 500);
  }
  function attempt() {
    const r = submitPassword(c, input.value);
    input.value = '';
    if (r.state === 'open') { m.close(); openCheatPanel(); return; }
    if (r.state === 'locked') { showLock(r.ms); return; }
    msg.textContent = 'That is not right.';
    input.focus();
  }

  m = openFrame({
    title: 'Password', body, kind: 'card', focus: input,
    onClose: () => { scope.dispose(); if (!c.isUnlocked()) c.lock(); },
    actions: [{ label: 'Open', kind: 'primary', keepOpen: true, onPress: attempt }, { label: 'Cancel', kind: 'secondary' }],
  });
  if (!m || !m.el) return m;
  scope.on(input, 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); attempt(); } });
  scope.on(input, 'focus', () => setTimeout(() => { try { input.scrollIntoView({ block: 'center' }); } catch (e) { /* ignore */ } }, 250));
  const wait = c.lockedForMs();
  if (wait > 0) showLock(wait);
  return m;
}

// ---------- the panel ----------

let panelOpen = false;

export function openCheatPanel() {
  const c = api.cheats;
  if (!c || !c.isUnlocked() || panelOpen) return null;
  watchDebug();
  const scope = createScope();
  const confirming = new Map(); // id -> timer, for the "press again" step
  const banner = h('div', { class: 'cheat-banner', role: 'status' });
  const groupsEl = h('div', { class: 'stack cheat-groups' });
  const outText = h('textarea', { class: 'input code-box', rows: '4', readonly: true, 'aria-label': 'Result' });
  const outCopy = h('button', { type: 'button', class: 'btn', text: 'Copy' });
  const out = h('section', { class: 'card stack cheat-out', hidden: true }, h('h3', { class: 'cheat-title', text: 'Result' }), outText, outCopy);
  const body = h('div', { class: 'stack cheat-panel' }, banner, groupsEl, out);
  let m = null;

  function paintBanner() {
    let used = false;
    try { used = !!c.wasUsed(); } catch (e) { /* keep */ }
    banner.textContent = used ? USED_TEXT : 'Records turn off when you use a cheat.';
    banner.classList.toggle('used', used);
  }

  function act(it) {
    buzz('tap'); ui('tap');
    let res = null;
    try { res = c.run(it.id); } catch (e) { res = { ok: false, text: 'That cheat could not run' }; }
    const t = toastFor(res);
    shell.toast(t.text, t.kind);
    if (confirming.has(it.id)) { clearTimeout(confirming.get(it.id)); confirming.delete(it.id); }
    if (res && res.needsConfirm) {
      confirming.set(it.id, setTimeout(() => { confirming.delete(it.id); render(); }, CONFIRM_SHOW_MS));
    }
    if (res && res.ok && it.id === 'reset_all') { reloadApp(); m.close(); return; }
    if (res && res.data != null) {
      outText.value = dataToText(res.data);
      out.hidden = false;
    }
    render();
  }

  function itemNode(it) {
    if (it.toggle) {
      const row = switchRow({ label: it.label, checked: it.on, onChange: () => act(it) }, scope);
      row.classList.add('cheat-wide');
      return row;
    }
    const asking = confirming.has(it.id);
    const b = h('button', { type: 'button', class: 'btn cheat-btn' + (it.danger ? ' danger' : '') + (it.on ? ' on' : ''), 'aria-pressed': it.on ? 'true' : 'false' },
      h('span', { text: asking ? 'Press again to confirm' : it.label }));
    scope.on(b, 'click', () => act(it));
    return b;
  }

  function render() {
    let groups = [];
    try { groups = groupsView(c.list()); } catch (e) { log.warn('panel list failed'); }
    if (!groups.length) { if (m) m.close(); return; }
    const keep = m && m.body ? m.body : null;
    const top = keep ? keep.scrollTop : 0;
    groupsEl.textContent = '';
    for (const g of groups) {
      groupsEl.append(h('section', { class: 'card stack cheat-group', 'aria-label': g.group },
        h('h3', { class: 'cheat-title', text: g.group }),
        h('div', { class: 'cheat-grid' }, ...g.items.map(itemNode))));
      const fps = g.items.find((x) => x.id === 'tool_fps');
      if (fps) showFps(fps.on);
    }
    paintBanner();
    if (keep) keep.scrollTop = top;
  }

  scope.on(outCopy, 'click', async () => {
    shell.toast((await copyText(outText.value)) ? 'Copied.' : 'Press and hold the text to copy it.', 'ok');
  });

  // The owner's "start clean" button. It works with a 1 second hold.
  const clean = h('section', { class: 'card stack cheat-group' },
    h('h3', { class: 'cheat-title', text: 'Start clean' }),
    h('p', { class: 'sub', text: 'Clears the cheat flag and erases your progress.' }),
    holdButton({ label: 'Hold to clear and reset', holdMs: 1000, onDone: () => {
      let res = null;
      try { res = c.clearFlagAndReset(); } catch (e) { res = { ok: false, text: 'Reset failed' }; }
      const t = toastFor(res);
      shell.toast(t.text, t.kind);
      if (res && res.ok) { reloadApp(); if (m) m.close(); }
    } }, scope));
  body.append(clean);

  panelOpen = true;
  m = openFrame({
    title: 'Cheat panel', body, kind: 'sheet',
    onClose: () => {
      panelOpen = false;
      for (const t of confirming.values()) clearTimeout(t);
      confirming.clear();
      scope.dispose();
    },
    actions: [
      { label: 'Lock cheats', kind: 'secondary', onPress: () => { try { c.lock(); } catch (e) { /* ignore */ } showFps(false); shell.toast('Locked.', 'ok'); } },
      { label: 'Close', kind: 'primary' },
    ],
  });
  if (!m || !m.el) { panelOpen = false; scope.dispose(); return m; }
  render();
  return m;
}
