// One beat of the drop. FIRING ORDER (stable forever: replays and tests depend on it):
//   1. depth += speed                        (speed = base + bonuses, times cheat speedMult)
//   2. spawn one row of items (seeded by seed + beat number)
//   3. lanes LEFT to RIGHT; inside a lane, rows BOTTOM to TOP (last row first)
//        parts act with onHazard (absorb) then onItem (collect / change / split / use up)
//   4. items nobody collected: gems and ore -> MISS, hazards -> hit the rope
//   5. onBeat hooks, LEFT to RIGHT, inside a column BOTTOM to TOP
//   6. strain += perBeat(depth) x strainMult x biomeFactor + flat + hazards + part changes (never below 0)
//   7. strain >= maxStrain -> SNAP
// Events come out in the same order the things happen.
import { ENGINE } from '../data/engine.js';
import { ev } from './events.js';
import { spawnRow, biomeFor } from './spawn.js';
import { travel } from './pipeline.js';
import { beatStrainDelta, isSnap } from './strain.js';
import { snapPayout } from './gold.js';
import { clamp, fin, warnOnce } from './safe.js';

// Run one beat. Events are pushed into `out` (an array) or skipped when `out` is null.
export function runBeat(run, out) {
  const st = run.state, cheat = run.mods.cheat;
  if (st.status !== 'running') return;
  run.out = out;
  st.beat++;

  // 1. speed and depth
  let speed = (ENGINE.baseSpeed + run.mods.speedBonus + run.speedPending) * (cheat ? cheat.speedMult : 1);
  run.speedPending = 0;
  speed = clamp(fin(speed, ENGINE.baseSpeed, 'speed'), ENGINE.minSpeed, ENGINE.maxSpeed);
  st.speed = speed;
  st.depth = fin(st.depth + speed, st.depth, 'depth');
  if (out) out.push(ev.beat(st.beat, st.depth, speed));

  // biome and milestones
  const def = biomeFor(run, st.depth);
  const id = def.id || st.biomeId;
  if (id !== st.biomeId) { st.biomeId = id; if (out) out.push(ev.biome(id, st.depth)); }
  const mile = Math.floor(st.depth / ENGINE.milestoneEvery);
  if (mile > run.lastMilestone) {
    run.lastMilestone = mile;
    if (out) out.push(ev.milestone(mile * ENGINE.milestoneEvery));
  }

  // 2. spawn
  spawnRow(run, st.beat, st.depth, def, run.row);
  if (out) out.push(ev.spawn(st.beat, run.row));

  // 3 + 4. lanes
  run.firedThisBeat = 0; run.collectsThisBeat = 0; run.strainAdjust = 0; run.hazardStrain = 0;
  run.extraUsed = 0; run.triggerDepth = 0;
  for (let lane = 0; lane < run.cols; lane++) {
    const item = run.row[lane];
    if (item.kind === 'empty') continue;
    run.chainR = -1;
    travel(run, lane, item, run.rows - 1);
  }

  // 5. onBeat hooks
  const ctx = run.ctx;
  for (let c = 0; c < run.cols; c++) {
    for (let r = run.rows - 1; r >= 0; r--) {
      const idx = r * run.cols + c, part = run.parts[idx];
      if (!part || typeof part.onBeat !== 'function') continue;
      run.chainR = -1;
      ctx.enter(r, c, idx);
      try { part.onBeat(ctx); } catch (e) { warnOnce('beat:' + run.partIds[idx], 'part ' + run.partIds[idx] + ' failed in onBeat'); run.parts[idx] = null; }
      ctx.leave();
    }
  }
  if (run.collectsThisBeat === 0) st.combo = 0;

  // 6. strain
  const before = st.strain;
  if (!(cheat && cheat.freezeStrain)) {
    const d = beatStrainDelta(st.depth, run.mods, fin(def.strainFactor, 1, 'strainFactor'), run.hazardStrain, run.mods.flatStrain, run.strainAdjust);
    st.strain = Math.max(0, fin(st.strain + d, st.strain, 'strain'));
  }
  const noSnap = cheat && cheat.noSnap;
  if (noSnap && st.strain > st.maxStrain) st.strain = st.maxStrain;
  const delta = st.strain - before;
  run.slope[run.slopeIdx] = delta;
  run.slopeIdx = (run.slopeIdx + 1) % run.slope.length;
  if (run.slopeCount < run.slope.length) run.slopeCount++;
  if (st.strain > st.stats.peakStrain) st.stats.peakStrain = st.strain;
  if (out) out.push(ev.strain(st.strain, st.maxStrain, delta));

  // 7. snap
  if (!noSnap && isSnap(st.strain, st.maxStrain)) {
    const pay = snapPayout(st.gold, run.mods.keepOnSnap);
    st.status = 'snapped';
    st.kept = pay.goldKept;
    if (out) out.push(ev.snap(pay.goldLost, pay.goldKept));
  }
  run.out = null;
}

// Public: advance exactly one beat and return its events. Never throws.
export function stepBeat(run) {
  const out = [];
  if (!run || !run.state || run.state.status !== 'running') return out;
  try { runBeat(run, out); } catch (e) { warnOnce('beat-crash', 'beat failed: ' + (e && e.message)); if (run) run.out = null; }
  return out;
}
