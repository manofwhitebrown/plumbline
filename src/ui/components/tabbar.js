import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { buzz, ui } from '../soft.js';

export const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'rig', label: 'Rig', icon: 'rig' },
  { id: 'crew', label: 'Crew', icon: 'crew' },
  { id: 'workshop', label: 'Workshop', icon: 'workshop' },
  { id: 'codex', label: 'Codex', icon: 'codex' },
  { id: 'rewards', label: 'More', icon: 'more' },
];

// Which tab should look active for a screen id?
export function tabFor(screenId) {
  if (screenId === 'settings' || screenId === 'guide') return 'rewards';
  return TABS.some((t) => t.id === screenId) ? screenId : null;
}

export function tabbar(onPick, scope) {
  const el = h('nav', { class: 'tabbar', 'aria-label': 'Main' });
  const buttons = {};
  for (const t of TABS) {
    const b = h('button', { type: 'button', 'aria-label': t.label }, svg(iconHtml(t.icon)), h('span', { text: t.label }));
    const press = () => { buzz('tap'); ui('tap'); if (typeof onPick === 'function') onPick(t.id); };
    if (scope) scope.on(b, 'click', press); else b.addEventListener('click', press);
    buttons[t.id] = b;
    el.append(b);
  }
  el.setActive = (id) => {
    const tab = tabFor(id);
    for (const k of Object.keys(buttons)) {
      if (k === tab) buttons[k].setAttribute('aria-current', 'page'); else buttons[k].removeAttribute('aria-current');
    }
  };
  el.setBadge = (id, on) => {
    const b = buttons[id];
    if (!b) return;
    const old = b.querySelector('.dot');
    if (on && !old) b.append(h('span', { class: 'dot' }));
    if (!on && old) old.remove();
  };
  return el;
}
