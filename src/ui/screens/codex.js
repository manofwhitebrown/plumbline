// Codex: Parts, Combos, Biomes, Relics. Hidden entries show a silhouette and a hint.
import { registerScreen, sheet, setBadge } from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { iconHtml } from '../icons.js';
import { progress } from '../components/progress.js';
import { api } from '../api.js';
import { bus, ui, fmtDepth } from '../soft.js';
import { TABS, buildModel, markSeen } from './codexTabs.js';
import '../styles/codex.css';

let scope = null;
let activeTab = 'part'; // remembered while the app is open

function icon(partId, size, hidden) {
  const url = partId ? api.partIcon(partId, size * 2) : '';
  if (!url) return h('span', { class: 'cx-fallback' + (hidden ? ' sil' : ''), 'aria-hidden': 'true' }, svg(iconHtml('rig')));
  return h('img', { class: 'cx-img' + (hidden ? ' sil' : ''), src: url, alt: '', width: size, height: size, draggable: 'false' });
}

// The picture for one entry. Hidden entries are dark shapes, never the real thing.
function art(e, size) {
  const hidden = !e.found;
  if (e.kind === 'part') return h('span', { class: 'cx-art' }, icon(e.partId, size, hidden));
  if (e.kind === 'combo') {
    const first = e.parts[0];
    return h('span', { class: 'cx-art' }, icon(first && first.id, size, hidden));
  }
  if (e.kind === 'biome') {
    const p = e.palette;
    const style = !hidden && p ? 'background: linear-gradient(' + p.top + ', ' + p.bottom + '); border-color: ' + p.accent + ';' : '';
    return h('span', { class: 'cx-art cx-biome' + (hidden ? ' sil' : ''), style }, hidden ? svg(iconHtml('lock')) : null);
  }
  return h('span', { class: 'cx-art' }, h('i', { class: 'cx-relic t' + e.tier + (hidden ? ' sil' : '') }));
}

function subLine(e) {
  if (!e.found) return e.hint;
  return e.desc;
}

function openDetails(e, repaint) {
  markSeen(e.id);
  const body = h('div', { class: 'cx-detail stack' });
  body.append(h('div', { class: 'cx-detail-art' }, art(e, 72)));
  body.append(h('p', { class: 'cx-detail-name', text: e.found ? e.name : '???' }));
  if (e.found) {
    if (e.desc) body.append(h('p', { class: 'sub', text: e.desc }));
  } else {
    body.append(h('p', { class: 'sub', text: 'Not found yet.' }), h('p', { class: 'cx-hint', text: e.hint }));
  }
  if (e.kind === 'part' && e.family) body.append(h('p', { class: 'sub', text: 'Type: ' + e.family }));
  if (e.kind === 'biome' && e.found && e.palette) body.append(h('p', { class: 'sub', text: 'Where: ' + fmtDepth(e.from) + ' and deeper' }));
  if (e.kind === 'combo' && e.parts.length) {
    body.append(h('p', { class: 'cx-sub-title', text: 'Made from' }));
    const row = h('div', { class: 'cx-parts' });
    for (const p of e.parts) {
      row.append(h('div', { class: 'cx-part' + (p.found ? '' : ' unknown') },
        h('span', { class: 'cx-art small' }, icon(p.id, 40, !p.found)),
        h('span', { class: 'cx-part-name', text: p.found ? p.name : '???' }),
        p.times > 1 ? h('span', { class: 'cx-times num', text: '×' + p.times }) : null));
    }
    body.append(row);
    if (e.more) body.append(h('p', { class: 'sub', text: e.more.charAt(0).toUpperCase() + e.more.slice(1) + '.' }));
  }
  const s = sheet(e.found ? e.name : 'Hidden entry', body);
  ui('open');
  if (typeof repaint === 'function') repaint();
  return s;
}

registerScreen('codex', {
  mount(el) {
    scope = createScope();
    let model = buildModel([]);
    const bar = progress(0, 'Codex found');
    const count = h('span', { class: 'pill num' });
    const tabsEl = h('div', { class: 'cx-tabs', role: 'tablist', 'aria-label': 'Codex sections' });
    const list = h('ul', { class: 'cx-list', 'aria-live': 'off' });
    const tabButtons = {};
    for (const t of TABS) {
      const label = h('span', { class: 'cx-tab-label', text: t.label });
      const n = h('span', { class: 'cx-tab-n num' });
      const dot = h('span', { class: 'dot', hidden: true, 'aria-label': 'New' });
      const b = h('button', { type: 'button', class: 'cx-tab', role: 'tab', 'aria-selected': 'false' }, label, n, dot);
      scope.on(b, 'click', () => { if (activeTab !== t.id) { activeTab = t.id; ui('tap'); paint(); } });
      tabButtons[t.id] = { b, n, dot };
      tabsEl.append(b);
    }
    const screen = h('section', { class: 'screen screen-codex' },
      h('div', { class: 'cx-head' }, h('h1', { class: 'cx-title', text: 'Codex' }), count),
      bar, tabsEl, list);
    el.append(screen);

    function read() {
      try { return buildModel(api.meta.codex.list()); } catch (e) { return buildModel([]); }
    }

    let sig = '';
    function paint() {
      model = read();
      count.textContent = model.found + ' / ' + model.total + ' found';
      bar.set(model.total ? model.found / model.total : 0);
      setBadge('codex', model.fresh > 0);
      for (const t of model.order) {
        const tb = tabButtons[t.id];
        tb.n.textContent = t.found + '/' + t.total;
        tb.dot.hidden = !(t.fresh > 0);
        tb.b.classList.toggle('on', t.id === activeTab);
        tb.b.setAttribute('aria-selected', t.id === activeTab ? 'true' : 'false');
      }
      const tab = model.tabs[activeTab] || model.order[0];
      const next = JSON.stringify([tab.id, tab.entries.map((e) => [e.id, e.found, e.isNew, e.name])]);
      if (next === sig) return;
      sig = next;
      list.textContent = '';
      if (!tab.entries.length) list.append(h('li', { class: 'sub cx-empty', text: 'Nothing here yet. Keep playing.' }));
      for (const e of tab.entries) list.append(row(e));
    }

    function row(e) {
      const btn = h('button', { type: 'button', class: 'cx-row' + (e.found ? '' : ' hidden-entry') + (e.isNew ? ' fresh' : ''),
        'aria-label': (e.found ? e.name : 'Hidden entry') + (e.isNew ? ', new' : '') + '. ' + subLine(e) },
        art(e, 48),
        h('span', { class: 'cx-text' },
          h('span', { class: 'cx-name', text: e.found ? e.name : '???' }),
          h('span', { class: 'cx-desc', text: subLine(e) }),
          e.kind === 'combo' ? comboChips(e) : null),
        e.isNew ? h('span', { class: 'dot cx-new', 'aria-hidden': 'true' }) : null);
      scope.on(btn, 'click', () => openDetails(e, () => { sig = ''; paint(); }));
      return h('li', null, btn);
    }

    function comboChips(e) {
      const wrap = h('span', { class: 'cx-chips' });
      for (const p of e.parts) wrap.append(h('span', { class: 'cx-mini' + (p.found ? '' : ' unknown'), title: p.found ? p.name : '???' }, icon(p.id, 24, !p.found)));
      return wrap;
    }

    scope.sub(bus, 'codex:new', () => paint());
    scope.sub(bus, 'meta:changed', () => paint());
    paint();
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
