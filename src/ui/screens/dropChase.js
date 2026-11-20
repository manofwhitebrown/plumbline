// Small chase pills on the Drop screen: "40 m to your best", "30 Gold ahead of your best", "60 m to the next Biome".
// New file. It only listens to the bus (run:events, run:started, run:ended, run:aborted) and never touches the game.
import '../styles/dropChase.css';
import { h } from '../dom.js';
import { slotsFor, slotsKey } from '../logic/chaseModel.js';

// d: { bus }. Returns { nodes, show }. Nothing here can throw into the game.
export function createChaseUi(d, scope) {
  const bus = d.bus;
  const pills = [];
  for (let i = 0; i < 3; i++) pills.push(h('span', { class: 'cz-pill ellipsis', hidden: true }));
  const el = h('div', { class: 'cz', role: 'group', 'aria-label': 'Chase' }, ...pills);
  let last = '';
  function show(list) {
    try {
      const slots = slotsFor(list), key = slotsKey(slots);
      if (key === last) return;
      last = key;
      slots.forEach((s, i) => {
        const p = pills[i];
        p.hidden = s.hidden;
        if (s.hidden) return;
        p.textContent = s.text; p.setAttribute('data-tone', s.tone); p.setAttribute('data-id', s.id);
      });
    } catch (e) { /* the pills are a nice-to-have */ }
  }
  const fromView = (p) => show(p && p.view && p.view.chase ? p.view.chase.pills : []);
  scope.sub(bus, 'run:events', fromView);
  scope.sub(bus, 'run:started', fromView);
  scope.sub(bus, 'run:ended', () => show([]));
  scope.sub(bus, 'run:aborted', () => show([]));
  return { nodes: [el], show };
}
