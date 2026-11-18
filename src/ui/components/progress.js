import { h } from '../dom.js';

export function clamp01(x) {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}

// An animated bar. Only the transform changes.
export function progress(value, label) {
  const fill = h('i');
  const el = h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, fill);
  el.set = (v) => {
    const f = clamp01(v);
    fill.style.transform = 'scaleX(' + f.toFixed(3) + ')';
    el.setAttribute('aria-valuenow', Math.round(f * 100));
    el.classList.toggle('ok', f >= 1);
  };
  if (label) el.setAttribute('aria-label', label);
  el.set(value || 0);
  return el;
}
