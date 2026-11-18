// Gold and shard pills with counting numbers. Refreshes when meta changes.
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { counter } from './counter.js';
import { api } from '../api.js';
import { bus } from '../soft.js';

// opts: { settings: fn, coreDust: bool }
export function topbar(opts, scope) {
  const o = opts || {};
  const gold = counter(0, null, scope);
  const shards = counter(0, null, scope);
  const core = counter(0, null, scope);
  const mk = (cls, icon, num) => h('span', { class: 'pill ' + cls }, svg(iconHtml(icon)), num);
  const goldPill = mk('gold', 'gold', gold);
  const shardPill = mk('shard', 'shard', shards);
  const corePill = mk('core', 'core', core);
  corePill.hidden = true;
  const el = h('header', { class: 'topbar' }, h('div', { class: 'row grow' }, goldPill, shardPill, corePill));
  if (typeof o.settings === 'function') {
    const gear = h('button', { class: 'btn ghost iconbtn', type: 'button', 'aria-label': 'Settings' }, svg(iconHtml('settings')));
    scope.on(gear, 'click', o.settings);
    el.append(gear);
  }

  function refresh(instant) {
    try {
      const m = api.meta;
      gold.set(m.gold(), instant ? 0 : 600);
      shards.set(m.shards(), instant ? 0 : 600);
      const cd = m.coreDust();
      core.set(cd, instant ? 0 : 600);
      corePill.hidden = !(cd > 0);
      goldPill.setAttribute('aria-label', 'Gold');
      shardPill.setAttribute('aria-label', 'Shards');
    } catch (e) { /* keep the old numbers */ }
  }
  scope.sub(bus, 'meta:changed', () => refresh(false));
  refresh(true);
  el.refresh = refresh;
  return el;
}
