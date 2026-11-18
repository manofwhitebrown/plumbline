// Bottom sheet. Same idea as a modal but slides up from the bottom.
import { h } from '../dom.js';

export function openSheet(layer, title, content, onClose) {
  if (!layer) return null;
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': title || 'Details' },
    h('div', { class: 'grab' }), title ? h('h2', { class: 'title', text: title }) : null);
  if (content) sheet.append(content);
  const scrim = h('div', { class: 'scrim sheet-scrim' }, sheet);
  let closed = false;
  const api = {
    el: sheet,
    close() {
      if (closed) return;
      closed = true;
      scrim.remove();
      document.removeEventListener('keydown', onKey);
      if (typeof onClose === 'function') onClose();
    },
  };
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); api.close(); } }
  scrim.addEventListener('click', (e) => { if (e.target === scrim) api.close(); });
  document.addEventListener('keydown', onKey);
  layer.append(scrim);
  return api;
}
