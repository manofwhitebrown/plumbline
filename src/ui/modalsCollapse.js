// Collapse confirmation: shows what resets, what stays and the Core Dust gain.
// You must press and hold for 1 second. meta.collapse.do is all-or-nothing.
import * as shell from './shell.js';
import { h, createScope } from './dom.js';
import { holdButton } from './components/holdButton.js';
import { openFrame } from './modalsWelcome.js';
import { api } from './api.js';
import { fmt, fmtDepth, ui, log } from './soft.js';
import { LIMITS } from '../data/upgrades.js';

const DUST_PCT = Math.round(((LIMITS && LIMITS.coreDustGoldEach) || 0.1) * 100);
const WHAT = 'Collapse is a fresh start. You lose your Gold, Crew and Parts. You earn Core Dust, and every piece adds +' + DUST_PCT + '% to all Gold you earn, for good.';

const RESETS = ['Gold', 'Crew', 'Parts'];
const KEEPS = ['Core Dust', 'Shards', 'Codex', 'Best Depth'];

function words(list, fallback) {
  const out = Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 40)) : [];
  return out.length ? out.slice(0, 8) : fallback;
}

// Turns meta.collapse.preview() into plain text we can draw. Bad input gives safe defaults.
export function collapseView(p) {
  const src = p && typeof p === 'object' ? p : {};
  const gain = Math.max(0, Math.floor(Number(src.coreDustGain) || 0));
  const after = Number(src.goldBonusAfter);
  const bonus = Number.isFinite(after) && after > 1 ? Math.round((after - 1) * 100) : 0;
  const crew = Math.max(0, Math.floor(Number(src.keepsCrewEach) || 0));
  return {
    available: src.available !== false && gain > 0,
    gain,
    bonusText: bonus > 0 ? 'Your Gold bonus becomes +' + fmt(bonus) + '%.' : '',
    resets: words(src.resets, RESETS),
    keeps: words(src.keeps, KEEPS),
    crewText: crew > 0 ? 'You keep ' + crew + ' of each Crew.' : '',
    startText: Array.isArray(src.startsWith) && src.startsWith.length ? 'You start with: ' + words(src.startsWith, []).join(', ') + '.' : '',
    needText: 'Reach ' + fmtDepth(Number(src.needDepth) || 500) + ' best Depth and earn ' + fmt(Number(src.needGold) || 1e6) + ' Gold.',
  };
}

function list(title, items, cls) {
  return h('div', { class: 'card grow collapse-col ' + cls },
    h('p', { class: 'sub', text: title }),
    h('ul', { class: 'collapse-list' }, ...items.map((t) => h('li', { text: t }))));
}

let openNow = false;

export function openCollapse() {
  try { return buildCollapse(); } catch (e) { openNow = false; log.error('collapse box failed', e); return null; }
}

function buildCollapse() {
  if (openNow) return null;
  let preview = null;
  try { preview = api.meta.collapse.preview(); } catch (e) { /* safe defaults */ }
  const v = collapseView(preview);
  let available = v.available;
  try { available = available && !!api.meta.collapse.available(); } catch (e) { /* keep */ }

  const body = h('div', { class: 'stack collapse' });
  if (available) {
    body.append(
      h('p', { class: 'sub', text: WHAT }),
      h('div', { class: 'card stack center collapse-gain' },
        h('p', { class: 'num big-core', text: '+' + fmt(v.gain) + ' Core Dust' }),
        v.bonusText ? h('p', { class: 'sub', text: v.bonusText }) : null),
      h('div', { class: 'row collapse-cols' }, list('Resets', v.resets, 'resets'), list('Stays', v.keeps, 'keeps')),
      v.crewText ? h('p', { class: 'sub', text: v.crewText }) : null,
      v.startText ? h('p', { class: 'sub', text: v.startText }) : null);
  } else {
    body.append(
      h('p', { class: 'title', text: 'Collapse is not ready yet.' }),
      h('p', { class: 'sub', text: WHAT }),
      h('p', { class: 'sub', text: v.needText }));
  }

  const scope = createScope();
  let busy = false;
  openNow = true;
  const m = openFrame({
    title: 'Collapse',
    body,
    kind: 'sheet',
    onClose: () => { openNow = false; scope.dispose(); },
    actions: [{ label: available ? 'Not now' : 'Close', kind: 'secondary' }],
  });
  if (!m || !m.el) { openNow = false; return m; }
  if (!available) return m;

  const hold = holdButton({
    label: 'Hold to Collapse',
    holdMs: 1000,
    onDone: () => {
      if (busy) return;
      busy = true;
      let res = null;
      try { res = api.meta.collapse.do(); } catch (e) { res = { ok: false }; }
      if (res && res.ok === false) {
        shell.toast('Collapse is not ready yet.', 'warn');
      } else {
        const got = res && Number.isFinite(res.coreDustGain) ? res.coreDustGain : v.gain;
        ui('collapse');
        shell.toast('Collapsed! +' + fmt(got) + ' Core Dust', 'ok');
      }
      m.close();
    },
  }, scope);
  const foot = m.el.lastElementChild; // the actions row
  if (foot) foot.prepend(hold);
  return m;
}
