// Modal frame shared by the Welcome back box, the Collapse box, Settings confirms and the password box.
// It adds a header with a visible Close button, its own scroll, focus handling and safe-area padding.
// Also holds the Welcome back modal (offline income count-up with Claim).
import * as shell from './shell.js';
import { h, svg } from './dom.js';
import { iconHtml } from './icons.js';
import { counter } from './components/counter.js';
import { api } from './api.js';
import { fmt, fmtTime, buzz, ui, log } from './soft.js';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

// Next focus target when Tab is pressed inside a box. Pure, so it can be tested.
// index = where focus is now (-1 for outside), count = how many things can take focus.
export function nextFocusIndex(index, count, backwards) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return -1;
  const i = Number.isFinite(index) ? index : -1;
  if (backwards) return i <= 0 ? n - 1 : i - 1;
  return i < 0 || i >= n - 1 ? 0 : i + 1;
}

// spec: { title, body: Node, actions: [{label, kind, onPress, keepOpen}], kind: 'card'|'sheet',
//         dismissable, onClose, focus: Element|null }
// Returns the modal handle ({ close, el, body }). Never throws.
export function openFrame(spec) {
  try { return buildFrame(spec); } catch (e) { log.error('modal failed', e); return { close() {} }; }
}

function buildFrame(spec) {
  const sp = spec && typeof spec === 'object' ? spec : {};
  const title = String(sp.title || 'Message');
  const sheet = sp.kind === 'sheet';
  let m = null;
  try {
    m = shell.modal({
      body: sp.body || h('p', { class: 'sub', text: '' }),
      actions: Array.isArray(sp.actions) && sp.actions.length ? sp.actions : [{ label: 'Close', kind: 'secondary' }],
      dismissable: sp.dismissable !== false,
    });
  } catch (e) { return { close() {} }; }
  if (!m || !m.el) return m || { close() {} };

  const box = m.el;
  box.classList.add('mx', sheet ? 'mx-sheet' : 'mx-card');
  box.setAttribute('aria-label', title);
  if (m.body) m.body.classList.add('mx-scroll');
  const scrim = box.parentElement;
  if (scrim && sheet) scrim.classList.add('sheet-scrim');

  const x = h('button', { type: 'button', class: 'btn ghost iconbtn mx-x', 'aria-label': 'Close' }, svg(iconHtml('close')));
  x.addEventListener('click', () => { buzz('tap'); ui('close'); m.close(); });
  box.prepend(h('header', { class: 'mx-head' }, h('h2', { class: 'title mx-title', text: title }), x));

  // Keep Tab inside the box.
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const list = Array.from(box.querySelectorAll(FOCUSABLE)).filter((el) => !el.hidden && el.offsetParent !== null);
    if (!list.length) return;
    const at = list.indexOf(document.activeElement);
    const to = nextFocusIndex(at, list.length, e.shiftKey);
    if (to >= 0) { e.preventDefault(); list[to].focus(); }
  });

  let done = false;
  const inner = m.close;
  m.close = () => {
    if (done) return;
    done = true;
    try { if (typeof sp.onClose === 'function') sp.onClose(); } catch (e) { /* ignore */ }
    inner();
  };
  if (sp.focus && typeof sp.focus.focus === 'function') {
    try { sp.focus.focus(); } catch (e) { /* ignore */ }
  }
  return m;
}

// ---------- Welcome back ----------

let lastDismissed = '';
let openNow = false;

// A short key for one pile of waiting Gold. Same pile, same key.
export function welcomeKey(off) {
  if (!off || typeof off !== 'object') return '';
  return Math.round(Number(off.ms) || 0) + ':' + Math.round(Number(off.gold) || 0);
}

// Show the box only when there is Gold to claim and the player did not just close this same pile.
export function shouldShowWelcome(off, dismissedKey) {
  if (!off || typeof off !== 'object') return false;
  if (!(Number(off.gold) > 0)) return false;
  return welcomeKey(off) !== dismissedKey;
}

export function awayText(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 60000) return 'Your Crew kept working while you were away.';
  return 'Your Crew worked for ' + fmtTime(n) + ' while you were away.';
}

export function _resetWelcomeForTests() {
  lastDismissed = '';
  openNow = false;
}

export function openWelcomeBack(off) {
  try { return buildWelcome(off); } catch (e) { openNow = false; log.error('welcome failed', e); return null; }
}

function buildWelcome(off) {
  if (!shouldShowWelcome(off, '') || openNow) return null;
  const key = welcomeKey(off);
  const num = counter(0, { cls: 'big-num', format: (v) => fmt(v) });
  const body = h('div', { class: 'stack center welcome' },
    h('p', { class: 'sub', text: awayText(off.ms) }),
    h('div', { class: 'row center welcome-gold' }, svg(iconHtml('gold')), num),
    h('p', { class: 'sub', text: 'Claim it to add it to your Gold.' }));
  let claimed = false;
  openNow = true;
  const m = openFrame({
    title: 'Welcome back',
    body,
    kind: 'card',
    onClose: () => { openNow = false; if (!claimed) lastDismissed = key; num.stop(); },
    actions: [{
      label: 'Claim', kind: 'primary',
      onPress: () => {
        if (claimed) return;
        claimed = true;
        let paid = off.gold;
        try {
          const res = api.meta.offline.claim();
          if (res && res.ok === false) paid = 0;
          else if (res && Number.isFinite(res.gold)) paid = res.gold;
        } catch (e) { paid = 0; }
        ui('claim'); buzz('collect');
        shell.toast(paid > 0 ? 'You claimed ' + fmt(paid) + ' Gold.' : 'Nothing to claim right now.', paid > 0 ? 'ok' : 'warn');
      },
    }],
  });
  if (!m || !m.el) { openNow = false; return m; }
  setTimeout(() => { try { num.set(off.gold, 1400); } catch (e) { /* ignore */ } }, 250);
  return m;
}

// Home calls this when it opens.
export function maybeWelcomeBack() {
  let off = null;
  try { off = api.meta.offline.peek(); } catch (e) { return null; }
  if (!shouldShowWelcome(off, lastDismissed)) return null;
  return openWelcomeBack(off);
}
