// Shows the Results rows one after another (about 2.5 s). A tap anywhere skips to the end.
// rows: { [stepId]: element }. hooks: { gold(step), record(step) } run when that step appears.
import { createScope } from '../dom.js';
import { visibleAt } from '../logic/resultsPlan.js';

export function createReveal(plan, rows, hooks, scope) {
  const own = scope || createScope();
  const shown = new Set();
  const h2 = hooks || {};
  let raf = 0, start = 0, done = false, onDone = null;

  function show(step) {
    if (shown.has(step.id)) return;
    shown.add(step.id);
    const el = rows[step.id];
    if (el && el.classList) el.classList.add('in');
    const hook = h2[step.id];
    if (typeof hook === 'function') { try { hook(step); } catch (e) { /* a hook must not stop the reveal */ } }
    if (step.id === 'buttons') finish();
  }

  function finish() {
    if (done) return;
    done = true;
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
    if (typeof onDone === 'function') { try { onDone(); } catch (e) { /* ignore */ } }
  }

  function tick(now) {
    raf = 0;
    if (done) return;
    if (!start) start = now;
    const ids = visibleAt(plan, now - start);
    for (const step of plan) if (ids.includes(step.id)) show(step);
    if (!done) raf = requestAnimationFrame(tick);
  }

  const api = {
    // Starts the reveal. With no animation frames (or reduce motion) everything shows at once.
    start(doneFn) {
      onDone = doneFn;
      const instant = typeof requestAnimationFrame !== 'function' || !plan.length || plan.every((s) => s.at === 0);
      if (instant) { api.skip(); return; }
      raf = requestAnimationFrame(tick);
      own.add(() => { if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf); raf = 0; });
    },
    // Show everything now. Safe to call many times.
    skip() {
      for (const step of plan) show({ ...step, skipped: true });
      finish();
    },
    isDone: () => done,
  };
  return api;
}
