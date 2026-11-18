// Workshop, Upgrades tab: list with level pips, next-level preview, cost, Buy.
import { h, svg, setText } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { progress } from '../components/progress.js';
import { affordText } from '../logic/afford.js';
import { fmt } from '../soft.js';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const CURRENCY = {
  gold: { noun: 'Gold', icon: 'gold' }, shards: { noun: 'Shards', icon: 'shard' }, core: { noun: 'Core Dust', icon: 'core' },
};

// Plain data for one upgrade row. wallets = { gold, shards, core }.
export function upgradeState(info, wallets) {
  const i = info && typeof info === 'object' ? info : {};
  const cur = CURRENCY[i.currency] || CURRENCY.gold;
  const w = wallets || {};
  const have = num(w[i.currency === 'core' ? 'core' : i.currency === 'shards' ? 'shards' : 'gold']);
  const max = Math.max(1, Math.floor(num(i.max)) || 1);
  const level = Math.min(max, Math.max(0, Math.floor(num(i.level))));
  const maxed = !!i.maxed || level >= max;
  const st = {
    id: String(i.id || ''), name: String(i.name || 'Upgrade'), desc: String(i.desc || ''), level, max, maxed,
    now: String(i.now || ''), next: maxed ? '' : String(i.next || ''), currency: cur,
    cost: num(i.cost), canBuy: !!i.canBuy && !maxed, reason: '', buyLabel: maxed ? 'Maxed' : 'Buy',
  };
  if (!maxed) {
    if (i.locked) st.reason = String(i.reason || 'Locked');
    else if (!i.canAfford) st.reason = affordText(st.cost, have, cur.noun, fmt).text;
  }
  return st;
}

// Which pips are filled: array of booleans, one per level.
export const pips = (level, max) => Array.from({ length: Math.min(12, Math.max(1, Math.floor(num(max)) || 1)) }, (_, k) => k < level);

export function upgradeCardEl(info, handlers, scope) {
  const hd = handlers || {};
  const id = String(info && info.id);
  const name = h('div', { class: 'title ellipsis' });
  const lvl = h('div', { class: 'sub' });
  const desc = h('div', { class: 'sub ws-up-desc' });
  const pipRow = h('div', { class: 'ws-pips', 'aria-hidden': 'true' });
  const preview = h('div', { class: 'ws-preview' });
  const bar = progress(0, 'Level');
  const reason = h('div', { class: 'reason', 'aria-live': 'polite' });
  const buy = button({ label: 'Buy', kind: 'primary', onPress: () => hd.buy && hd.buy(id, el), onDeny: (why) => hd.deny && hd.deny(id, why, el) }, scope);
  buy.classList.add('ws-up-buy');
  const cost = h('span', { class: 'num ws-cost' });
  const costIcon = h('span', { class: 'icon' });
  const costRow = h('div', { class: 'row ws-costrow' }, costIcon, cost);
  const el = h('div', { class: 'card ws-up', 'data-upgrade': id },
    h('div', { class: 'row' }, h('div', { class: 'grow' }, name, lvl), costRow),
    desc, pipRow, preview, bar, buy, reason);
  let lastPips = '';
  let lastCur = '';
  function update(i, wallets) {
    const st = upgradeState(i, wallets);
    setText(name, st.name);
    setText(lvl, 'Level ' + st.level + ' of ' + st.max);
    setText(desc, st.desc);
    const key = st.level + '/' + st.max;
    if (key !== lastPips) {
      lastPips = key;
      pipRow.textContent = '';
      for (const on of pips(st.level, st.max)) pipRow.append(h('i', { class: 'pip' + (on ? ' on' : '') }));
    }
    if (st.currency.icon !== lastCur) { lastCur = st.currency.icon; costIcon.innerHTML = iconHtml(st.currency.icon); }
    setText(preview, st.maxed ? 'Now: ' + st.now + '. Top level.' : 'Now: ' + st.now + '  →  Next: ' + st.next);
    setText(cost, st.maxed ? '' : fmt(st.cost));
    costRow.hidden = st.maxed;
    bar.set(st.max > 0 ? st.level / st.max : 1);
    el.classList.toggle('maxed', st.maxed);
    buy.setState({ label: st.buyLabel, disabled: !st.canBuy, reason: st.reason });
    setText(reason, st.reason);
    return st;
  }
  return { el, update, id };
}
