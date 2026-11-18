// Modal dialog. spec: { title, body (string|Node), actions: [{label, kind, onPress, keepOpen}], dismissable }
import { h } from '../dom.js';
import { button } from './button.js';

export function openModal(layer, spec, onClose) {
  if (!layer || !spec) return null;
  const prevFocus = document.activeElement;
  const actions = h('div', { class: 'stack' });
  const body = h('div', { class: 'stack' });
  if (spec.body) body.append(spec.body.nodeType ? spec.body : h('p', { class: 'sub', text: String(spec.body) }));
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': spec.title || 'Message' },
    spec.title ? h('h2', { class: 'title', text: spec.title }) : null, body, actions);
  const scrim = h('div', { class: 'scrim' }, box);
  let closed = false;

  const api = {
    close() {
      if (closed) return;
      closed = true;
      scrim.remove();
      document.removeEventListener('keydown', onKey);
      try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) { /* ignore */ }
      if (typeof onClose === 'function') onClose(api);
    },
    el: box,
    body,
  };
  function onKey(e) { if (e.key === 'Escape' && spec.dismissable !== false) { e.stopPropagation(); api.close(); } }

  for (const a of spec.actions && spec.actions.length ? spec.actions : [{ label: 'OK', kind: 'primary' }]) {
    actions.append(button({ label: a.label, kind: a.kind || 'secondary', onPress: () => {
      if (typeof a.onPress === 'function') a.onPress(api);
      if (!a.keepOpen) api.close();
    } }));
  }
  scrim.addEventListener('click', (e) => { if (e.target === scrim && spec.dismissable !== false) api.close(); });
  document.addEventListener('keydown', onKey);
  layer.append(scrim);
  const first = actions.querySelector('button');
  if (first) first.focus();
  return api;
}
