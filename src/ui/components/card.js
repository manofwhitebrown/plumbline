import { h } from '../dom.js';

export function card(kids, cls) {
  return h('div', { class: 'card' + (cls ? ' ' + cls : '') }, ...(Array.isArray(kids) ? kids : [kids]));
}
