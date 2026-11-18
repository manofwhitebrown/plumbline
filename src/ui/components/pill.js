import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';

// kind: gold | shard | core | warn | '' ; icon: optional icon name
export function pill(text, kind, icon) {
  const el = h('span', { class: 'pill' + (kind ? ' ' + kind : '') });
  if (icon) el.append(svg(iconHtml(icon)));
  const label = h('span', { class: 'num ellipsis', text: text == null ? '' : String(text) });
  el.append(label);
  el.setLabel = (t) => { if (label.textContent !== String(t)) label.textContent = String(t); };
  return el;
}
