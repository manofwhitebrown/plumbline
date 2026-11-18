import { h } from '../dom.js';

const NAMES = ['', 'Quartz', 'Emerald', 'Amber', 'Ruby', 'Void', 'Prism'];

// A small gem count. The data-t attribute lets colorblind mode add a shape.
export function gemChip(tier, count) {
  const t = Math.min(6, Math.max(1, Math.floor(tier) || 1));
  const pip = h('i', { 'data-t': t, style: '--c: var(--tier-' + Math.min(t, 5) + ')' });
  const n = h('span', { class: 'num', text: String(count == null ? 0 : count) });
  return h('span', { class: 'gem', 'aria-label': NAMES[t] + ' ' + (count || 0) }, pip, n);
}
