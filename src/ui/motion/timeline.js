// motion/timeline.js: runs one moment (a function of elapsed ms) with skip, speed and reduce-motion handling.
// No DOM and no direct timers: the host calls tick(dtMs). A host can be rAF, the lab page, or a test.
import { fin } from '../../feel/spring.js';

// def: { id, durationMs, update(tMs, p), finish(), start?() }
//   update(t, p) draws the moment at time t (p = t / duration, 0..1).
//   finish() must put the FINAL state in place. It is called on end, on skip and for Reduce motion.
export function createRunner(def, opts) {
  const o = opts || {};
  const dur = Math.max(1, fin(def.durationMs, 1));
  let reduce = !!o.reduce, speed = o.speed > 0 ? o.speed : 1;
  let t = 0, state = 'idle', done = null;
  const r = {
    get state() { return state; },
    get time() { return t; },
    get id() { return def.id; },
    setSpeed(s) { speed = s > 0 ? s : 1; },
    setReduce(v) { reduce = !!v; },
    start(onDone) {
      if (state !== 'idle') return false;
      done = typeof onDone === 'function' ? onDone : null;
      if (typeof def.start === 'function') def.start();
      if (reduce) { end('reduced'); return true; }
      state = 'running'; t = 0;
      def.update(0, 0);
      return true;
    },
    tick(dtMs) {
      if (state !== 'running') return state;
      t += Math.min(Math.max(fin(dtMs), 0), 100) * speed;
      if (t >= dur) { end('done'); return state; }
      def.update(t, t / dur);
      return state;
    },
    skip() { if (state === 'running') end('skipped'); return state; },
    cancel() { if (state === 'running') end('skipped'); done = null; },
  };
  function end(how) {
    state = how === 'reduced' ? 'done' : how;
    t = dur;
    try { def.finish(); } catch (e) { /* a broken moment must not block the queue */ }
    state = how === 'skipped' ? 'skipped' : 'done';
    const cb = done; done = null;
    if (cb) cb(how);
  }
  return r;
}
