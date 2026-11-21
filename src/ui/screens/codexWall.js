// Relic Wall and Looks panels for the Codex. [HOOK-3]
// Each builder returns { el, refresh() }. The Codex puts el in its list area and calls refresh()
// when something changes. Everything fails soft: if the data is missing the panel says so kindly.
import { h } from '../dom.js';
import { sheet } from '../shell.js';
import { progress } from '../components/progress.js';
import { bus, ui, buzz } from '../soft.js';
import { relicSvg } from './wallShapes.js';
import * as book from '../../meta/relicBook.js';
import * as looks from '../../meta/cosmetics.js';
import { wallModel, looksModel } from './wallModel.js';
import '../styles/wall.css';

const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
export { wallModel, looksModel, wallBadge, looksBadge } from './wallModel.js';

// ---------- Relic Wall ----------
function relicSheet(c) {
  safe(() => book.markSeen(c.id));
  const body = h('div', { class: 'cx-detail stack' });
  body.append(h('div', { class: 'wl-big', html: relicSvg(c.shape, c.color, !c.found, 72) }));
  body.append(h('p', { class: 'cx-detail-name', text: c.found ? c.name : '???' }));
  body.append(h('p', { class: 'sub', text: c.found ? c.line : 'Not found yet.' }));
  if (!c.found) body.append(h('p', { class: 'cx-hint', text: c.line }));
  else body.append(h('p', { class: 'sub', text: (c.rarity.charAt(0).toUpperCase() + c.rarity.slice(1)) + ' · ' + c.where }));
  ui('open');
  return sheet(c.found ? c.name : 'Hidden relic', body);
}

export function wallPanel(scope) {
  const el = h('div', { class: 'wl-panel' });
  let sig = '';
  function refresh() {
    const m = wallModel();
    const next = JSON.stringify([m.found, m.nextLine, m.groups.map((g) => g.cards.map((c) => [c.id, c.found, c.isNew]))]);
    if (next === sig) return;
    sig = next;
    el.textContent = '';
    const head = h('div', { class: 'wl-head' },
      h('p', { class: 'wl-count num', text: m.found + ' of ' + m.total + ' found' }),
      progress(m.total ? m.found / m.total : 0, 'Relic Wall'));
    const bon = h('ul', { class: 'wl-bonus' });
    for (const b of m.bonuses) {
      bon.append(h('li', { class: 'wl-chip' + (b.reached ? ' on' : ''), 'aria-label': b.at + ' relics: ' + b.text + (b.reached ? ', reached' : ', not yet') },
        h('span', { class: 'wl-chip-n num', text: String(b.at) }), h('span', { class: 'wl-chip-t', text: b.text })));
    }
    head.append(bon, h('p', { class: 'sub wl-next', text: m.nextLine }));
    el.append(head);
    if (!m.groups.length) { el.append(h('p', { class: 'sub cx-empty', text: 'Nothing here yet. Keep playing.' })); return; }
    for (const g of m.groups) {
      const grid = h('ul', { class: 'wl-grid' });
      for (const c of g.cards) {
        const btn = h('button', { type: 'button', class: 'wl-card' + (c.found ? '' : ' hid') + (c.isNew ? ' fresh' : ''),
          'aria-label': (c.found ? c.name : 'Hidden relic') + (c.isNew ? ', new' : '') + '. ' + c.line },
          h('span', { class: 'wl-art', html: relicSvg(c.shape, c.color, !c.found, 40) }),
          h('span', { class: 'wl-name', text: c.name }),
          c.isNew ? h('span', { class: 'dot wl-new', 'aria-hidden': 'true' }) : null);
        scope.on(btn, 'click', () => { relicSheet(c); sig = ''; refresh(); });
        grid.append(h('li', null, btn));
      }
      el.append(h('h3', { class: 'wl-biome', text: g.name }), grid);
    }
  }
  scope.sub(bus, 'relics:changed', refresh);
  refresh();
  return { el, refresh };
}

// ---------- Looks ----------
function swatch(it) {
  const l = it.look || {};
  let bg = '#1d2740';
  if (it.kind === 'well') bg = it.unlock && it.unlock.t === 'free' ? 'linear-gradient(#141b2e,#070a12)' : 'linear-gradient(' + l.top + ',' + l.bottom + ')';
  else if (it.kind === 'rope') bg = 'repeating-linear-gradient(58deg,' + (l.tint || '#e6bf72') + ' 0 4px,#6b4a1c 4px 6px)';
  else bg = 'linear-gradient(' + (l.tint || '#b9791a') + ',#4a2f12)';
  return h('span', { class: 'lk-swatch ' + it.kind, style: 'background:' + bg + ';' + (l.rim ? 'box-shadow:0 0 0 2px ' + l.rim + ';' : '') });
}

export function looksPanel(scope) {
  const el = h('div', { class: 'wl-panel' });
  let sig = '';
  function refresh() {
    const m = looksModel();
    const next = JSON.stringify([m.shards, m.groups.map((g) => g.items.map((i) => [i.id, i.owned, i.worn, i.isNew, i.canBuy]))]);
    if (next === sig) return;
    sig = next;
    el.textContent = '';
    el.append(h('p', { class: 'sub lk-note', text: 'Looks change colours only. Nothing else.' }));
    for (const g of m.groups) {
      const ul = h('ul', { class: 'lk-list' });
      for (const it of g.items) {
        let label = 'Wear', cls = 'lk-act', disabled = false;
        if (it.worn) { label = 'Worn'; cls += ' worn'; disabled = true; }
        else if (!it.owned && it.canBuy) { label = 'Buy ' + it.cost; cls += ' buy'; disabled = m.shards < it.cost; }
        else if (!it.owned) { label = 'Locked'; cls += ' lock'; disabled = true; }
        const act = h('button', { type: 'button', class: cls, 'aria-label': label + ' ' + it.name, disabled: disabled ? true : null, text: label });
        scope.on(act, 'click', () => {
          if (it.owned) { if (looks.equip(it.id)) { ui('tap'); buzz('tap'); } }
          else { const r = looks.buy(it.id); if (r && r.ok) { looks.equip(it.id); ui('claim'); buzz('collect'); } }
          sig = ''; refresh();
        });
        ul.append(h('li', { class: 'lk-row' + (it.owned ? '' : ' hid') + (it.isNew ? ' fresh' : '') },
          swatch(it),
          h('span', { class: 'lk-text' }, h('span', { class: 'lk-name', text: it.name }), h('span', { class: 'lk-how', text: it.owned ? it.desc : it.how })),
          it.isNew ? h('span', { class: 'dot lk-new', 'aria-hidden': 'true' }) : null,
          act));
      }
      el.append(h('h3', { class: 'wl-biome', text: g.label }), ul);
    }
  }
  scope.sub(bus, 'cosmetics:changed', refresh);
  scope.sub(bus, 'meta:changed', refresh);
  refresh();
  return { el, refresh };
}
