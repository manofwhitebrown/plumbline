// Game flow helpers used by several screens: start a drop, open the rig, and so on.
import * as shell from './shell.js';
import { api } from './api.js';
import { buzz, ui } from './soft.js';

let starting = false;

// Go to the Drop screen. The screen itself starts the run. A double tap does nothing.
export function startDrop() {
  if (starting) return false;
  starting = true;
  setTimeout(() => { starting = false; }, 400);
  buzz('tap');
  ui('open');
  return shell.go('drop');
}

export function goTab(id) {
  return shell.go(id, undefined, { replace: true });
}

// Show the Results screen when a run ends, from anywhere.
export function wireRunEnd(bus) {
  if (!bus || typeof bus.on !== 'function') return () => {};
  return bus.on('run:ended', (payload) => {
    shell.go('results', payload || {}, { replace: true });
  });
}

export function bestDepth() {
  try {
    const s = api.meta.stats.get();
    return Number.isFinite(s && s.bestDepth) ? s.bestDepth : 0;
  } catch (e) { return 0; }
}
