// A small "i" button that opens a short, plain help note. Text comes from src/data/help.js.
// - The button has a 44 px tap area. The note stays fully on screen (see placeHelp).
// - Tap the note, tap anywhere else, press Esc or the phone Back button, and it closes.
// - Only one note is open at a time. A bad id still works: it shows a calm default line.
import { h } from '../dom.js';
import { helpText, helpTitle, HELP } from '../../data/help.js';

const MARGIN = 12;
const GAP = 8;
const MAX_W = 280;

// Pure: where the note goes. anchor = { left, top, width, height }, size = { w, h }, vp = { w, h }.
// Always returns numbers that keep the whole note inside the screen (with a 12 px edge).
export function placeHelp(anchor, size, vp) {
  const vw = vp && Number.isFinite(vp.w) && vp.w > 0 ? vp.w : 320;
  const vh = vp && Number.isFinite(vp.h) && vp.h > 0 ? vp.h : 568;
  const w = Math.max(80, Math.min(size && Number.isFinite(size.w) ? size.w : MAX_W, vw - MARGIN * 2));
  const hgt = Math.max(30, Math.min(size && Number.isFinite(size.h) ? size.h : 80, vh - MARGIN * 2));
  const a = anchor && ['left', 'top', 'width', 'height'].every((k) => Number.isFinite(anchor[k]))
    ? anchor : { left: vw / 2, top: vh / 2, width: 0, height: 0 };
  let x = a.left + a.width / 2 - w / 2;
  x = Math.min(Math.max(x, MARGIN), vw - MARGIN - w);
  const below = a.top + a.height + GAP;
  const above = a.top - GAP - hgt;
  let y; let side;
  if (below + hgt <= vh - MARGIN) { y = below; side = 'below'; }
  else if (above >= MARGIN) { y = above; side = 'above'; }
  else { y = Math.max(MARGIN, vh - MARGIN - hgt); side = 'inside'; }
  y = Math.min(Math.max(y, MARGIN), vh - MARGIN - hgt); // an anchor far off screen can still not push the note out
  return { x, y, w, h: hgt, side };
}

let openState = null; // { close }

// Closes the open note, if any. Returns true when it closed one (so Back can stop there).
export function closeHelpTip() {
  if (!openState) return false;
  const s = openState;
  openState = null;
  try { s.close(); } catch (e) { /* ignore */ }
  return true;
}

export function isHelpTipOpen() { return !!openState; }

function viewport() {
  const de = typeof document !== 'undefined' ? document.documentElement : null;
  const w = (typeof window !== 'undefined' && window.innerWidth) || (de && de.clientWidth) || 320;
  const hh = (typeof window !== 'undefined' && window.innerHeight) || (de && de.clientHeight) || 568;
  return { w, h: hh };
}

// id: a key of HELP. opts: { label (spoken name, default the title), scope (createScope) }.
export function helpTip(id, opts) {
  const o = opts || {};
  const key = typeof id === 'string' && HELP[id] ? id : '';
  const title = key ? helpTitle(key) : 'this';
  const label = typeof o.label === 'string' && o.label ? o.label : 'What is ' + title + '?';
  const glyph = h('span', { class: 'helptip-i', 'aria-hidden': 'true', text: 'i' });
  const btn = h('button', { type: 'button', class: 'helptip', 'aria-label': label, 'aria-expanded': 'false', 'data-help': key || 'none' }, glyph);

  function open() {
    closeHelpTip();
    const body = h('div', { class: 'helptip-body', role: 'note' },
      h('strong', { class: 'helptip-title', text: key ? title : 'Help' }),
      h('span', { class: 'helptip-text', text: helpText(key) }));
    const vp = viewport();
    body.style.maxWidth = Math.min(MAX_W, vp.w - MARGIN * 2) + 'px';
    document.body.appendChild(body);
    const place = () => {
      let size = { w: MAX_W, h: 80 };
      try { const r = body.getBoundingClientRect(); if (r.width > 0 && r.height > 0) size = { w: r.width, h: r.height }; } catch (e) { /* default */ }
      let anchor = null;
      try { const r = btn.getBoundingClientRect(); anchor = { left: r.left, top: r.top, width: r.width, height: r.height }; } catch (e) { /* centre */ }
      const p = placeHelp(anchor, size, viewport());
      body.style.left = p.x + 'px';
      body.style.top = p.y + 'px';
      body.setAttribute('data-side', p.side);
    };
    place();
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-describedby', 'helptip-live');
    body.id = 'helptip-live';
    const off = [];
    const on = (t, n, f, c) => { if (t && t.addEventListener) { t.addEventListener(n, f, c); off.push(() => t.removeEventListener(n, f, c)); } };
    const shut = () => { closeHelpTip(); };
    on(body, 'click', shut);
    on(document, 'pointerdown', (e) => { if (e.target !== btn && !(btn.contains && btn.contains(e.target)) && e.target !== body) shut(); }, true);
    on(document, 'keydown', (e) => { if (e.key === 'Escape' || e.key === 'Back') { e.stopPropagation(); shut(); } }, true);
    on(document, 'backbutton', shut);
    on(typeof window !== 'undefined' ? window : null, 'popstate', shut);
    on(typeof window !== 'undefined' ? window : null, 'resize', place);
    on(typeof window !== 'undefined' ? window : null, 'orientationchange', shut);
    openState = {
      close() {
        for (const f of off) f();
        body.remove();
        btn.setAttribute('aria-expanded', 'false');
        btn.removeAttribute('aria-describedby');
      },
      owner: btn,
    };
  }

  const toggle = (e) => {
    if (e && e.stopPropagation) e.stopPropagation(); // never trigger the title or button next to it
    if (openState && openState.owner === btn) closeHelpTip(); else open();
  };
  if (o.scope && typeof o.scope.on === 'function') {
    o.scope.on(btn, 'click', toggle);
    if (typeof o.scope.add === 'function') o.scope.add(() => { if (openState && openState.owner === btn) closeHelpTip(); });
  } else btn.addEventListener('click', toggle);
  return btn;
}

// A title with an "i" next to it. Use for headings: titleWithTip('Crew', 'crew', scope).
export function titleWithTip(text, id, scope, cls) {
  return h('div', { class: 'helptip-row ' + (cls || '') }, h('span', { class: 'helptip-label', text }), helpTip(id, { scope }));
}
