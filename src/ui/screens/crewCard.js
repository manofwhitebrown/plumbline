// One Crew card, plus the pure helpers that decide what it shows.
// The pure helpers have no DOM, so tests can run them in Node.
import { h, svg, setText } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { progress } from '../components/progress.js';
import { bulkCost, affordText } from '../logic/afford.js';
import { fmt } from '../soft.js';

export const CREW_MODES = [1, 10, 'max'];
const MODE_KEY = 'plumbline.crewMode';
let savedMode = 1;

export function cleanMode(m) {
  return m === 10 || m === '10' ? 10 : m === 'max' ? 'max' : 1;
}
export function getMode() {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(MODE_KEY);
      if (v) savedMode = cleanMode(v);
    }
  } catch (e) { /* keep the in-memory choice */ }
  return savedMode;
}
export function setMode(m) {
  savedMode = cleanMode(m);
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(MODE_KEY, String(savedMode)); } catch (e) { /* ignore */ }
  return savedMode;
}
export const modeLabel = (m) => (m === 'max' ? 'Max' : 'x' + cleanMode(m));

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// How many we will buy and what it costs, for the chosen toggle.
export function crewQty(c, mode) {
  const cost = num(c && c.cost);
  if (mode === 'max') return Math.max(1, Math.floor(num(c && c.maxBuy)));
  return cleanMode(mode) === 10 ? 10 : 1;
}
export function crewCost(c, mode) {
  if (!c) return 0;
  const m = cleanMode(mode);
  if (m === 1) return num(c.cost);
  if (m === 10) return num(c.cost10);
  const n = crewQty(c, 'max');
  return n <= 1 ? num(c.cost) : bulkCost(num(c.cost), 0, n);
}

// Everything the card needs to draw, as plain data.
export function crewCardState(c, mode, gold) {
  const item = c && typeof c === 'object' ? c : {};
  const g = num(gold);
  const out = {
    id: String(item.id || ''), name: String(item.name || 'Crew'), locked: item.unlocked === false,
    lockText: item.unlocked === false ? String(item.reason || 'Locked') : '',
    owned: Math.max(0, Math.floor(num(item.owned))),
    perSecond: num(item.perSecond), mult: num(item.mult) || 1,
    qty: 1, cost: 0, canBuy: false, reason: '', progress: 0, milestoneText: '', buyLabel: 'Buy',
    manager: { shown: false, owned: false, cost: 0, canBuy: false, reason: '' },
  };
  if (out.locked) return out;
  out.qty = crewQty(item, mode);
  out.cost = crewCost(item, mode);
  const m = cleanMode(mode);
  const affordable = m === 'max' ? num(item.maxBuy) >= 1 : g >= out.cost;
  out.canBuy = affordable && out.cost >= 0;
  if (!out.canBuy) out.reason = affordText(out.cost, g, 'Gold', fmt).text;
  out.buyLabel = 'Buy ' + fmt(out.qty);
  const ms = item.milestone || {};
  out.progress = Math.min(1, Math.max(0, num(ms.progress)));
  out.milestoneText = ms.at ? fmt(Math.max(0, num(ms.remaining))) + ' more to double output' : 'Top milestone reached';
  const mg = item.manager || {};
  out.manager = { shown: true, owned: !!mg.owned, cost: num(mg.cost), canBuy: !!mg.canBuy, reason: '' };
  if (!out.manager.owned && !out.manager.canBuy) {
    out.manager.reason = mg.reason && /Needs/.test(mg.reason) ? String(mg.reason) : affordText(out.manager.cost, g, 'Gold', fmt).text;
  }
  return out;
}

const CREW_ICONS = {
  winch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="10" r="5"/><path d="M12 15v6M7 21h10M12 5V3"/></svg>',
  smithy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h14a4 4 0 004-4H8L3 9zM9 9v6M6 20h12M9 15h6l1 5"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h13l-2 8H6zM16 9h5"/><circle cx="8" cy="19" r="1.6"/><circle cx="14" cy="19" r="1.6"/></svg>',
  lamp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21h6M10 17h4M8 13a5 5 0 118 0c0 2-1 3-1 4H9c0-1-1-2-1-4z"/></svg>',
  assay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7h14M5 7l-2 6a3 3 0 006 0zM19 7l-2 6a3 3 0 006 0z"/></svg>',
  foundry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V10l4 3V9l4 3V8l6 3v10zM9 21v-4h4v4"/></svg>',
};
export const crewIconHtml = (id) => CREW_ICONS[id] || iconHtml('crew');

// Builds one card. update(c, mode, gold) only touches text that changed.
export function crewCard(c, handlers, scope) {
  const hd = handlers || {};
  const id = String(c && c.id);
  const name = h('div', { class: 'title ellipsis' });
  const owned = h('div', { class: 'sub ellipsis' });
  const rate = h('div', { class: 'num crew-rate' });
  const rateSub = h('div', { class: 'sub crew-rate-sub', text: 'Gold per second' });
  const bar = progress(0, 'Progress to the next doubling');
  const msText = h('div', { class: 'sub ellipsis' });
  const lock = h('div', { class: 'sub crew-lock', hidden: true });
  const reason = h('div', { class: 'reason crew-reason', 'aria-live': 'polite' });
  const buy = button({ label: 'Buy', kind: 'primary', onPress: () => hd.buy && hd.buy(id, card), onDeny: (why) => hd.deny && hd.deny(id, why, card) }, scope);
  buy.classList.add('crew-buy');
  const mgr = button({ label: 'Hire manager', kind: 'secondary', onPress: () => hd.hire && hd.hire(id, card), onDeny: (why) => hd.deny && hd.deny(id, why, card) }, scope);
  mgr.classList.add('crew-mgr');
  const mgrDone = h('div', { class: 'pill gold crew-mgr-done', hidden: true, text: 'Manager hired' });
  const buyRow = h('div', { class: 'crew-actions' }, buy, mgr, mgrDone);
  const card = h('div', { class: 'card crew-card', 'data-crew': id },
    h('div', { class: 'crew-head' },
      h('span', { class: 'crew-icon', html: crewIconHtml(id), 'aria-hidden': 'true' }),
      h('div', { class: 'grow' }, name, owned),
      h('div', { class: 'crew-rate-box' }, rate, rateSub)),
    h('div', { class: 'crew-mid' }, bar, msText, lock),
    buyRow, reason);

  const last = {};
  function update(item, mode, gold) {
    const st = crewCardState(item, mode, gold);
    setText(name, st.name);
    card.classList.toggle('locked', st.locked);
    lock.hidden = !st.locked;
    setText(lock, st.lockText);
    bar.hidden = msText.hidden = st.locked;
    buyRow.hidden = reason.hidden = st.locked;
    if (st.locked) {
      setText(owned, 'Locked');
      setText(rate, '');
      return st;
    }
    setText(owned, 'Owned ' + fmt(st.owned) + (st.mult > 1 ? ' · x' + fmt(st.mult) + ' output' : ''));
    setText(rate, fmt(st.perSecond));
    bar.set(st.progress);
    setText(msText, st.milestoneText);
    buy.setState({ label: st.buyLabel, sub: fmt(st.cost) + ' Gold', disabled: !st.canBuy, reason: st.reason });
    setText(reason, st.reason);
    mgr.hidden = st.manager.owned;
    mgrDone.hidden = !st.manager.owned;
    if (!st.manager.owned) {
      mgr.setState({ label: 'Hire manager', sub: fmt(st.manager.cost) + ' Gold', disabled: !st.manager.canBuy, reason: st.manager.reason });
      if (!st.canBuy && !st.manager.canBuy) { /* the reason line already shows the buy need */ }
    }
    last.st = st;
    return st;
  }
  return { el: card, update, id };
}
