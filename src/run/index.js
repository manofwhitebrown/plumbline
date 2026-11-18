// Everything other AIs may import from src/run/.
export { session } from './session.js';
export { rigs } from './rigs.js';
export { biomes } from '../data/biomes.js';
export { loot } from '../data/loot.js';
export { default as goals } from './goals.js';
export { default as records } from './records.js';
export { default as payout } from './payout.js';
export { idleView, buildView } from './view.js';

import { session as _session } from './session.js';
import { rigs as _rigs } from './rigs.js';
import records from './records.js';
import { bus as _bus } from '../core/bus.js';
import { log as _log } from '../core/log.js';

let inited = false;
// Boot hook. Registers the `run` and `rig` save slices and listens for Collapse. Safe to call twice.
export function init() {
  if (inited) return true;
  inited = true;
  try {
    records.bestDepth();   // registers the `run` slice
    _rigs.getRig();        // registers the `rig` slice
    // After a Collapse parts and bucket size reset, so the saved rig must be checked again.
    _bus.on('meta:collapsed', () => { try { _rigs.getRig(); } catch (e) { _log.warn('rig re-check failed', e); } });
  } catch (e) { _log.error('run.init failed', e); }
  return true;
}
// For Boot: call after meta is ready. Pays a drop that was cut off by closing the page.
export function recover() { return _session.recover(); }
