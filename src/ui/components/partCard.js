import { h } from '../dom.js';

// A part in the tray: icon, name, owned count. `inUse` dims it.
export function partCard(part, info, scope) {
  const i = info || {};
  const name = part && part.name ? part.name : 'Part';
  const img = h('img', { alt: '', width: 48, height: 48, draggable: 'false' });
  if (i.icon) img.src = i.icon;
  const el = h('button', { type: 'button', 'data-part': part && part.id, class: 'partcard' + (i.inUse ? ' dim' : '') + (i.selected ? ' sel' : ''), 'aria-label': name + ', owned ' + (i.owned || 0) + (i.inUse ? ', in use' : '') },
    img, h('span', { class: 'name ellipsis', text: name }), h('span', { class: 'sub', text: 'x' + (i.owned || 0) }));
  if (typeof i.onPress === 'function') { if (scope) scope.on(el, 'click', () => i.onPress(part)); else el.addEventListener('click', () => i.onPress(part)); }
  return el;
}
