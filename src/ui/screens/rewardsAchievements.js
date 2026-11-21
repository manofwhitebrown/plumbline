// Rewards: achievements. Meta unlocks them and pays Shards by itself. We show progress.
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { progress } from '../components/progress.js';
import { fmt, ui } from '../soft.js';
import { countText } from '../../core/plural.js';

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// Pure: meta.achievements.list() -> view. Unfinished first (closest first), finished last.
export function achievementsView(list) {
  const items = (Array.isArray(list) ? list : []).filter((a) => a && typeof a.id === 'string').map((a, i) => {
    const target = Math.max(1, num(a.target));
    const prog = Math.min(target, Math.max(0, num(a.progress)));
    const done = !!a.unlocked;
    return {
      id: a.id, i, done, name: String(a.name || 'Achievement'), desc: String(a.desc || ''),
      shards: Math.max(0, num(a.shards)),
      fraction: done ? 1 : Math.min(1, prog / target),
      label: done ? 'Done' : fmt(prog) + ' / ' + fmt(target),
    };
  });
  const todo = items.filter((a) => !a.done).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const done = items.filter((a) => a.done);
  return { items, todo, done, doneCount: done.length, total: items.length, fraction: items.length ? done.length / items.length : 0 };
}

function itemEl(a) {
  const mark = a.done ? svg(iconHtml('check'), 'rw-mark ok') : svg(iconHtml('lock'), 'rw-mark');
  const el = h('li', { class: 'rw-ach ' + (a.done ? 'done' : 'locked') },
    mark,
    h('div', { class: 'grow' },
      h('p', { class: 'rw-qtext', text: a.name }),
      h('p', { class: 'sub', text: a.desc }),
      a.done ? null : h('div', { class: 'rw-ach-bar' }, progress(a.fraction, a.name), h('span', { class: 'sub num', text: a.label }))),
    h('span', { class: 'pill shard', 'aria-label': countText(a.shards, 'Shard') }, svg(iconHtml('shard')), h('span', { class: 'num', text: fmt(a.shards) })));
  return el;
}

// ctx: { meta, scope } -> { el, update() }
export function buildAchievements(ctx) {
  const { meta, scope } = ctx;
  let mode = null; // 'todo' | 'done' (chosen on first draw)
  const counter = h('span', { class: 'pill num' });
  const total = progress(0, 'Achievements done');
  const tabs = h('div', { class: 'rw-tabs', role: 'tablist' });
  const list = h('ul', { class: 'rw-list', 'aria-label': 'Achievements' });
  const el = h('section', { class: 'card rw-achs', 'aria-label': 'Achievements' },
    h('div', { class: 'rw-head' }, h('div', { class: 'grow' }, h('h2', { class: 'title', text: 'Achievements' }), h('p', { class: 'sub', text: 'Each one pays Shards when you earn it.' })), counter),
    total, tabs, list);
  let sig = '';
  let last = achievementsView(null);

  function read() {
    try { return achievementsView(meta.achievements.list()); } catch (e) { return achievementsView(null); }
  }
  function tab(id, label, n) {
    const b = h('button', { type: 'button', class: 'rw-tab' + (mode === id ? ' on' : ''), role: 'tab', 'aria-selected': mode === id ? 'true' : 'false', text: label + ' ' + n });
    scope.on(b, 'click', () => { if (mode !== id) { mode = id; ui('tap'); sig = ''; paint(last); } });
    return b;
  }
  function paint(v) {
    last = v;
    if (mode == null) mode = v.todo.length || !v.done.length ? 'todo' : 'done';
    const next = JSON.stringify([mode, v.todo, v.done]);
    if (next === sig) return;
    sig = next;
    counter.textContent = v.doneCount + ' / ' + v.total + ' done';
    total.set(v.fraction);
    tabs.textContent = '';
    tabs.append(tab('todo', 'To do', v.todo.length), tab('done', 'Done', v.done.length));
    list.textContent = '';
    const shown = mode === 'done' ? v.done : v.todo;
    if (!shown.length) list.append(h('li', { class: 'sub rw-empty', text: mode === 'done' ? 'Nothing done yet. Your first one is close.' : 'All done. Well played.' }));
    for (const a of shown) list.append(itemEl(a));
  }
  function update() { paint(read()); }
  update();
  return { el, update };
}
