// Crash safety: if a drop was running when the page closed, pay it once as a snap of the last known state.
import { deps, call } from './deps.js';
import records from './records.js';
import { computePayout } from './payout.js';
import { applyPayout } from './finish.js';
import { S } from './state.js';

// Returns the payout if one was paid, otherwise null. Safe to call many times.
export function recover() {
  S.recoveredChecked = true;
  try {
    const cp = records.peekCheckpoint();
    if (!cp) return null;
    if (cp.seed === records.lastPaidSeed() || (cp.depth <= 0 && cp.gold <= 0)) {
      records.clearCheckpoint();
      call(deps.save, 'saveNow');
      return null;
    }
    const payout = computePayout({
      outcome: 'snapped', gold: cp.gold, goldKept: Math.floor(cp.gold * cp.keepOnSnap), depth: cp.depth,
      bestBefore: records.bestDepth(), goals: [], cheated: cp.cheated, fmt: deps.fmt,
    });
    applyPayout(payout, cp.seed, cp.biomeId, cp.cheated);
    deps.bus.emit('run:recovered', { ...payout, seed: cp.seed });
    return payout;
  } catch (e) {
    deps.log.error('run: recovery failed', e && e.message);
    return null;
  }
}

export function ensureRecovered() {
  if (!S.recoveredChecked) recover();
}
