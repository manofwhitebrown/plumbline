// The one bag of live numbers for the current drop. Only src/run/ files touch it.
import { createTally } from './tally.js';

export function freshState() {
  return {
    status: 'idle',      // idle | running | paused | ended
    ended: false,        // set first when a drop finishes, so finishing happens once
    run: null, loop: null, mods: null, rig: null, seed: 0, goals: [], tally: createTally(),
    bestBefore: 0, recordSent: false, snap: null, lastBeatMs: 0, beats: 0, errors: 0,
    view: null, result: null, frameCbs: [], recoveredChecked: false, counter: 0, hauling: false, lifecycle: false, tutorial: false,
  };
}

export const S = freshState();

// Reset everything for a new drop (keeps the frame listeners and the recovery flag).
export function resetState() {
  const keep = { frameCbs: S.frameCbs, recoveredChecked: S.recoveredChecked, counter: S.counter, lifecycle: S.lifecycle, view: S.view, result: S.result };
  Object.assign(S, freshState(), keep);
}

export function hardReset() {
  Object.assign(S, freshState());
}
