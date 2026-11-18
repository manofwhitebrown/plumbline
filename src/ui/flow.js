// Game flow helpers used by several screens: start a drop, open the rig, and so on.
import * as shell from './shell.js';
import { api } from './api.js';
import { buzz, ui } from './soft.js';

let starting = false;
let runEndHook = null; // [MOTION-1] optional (payload, goFn) => true when it will call goFn itself

export function setRunEndHook(fn) { runEndHook = typeof fn === 'function' ? fn : null; }

// Start a drop and open the Drop screen. The Drop screen only shows the run; it must not call session.start.
// The first drop of the tutorial gets its special options here. A double tap does nothing.
export function startDrop() {
  if (starting) return false;
  starting = true;
  setTimeout(() => { starting = false; }, 400);
  buzz('tap');
  ui('open');
  try {
    const session = api.session;
    const going = typeof session.isRunning === 'function' && session.isRunning();
    if (!going) {
      const tut = api.tutorial;
      const opts = tut && typeof tut.runOptions === 'function' ? tut.runOptions() : null;
      const r = session.start(opts ? { ...opts } : {});
      if (!r || !r.ok) {
        shell.toast((r && r.error) || 'Could not start the drop. Try again.', 'warn');
        return false;
      }
    }
  } catch (e) {
    shell.toast('Could not start the drop. Try again.', 'warn');
    return false;
  }
  return shell.go('drop');
}

export function goTab(id) {
  return shell.go(id, undefined, { replace: true });
}

// Show the Results screen when a run ends, from anywhere.
export function wireRunEnd(bus) {
  if (!bus || typeof bus.on !== 'function') return () => {};
  return bus.on('run:ended', (payload) => {
    const go = () => shell.go('results', payload || {}, { replace: true });
    let took = false;
    if (runEndHook) { try { took = !!runEndHook(payload, go); } catch (e) { took = false; } }
    if (!took) go();
  });
}

export function bestDepth() {
  try {
    const s = api.meta.stats.get();
    return Number.isFinite(s && s.bestDepth) ? s.bestDepth : 0;
  } catch (e) { return 0; }
}
