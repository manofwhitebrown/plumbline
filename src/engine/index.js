// PUBLIC API of the drop engine (CONTRACT section 5). Pure logic: no screen, no timers, no Math.random.
//
//   createRun({ rig, mods, seed }) -> Run      make a run (bad input is cleaned up, never throws)
//   stepBeat(run) -> Event[]                   advance exactly one beat, return its events
//   haul(run) -> Event[]                       HAUL UP. Only while running; a second call returns []
//   peekNext(run, n) -> Item[][]               the next n rows, without changing the run
//   riskInfo(run) -> { beatsToSnap, goldAtRisk, keepIfSnap }
//   simulateRun({ rig, mods, seed, policy }) -> Result      headless run for bots and tests
//   run.state = { status, beat, depth, speed, gold, strain, maxStrain, combo, biomeId, kept, stats }
// Extras: replayText(opts) (readable event log), validateEvent(ev), beatMs(run), setProviders({...}).
import { createRun, riskInfo, haul } from './run.js';
import { stepBeat } from './beat.js';
import { peekRows } from './spawn.js';
import { simulateRun, replayText } from './simulate.js';
import { validateEvent } from './events.js';
import { setProviders } from './registry.js';
import { ENGINE } from '../data/engine.js';

export function peekNext(run, n) {
  try { return run && run.state ? peekRows(run, n) : []; } catch (e) { return []; }
}

// Length of one beat in milliseconds (the loop uses this). Faster drops beat quicker? No: the beat is fixed.
export function beatMs() {
  return ENGINE.baseBeatMs;
}

export { chooseBoon, useSkill, skillCheck, playView, autoChoose, autoSkills } from './play/api.js'; // [HOOK-1]
export { createRun, stepBeat, haul, riskInfo, simulateRun, replayText, validateEvent, setProviders };
