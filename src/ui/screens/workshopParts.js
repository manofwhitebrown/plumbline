// Workshop, Parts tab: the grid of Part cards and the detail sheet.
// Pure helpers first (no DOM), then the DOM builders.
import { h, svg, setText } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { api } from '../api.js';
import { affordText } from '../logic/afford.js';
import { fmt } from '../soft.js';

export const FAMILIES = ['collector', 'processor', 'defense', 'engine', 'special'];
export const FAMILY_NAMES = { all: 'All', collector: 'Collectors', processor: 'Processors', defense: 'Defense', engine: 'Engines', special: 'Special' };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Group parts by family. Unknown families go to 'special'. Bad input gives empty groups.
export function groupParts(list) {
  const groups = {};
  for (const f of FAMILIES) groups[f] = [];
  for (const p of Array.isArray(list) ? list : []) {
    if (!p || typeof p.id !== 'string') continue;
    groups[FAMILIES.includes(p.family) ? p.family : 'special'].push(p);
  }
  return groups;
}

// What a card shows, as plain data. part = row from meta.workshop list or partStatus merged.
export function partCardState(part, gold) {
  const p = part && typeof part === 'object' ? part : {};
  const g = num(gold);
  const state = ['locked', 'buyable', 'poor', 'owned'].includes(p.state) ? p.state : 'locked';
  const count = Math.max(0, Math.floor(num(p.count)));
  const max = Math.max(1, Math.floor(num(p.max)) || 1);
  const cost = num(p.cost);
  const st = {
    id: String(p.id || ''), name: String(p.name || 'Part'), state, count, max, cost,
    canBuy: state === 'buyable', line: '', reason: '', buyLabel: 'Buy', owned: count > 0,
  };
  if (state === 'owned') {
    st.line = max > 1 ? 'Owned ' + count + ' of ' + max : 'Owned';
    st.buyLabel = 'Owned';
  } else if (state === 'locked') {
    st.reason = String(p.reason || 'Not unlocked yet');
    st.line = st.reason;
    st.buyLabel = 'Locked';
  } else {
    st.line = fmt(cost) + ' Gold' + (count > 0 ? ' · copy ' + (count + 1) : '');
    st.buyLabel = count > 0 ? 'Buy copy' : 'Buy';
    if (state === 'poor') st.reason = affordText(cost, g, 'Gold', fmt).text;
  }
  return st;
}

// Combos whose text names this part. Combos are { id, name, desc }.
export function combosForPart(part, combos) {
  const name = part && part.name ? String(part.name).toLowerCase() : '';
  if (!name || !Array.isArray(combos)) return [];
  return combos.filter((c) => c && typeof c.desc === 'string' && c.desc.toLowerCase().includes(name));
}

// Clear message for a failed buy. Never empty.
export function failText(res, fallback) {
  const e = res && typeof res.error === 'string' ? res.error.trim() : '';
  return e || fallback || 'Could not buy. Try again.';
}

function icon(id, size) {
  const img = h('img', { alt: '', width: size, height: size, draggable: 'false', class: 'ws-icon' });
  try { const u = api.partIcon(id, size * 2); if (u) img.src = u; } catch (e) { /* no icon */ }
  return img;
}

// One grid card. update(row, gold) changes only text and state that changed.
export function partCardEl(row, handlers, scope) {
  const hd = handlers || {};
  const id = String(row && row.id);
  const name = h('div', { class: 'ws-name ellipsis' });
  const line = h('div', { class: 'sub ws-line' });
  const main = h('button', { type: 'button', class: 'ws-main', 'aria-label': 'Details' }, icon(id, 48), name, line);
  scope.on(main, 'click', () => hd.open && hd.open(id));
  const buy = button({ label: 'Buy', kind: 'primary', onPress: () => hd.buy && hd.buy(id, el), onDeny: (why) => hd.deny && hd.deny(id, why, el) }, scope);
  buy.classList.add('ws-buy');
  const lockIcon = svg(iconHtml('lock'), 'ws-lock');
  lockIcon.hidden = true;
  const el = h('div', { class: 'card ws-card', 'data-part': id, 'data-family': row && row.family || '' }, lockIcon, main, buy);
  function update(r, gold) {
    const st = partCardState(r, gold);
    setText(name, st.name);
    setText(line, st.line);
    el.classList.toggle('locked', st.state === 'locked');
    el.classList.toggle('owned', st.state === 'owned');
    lockIcon.hidden = st.state !== 'locked';
    // The tutorial points at the Buy button itself (tapping the card would only open its details).
    if (st.canBuy) buy.setAttribute('data-tut', 'workshop-part'); else buy.removeAttribute('data-tut');
    buy.setState({ label: st.buyLabel, disabled: !st.canBuy, reason: st.reason || st.line });
    main.setAttribute('aria-label', st.name + '. ' + st.line + '. Details');
    return st;
  }
  return { el, update, id };
}

// Bottom sheet body. Returns a DOM node.
export function partSheetBody(row, gold, combos, handlers) {
  const st = partCardState(row, gold);
  const kids = [];
  kids.push(h('div', { class: 'ws-sheet-head' }, icon(st.id, 64),
    h('div', { class: 'grow' }, h('div', { class: 'title', text: st.name }),
      h('div', { class: 'sub', text: FAMILY_NAMES[row && row.family] || 'Part' }))));
  kids.push(h('p', { class: 'ws-desc', text: String((row && row.desc) || '') }));
  const tags = Array.isArray(row && row.tags) ? row.tags : [];
  if (tags.length) kids.push(h('div', { class: 'ws-tags' }, ...tags.map((t) => h('span', { class: 'pill', text: String(t) }))));
  const cs = combosForPart(row, combos);
  kids.push(h('div', { class: 'sub', text: cs.length ? 'Combos it joins' : 'No Combos found yet' }));
  if (cs.length) kids.push(h('ul', { class: 'ws-combos' }, ...cs.map((c) => h('li', {}, h('strong', { text: c.name }), h('div', { class: 'sub', text: c.desc })))));
  kids.push(h('div', { class: 'sub', text: st.line }));
  const b = button({ label: st.buyLabel, sub: st.canBuy ? fmt(st.cost) + ' Gold' : '', kind: 'primary', disabled: !st.canBuy, reason: st.reason || st.line,
    onPress: () => handlers && handlers.buy && handlers.buy(st.id, null), onDeny: (why) => handlers && handlers.deny && handlers.deny(st.id, why, null) });
  kids.push(b);
  return h('div', { class: 'stack ws-sheet' }, ...kids);
}
