import { h } from '../dom.js';

// Show a short message. It removes itself.
export function showToast(layer, msg) {
  if (!layer || !msg) return null;
  let box = layer.querySelector('.toasts');
  if (!box) { box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); layer.append(box); }
  while (box.children.length >= 3) box.firstChild.remove();
  const el = h('div', { class: 'toast ' + msg.kind, text: msg.text });
  box.append(el);
  setTimeout(() => el.remove(), 2600);
  return el;
}
