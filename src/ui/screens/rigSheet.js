// Info sheet for a placed part: description, tags, Move and Remove.
import { h } from '../dom.js';
import { button } from '../components/button.js';
import { sheet } from '../shell.js';
import { api } from '../api.js';

export function openPartSheet(r, c, partId, actions) {
  const part = api.getPart(partId);
  const name = part ? part.name : 'Part';
  const body = h('div', { class: 'stack' });
  const icon = api.partIcon(partId, 96);
  body.append(h('div', { class: 'row' }, icon ? h('img', { class: 'sheet-icon', src: icon, alt: '' }) : null,
    h('p', { class: 'sub grow', text: part && part.desc ? part.desc : 'A part for your rig.' })));
  const tags = (part && Array.isArray(part.tags) ? part.tags : []).slice(0, 6);
  if (tags.length) body.append(h('div', { class: 'row wrap' }, ...tags.map((t) => h('span', { class: 'pill', text: String(t) }))));
  let s = null;
  const row = h('div', { class: 'row' });
  row.append(button({ label: 'Move', onPress: () => { s.close(); actions.onMove(r, c); } }));
  row.append(button({ label: 'Remove', kind: 'danger', onPress: () => { s.close(); actions.onRemove(r, c); } }));
  row.firstChild.classList.add('grow'); row.lastChild.classList.add('grow');
  body.append(row);
  s = sheet(name, body);
  return s;
}
