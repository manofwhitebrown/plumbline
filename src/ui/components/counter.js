// A number that counts up smoothly. It only touches the page when the text changes.
import { h, setText } from '../dom.js';
import { createCounter } from '../logic/countup.js';
import { fmt } from '../soft.js';
import { getSettings } from '../settings.js';

export function counter(initial, opts, scope) {
  const o = opts || {};
  const format = o.format || fmt;
  const state = createCounter(initial);
  const el = h('span', { class: 'num' + (o.cls ? ' ' + o.cls : ''), text: format(state.value) });
  let raf = 0;

  function frame() {
    raf = 0;
    const v = state.update(performance.now()); // same clock as set(), so the count never stalls or jumps
    setText(el, format(v));
    if (!state.done) raf = requestAnimationFrame(frame);
  }

  el.set = (to, durMs) => {
    const instant = getSettings().reduceMotion || typeof requestAnimationFrame !== 'function';
    state.setTarget(to, performance.now(), durMs, instant);
    if (instant) { setText(el, format(state.value)); return; }
    if (!raf) raf = requestAnimationFrame(frame);
  };
  el.stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  if (scope) scope.add(el.stop);
  return el;
}
