// Finishing a drop: pay out, record, clear the crash checkpoint, tell everyone. Runs once per drop.
import { deps, call } from './deps.js';
import { S } from './state.js';
import records from './records.js';
import goalsApi from './goals.js';
import { computePayout } from './payout.js';
import { buildView } from './view.js';
import { nearMiss, bestNextTip } from './chase.js'; // [HOOK-1] wave 2

export const SNAP_KEEP_MAX = 0.6;

export function keepFraction(mods) {
  const k = Number(mods && mods.keepOnSnap);
  return Number.isFinite(k) ? Math.min(SNAP_KEEP_MAX, Math.max(0, k)) : 0.3;
}

// Money is added, the checkpoint is cleared, then everything is saved in one write.
// If the page dies before that write, the old checkpoint stays and pays once on the next start.
export function applyPayout(payout, seed, biomeId, cheated, ghost) {
  call(deps.meta, 'addGold', payout.kept);
  call(deps.meta, 'addShards', payout.shardsEarned);
  records.recordDrop({ outcome: payout.outcome, depth: payout.depth, kept: payout.kept, biomeId, cheated, ghost });
  records.markPaid(seed);
  records.clearCheckpoint();
  call(deps.save, 'saveNow');
}

export function finishRun(outcome) {
  if (S.ended || !S.run) return null;
  S.ended = true;
  S.status = 'ended';
  try { if (S.loop) S.loop.stop(); } catch (e) { deps.log.warn('run: loop stop failed'); }
  S.loop = null;

  const st = S.run.state || {};
  const final = outcome === 'hauled' ? 'hauled' : 'snapped';
  const gold = Math.max(0, Number(st.gold) || 0);
  const cheated = !!(S.mods && S.mods.cheat);
  const keptIfSnap = S.snap && Number.isFinite(Number(S.snap.goldKept))
    ? Number(S.snap.goldKept) : Math.floor(gold * keepFraction(S.mods));

  goalsApi.finalize(S.goals, { outcome: final, depth: st.depth, strain: st.strain });
  const payout = computePayout({
    outcome: final, gold, goldKept: keptIfSnap, depth: st.depth, bestBefore: S.bestBefore,
    goals: S.goals, tally: S.tally, partsInRig: S.rig ? S.rig.cells.flat().filter(Boolean) : [],
    cheated, fmt: deps.fmt,
  });

  const pl = S.run.play; // [HOOK-1] what the play layer earned
  if (pl) {
    payout.shardsEarned = (Number(payout.shardsEarned) || 0) + (pl.shardsWon || 0);
    payout.play = { boons: pl.boons.slice(), relics: pl.relics.slice(), shards: pl.shardsWon, guardians: pl.gd ? pl.gd.beaten.slice() : [], stats: pl.stats };
  }
  try {
    applyPayout(payout, S.seed, st.biomeId, cheated, S.ghostRec ? S.ghostRec.finish() : null);
  } catch (e) {
    deps.log.error('run: payout failed', e && e.message);
  }
  try { // [HOOK-1] wave 2: near-miss line and one tip for the Results screen (after the payout, so 'you can buy it now' is true)
    const ups = deps.meta && deps.meta.upgrades, d = ups && typeof ups.def === 'function' ? ups.def('mender') : null, inf = ups && typeof ups.info === 'function' ? ups.info('mender') : null;
    payout.chase = {
      nearMiss: nearMiss({ depth: st.depth, bestBefore: S.bestBefore, newRecord: payout.newRecord, cheated, fmt: deps.fmt }),
      tip: bestNextTip({ outcome: final, gold, cheated, upgrade: inf && d ? { id: inf.id, name: inf.name, level: inf.level, max: inf.max, maxed: inf.maxed, per: d.per, canBuy: inf.canBuy } : null, fmt: deps.fmt }),
    };
  } catch (e) { payout.chase = { nearMiss: null, tip: null }; }

  const result = { ...payout, seed: S.seed, rig: S.rig };
  S.result = result;
  S.view = buildView(S.run, { goals: S.goals, bestDepth: S.bestBefore, status: final });
  call(deps.meta && deps.meta.stats, 'record', result);
  deps.bus.emit('run:ended', result);
  return result;
}
