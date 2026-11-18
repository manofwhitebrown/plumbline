// The parts tray: family chips on top, a snap-scrolling row of part cards below.
import { h } from '../dom.js';
import { partCard } from '../components/partCard.js';
import { api } from '../api.js';

export const FAMILIES = [
  { id: 'all', label: 'All' }, { id: 'collector', label: 'Collector' }, { id: 'processor', label: 'Processor' },
  { id: 'defense', label: 'Defense' }, { id: 'engine', label: 'Engine' }, { id: 'special', label: 'Special' },
];

// Count how many times each id appears.
export function countIds(list) {
  const out = {};
  for (const x of Array.isArray(list) ? list : []) {
    const id = typeof x === 'string' ? x : x && x.id;
    if (!id) continue;
    out[id] = (out[id] || 0) + (x && typeof x === 'object' && Number.isFinite(x.count) ? x.count : 1);
  }
  return out;
}

export function rigUse(rig) {
  const flat = [];
  for (const row of (rig && rig.cells) || []) for (const id of row || []) if (id) flat.push(id);
  return countIds(flat);
}

export function buildTray(scope, handlers) {
  let family = 'all';
  const chips = h('div', { class: 'chips', role: 'tablist' });
  const row = h('div', { class: 'tray', role: 'list' });
  const el = h('div', { class: 'tray-wrap' }, chips, row);
  const chipEls = {};
  for (const f of FAMILIES) {
    const b = h('button', { type: 'button', class: 'chip', role: 'tab', text: f.label });
    scope.on(b, 'click', () => { family = f.id; handlers.onFamily(); });
    chipEls[f.id] = b;
    chips.append(b);
  }
  function paint(rig, selectedId) {
    const owned = countIds(safeOwned());
    const used = rigUse(rig);
    for (const f of FAMILIES) {
      chipEls[f.id].setAttribute('aria-selected', f.id === family ? 'true' : 'false');
      chipEls[f.id].classList.toggle('on', f.id === family);
    }
    row.textContent = '';
    const ids = Object.keys(owned);
    let shown = 0;
    let marked = false;
    for (const id of ids) {
      const part = api.getPart(id);
      if (!part) continue; // unknown part id is ignored
      if (family !== 'all' && part.family !== family) continue;
      const n = owned[id];
      const inUse = (used[id] || 0) >= n;
      const card = partCard(part, { owned: n, inUse, selected: selectedId === id, icon: api.partIcon(id, 96), onPress: () => handlers.onPart(id, n, used[id] || 0) }, scope);
      if (!marked && !inUse) { card.setAttribute('data-tut', 'rig-new-part'); marked = true; }
      row.append(card);
      shown++;
    }
    if (!shown) row.append(h('p', { class: 'sub tray-empty', text: 'No parts here yet. Visit the Workshop.' }));
  }
  return { el, paint, row };
}

function safeOwned() {
  try { return api.meta.ownedParts(); } catch (e) { return []; }
}
