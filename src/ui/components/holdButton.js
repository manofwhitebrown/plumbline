// A button you must press and hold (default 1 second). Releasing early cancels.
import { h } from '../dom.js';
import { holdProgress } from '../logic/hold.js';
import { buzz, ui } from '../soft.js';

export function holdButton(opts, scope) {
  const o = opts || {};
  const total = o.holdMs || 1000;
  const fill = h('i', { class: 'hold-fill' });
  const label = h('span', { class: 'hold-label', text: o.label || 'Hold to confirm' });
  const el = h('button', { type: 'button', class: 'btn danger hold', 'aria-label': (o.label || 'Hold to confirm') + '. Press and hold.' }, fill, label);
  let start = 0, raf = 0, done = false;

  function stop(reset) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; start = 0;
    if (reset) { fill.style.transform = 'scaleX(0)'; label.textContent = o.label || 'Hold to confirm'; }
  }
  function tick(now) {
    if (!start) return;
    const p = holdProgress(now - start, total);
    fill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    if (p >= 1) {
      done = true; stop(false); buzz('record'); ui('claim');
      try { if (typeof o.onDone === 'function') o.onDone(); } catch (e) { /* ignore */ }
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  function begin(e) {
    if (done || start || (e && e.repeat)) return;
    start = performance.now();
    label.textContent = 'Keep holding…';
    buzz('tap');
    raf = requestAnimationFrame(tick);
  }
  const cancel = () => { if (!done) stop(true); };
  const on = (t, ev, fn) => (scope ? scope.on(t, ev, fn) : t.addEventListener(ev, fn));
  on(el, 'pointerdown', (e) => { e.preventDefault(); begin(e); });
  on(el, 'pointerup', cancel); on(el, 'pointerleave', cancel); on(el, 'pointercancel', cancel);
  on(el, 'keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); begin(e); } });
  on(el, 'keyup', cancel);
  if (scope) scope.add(() => stop(false));
  return el;
}
