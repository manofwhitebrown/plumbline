// Test helpers for the parts. A tiny stand-in for the engine beat, so parts can be tested alone.
import { makeRng } from '../src/core/rng.js';
import { table, } from '../src/data/loot.js';
import { byDepth } from '../src/data/biomes.js';
import { beginBeat, processLane, finishBeat, applyPassives } from '../src/engine/parts/runtime.js';

export function rigOf(rows) {
  // rows: array of arrays of ids (top row first). Pads with null.
  const cols = Math.max(4, ...rows.map((r) => r.length));
  const cells = rows.map((r) => { const a = r.slice(); while (a.length < cols) a.push(null); return a; });
  return { cols: cols > 5 ? 5 : cols, rows: rows.length, cells };
}

export function newRun(rig, mods) {
  const m = Object.assign({ maxStrain: 100, keepOnSnap: 0.3, goldMult: 1, strainMult: 1, luck: 0, startDepth: 0 }, mods || {});
  const mods2 = applyPassives(rig, m);
  return { rig, mods: mods2, state: { status: 'running', beat: 0, depth: 0, speed: 1, gold: 0, strain: 0, maxStrain: mods2.maxStrain } };
}

export const gem = (tier = 1, value) => ({ kind: 'gem', tier, value: value === undefined ? Math.pow(3, tier - 1) : value });
export const ore = (tier = 1, value) => ({ kind: 'ore', tier, value: value === undefined ? Math.pow(3, tier - 1) * 0.5 : value });
export const rock = () => ({ kind: 'hazard', tier: 1, hazard: 'rock', value: 0 });
export const relic = () => ({ kind: 'relic', tier: 3, value: 27 });

// Run ONE beat with chosen items per lane. Returns { events, fx, gold, collected }.
export function beatWith(run, lanes, rng) {
  const events = [];
  const emit = (e) => events.push(e);
  const r = rng || makeRng(1);
  const fx = beginBeat(run, emit, r);
  for (let l = 0; l < lanes.length; l++) if (lanes[l]) processLane(run, l, lanes[l], emit, r);
  finishBeat(run, emit, r);
  let gold = 0;
  const collected = [];
  for (let i = 0; i < fx.nCollected; i++) { const rec = fx.collected[i]; gold += rec.item.value; collected.push({ lane: rec.lane, r: rec.r, c: rec.c, item: rec.item, echo: rec.echo }); }
  return { events, fx, gold: gold + fx.bonusValue, collected, hazards: fx.hazards.slice(0, fx.nHazards).map((h) => ({ lane: h.lane, absR: h.absR, absC: h.absC })), missed: fx.nMissed };
}

export const count = (events, t, partId) => events.filter((e) => e.t === t && (partId === undefined || e.partId === partId)).length;

// A small full run (stand-in for the engine) using real spawn tables. Used by fuzz and balance checks.
export function miniRun(rig, mods, seed, policy, maxBeats = 800) {
  const run = newRun(rig, mods);
  const rng = makeRng(seed);
  const st = run.state;
  const emit = () => {};
  st.depth = run.mods.startDepth || 0;
  for (let b = 0; b < maxBeats && st.status === 'running'; b++) {
    st.beat = b;
    const fx = beginBeat(run, emit, rng);
    st.speed = Math.max(0.25, 1 + (run.mods.speedBonus || 0) + fx.speedAdd);
    st.depth += st.speed;
    const biome = byDepth(st.depth);
    const tbl = table(biome.id, run.mods.luck || 0);
    const lanes = [];
    for (let l = 0; l < rig.cols; l++) lanes.push(Object.assign({}, rng.weighted(tbl)));
    let hazardStrain = 0;
    for (let l = 0; l < rig.cols; l++) processLane(run, l, lanes[l], emit, rng);
    finishBeat(run, emit, rng);
    let g = 0;
    for (let i = 0; i < fx.nCollected; i++) g += fx.collected[i].item.value;
    st.gold += (g + fx.bonusValue) * run.mods.goldMult;
    for (let i = 0; i < fx.nHazards; i++) if (fx.hazards[i].absR < 0) hazardStrain += 6;
    const base = (0.35 + 0.0016 * st.depth) * (run.mods.strainMult || 1);
    st.strain = Math.max(0, st.strain + base + hazardStrain + fx.strainDelta);
    if (st.strain >= st.maxStrain) { st.status = 'snapped'; st.gold *= run.mods.keepOnSnap; break; }
    if (policy && policy(run) === 'haul') { st.status = 'hauled'; break; }
  }
  return run;
}
