// createRun: turns a rig + mods + seed into a Run, and checks every input on the way.
import { makeRng } from '../core/rng.js';
import { ENGINE, DEFAULT_MODS } from '../data/engine.js';
import { getProviders } from './registry.js';
import { seedToInt, newItem, biomeFor } from './spawn.js';
import { Ctx } from './ctx.js';
import { clampNum, fin, warnOnce } from './safe.js';

const L = ENGINE.limits;

// A safe copy of mods. Unknown or bad values fall back to defaults.
export function sanitizeMods(m) {
  const src = m && typeof m === 'object' ? m : {};
  const out = { ...DEFAULT_MODS, ...src };
  out.maxStrain = clampNum(src.maxStrain, L.maxStrain[0], L.maxStrain[1], 100, 'maxStrain');
  out.keepOnSnap = clampNum(src.keepOnSnap, L.keepOnSnap[0], L.keepOnSnap[1], 0.3, 'keepOnSnap');
  out.goldMult = clampNum(src.goldMult, L.goldMult[0], L.goldMult[1], 1, 'goldMult');
  out.strainMult = clampNum(src.strainMult, L.strainMult[0], L.strainMult[1], 1, 'strainMult');
  out.luck = clampNum(src.luck, L.luck[0], L.luck[1], 0, 'luck');
  out.startDepth = clampNum(src.startDepth, L.startDepth[0], L.startDepth[1], 0, 'startDepth');
  out.speedBonus = clampNum(src.speedBonus, -5, 20, 0, 'speedBonus');     // from part passives
  out.flatStrain = clampNum(src.flatStrain, -50, 50, 0, 'flatStrain');     // from part passives
  out.relicBonus = clampNum(src.relicBonus, 0, 1, 0, 'relicBonus');       // from part passives
  out.cheat = sanitizeCheat(src.cheat);
  return out;
}

// Cheats only exist when mods.cheat is an object. Otherwise this returns null.
function sanitizeCheat(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    noSnap: c.noSnap === true,
    freezeStrain: c.freezeStrain === true,
    speedMult: clampNum(c.speedMult, L.speedMult[0], L.speedMult[1], 1, 'cheat.speedMult'),
    forceBiome: typeof c.forceBiome === 'string' && c.forceBiome ? c.forceBiome : null,
    goldMult: clampNum(c.goldMult, L.cheatGoldMult[0], L.cheatGoldMult[1], 1, 'cheat.goldMult'),
  };
}

// A safe rig: size clamped to 4-5 x 3-4, missing cells empty, ids kept as text.
export function sanitizeRig(rig, mods) {
  const r = rig && typeof rig === 'object' ? rig : {};
  const cols = Math.round(clampNum(r.cols, 4, 5, mods.cols, 'rig.cols'));
  const rows = Math.round(clampNum(r.rows, 3, 4, mods.rows, 'rig.rows'));
  const cells = [];
  for (let y = 0; y < rows; y++) {
    const line = [];
    for (let x = 0; x < cols; x++) {
      const id = Array.isArray(r.cells) && Array.isArray(r.cells[y]) ? r.cells[y][x] : null;
      line.push(typeof id === 'string' && id ? id : null);
    }
    cells.push(line);
  }
  return { cols, rows, cells };
}

function newStats() {
  return { collected: 0, gems: 0, ore: 0, relics: 0, missed: 0, hazardsHit: 0, hazardsAbsorbed: 0,
    chains: 0, maxCombo: 0, peakStrain: 0, fires: {} };
}

export function createRun({ rig, mods, seed, deps } = {}) {
  const d = { ...getProviders(), ...(deps || {}) };
  const m0 = sanitizeMods(mods);
  const rg = sanitizeRig(rig, m0);
  const n = rg.cols * rg.rows;
  const parts = new Array(n).fill(null), partIds = new Array(n).fill(''), mem = new Array(n);
  const seen = new Set();
  let eff = m0;
  for (let y = 0; y < rg.rows; y++) {
    for (let x = 0; x < rg.cols; x++) {
      const id = rg.cells[y][x], i = y * rg.cols + x;
      mem[i] = {};
      let part = null;
      try { part = id ? d.getPart(id) : null; } catch (e) { part = null; }
      if (id && !part) warnOnce('unknown:' + id, 'unknown part ' + id + ' treated as empty');
      if (!part) { rg.cells[y][x] = null; continue; }
      parts[i] = part; partIds[i] = id;
      if (!seen.has(id) && typeof part.passive === 'function') {   // each kind of part counts once
        seen.add(id);
        try { const out = part.passive({ ...eff }); if (out && typeof out === 'object') eff = out; } catch (e) { warnOnce('passive:' + id, 'passive failed for ' + id); }
      }
    }
  }
  eff = sanitizeMods({ ...eff, cheat: m0.cheat });
  const seedInt = seedToInt(seed);
  const cheat = eff.cheat;
  const run = {
    state: { status: 'running', beat: 0, depth: eff.startDepth, speed: ENGINE.baseSpeed, gold: 0, strain: 0,
      maxStrain: eff.maxStrain, combo: 0, biomeId: 'clay', kept: 0, stats: newStats() },
    rig: rg, mods: eff, seed: seedInt, rng: makeRng(seedInt), deps: d,
    cols: rg.cols, rows: rg.rows, parts, partIds, mem,
    goldMult: fin(eff.goldMult * (cheat ? cheat.goldMult : 1), 1, 'goldMult'),
    row: Array.from({ length: rg.cols }, newItem), peekRow: Array.from({ length: rg.cols }, newItem),
    extras: Array.from({ length: ENGINE.maxExtraItems }, newItem), extraUsed: 0,
    firedThisBeat: 0, collectsThisBeat: 0, strainAdjust: 0, hazardStrain: 0, speedPending: 0,
    lastCollectValue: 0, chainR: -1, chainC: -1, triggerDepth: 0, out: null,
    slope: new Float64Array(ENGINE.slopeWindow), slopeIdx: 0, slopeCount: 0,
    lastMilestone: 0, ctx: null,
  };
  run.ctx = new Ctx(run);
  run.lastMilestone = Math.floor(run.state.depth / ENGINE.milestoneEvery);
  run.state.biomeId = (biomeFor(run, run.state.depth).id) || 'clay';
  return run;
}

// How close is the snap? beatsToSnap uses the average strain change of the last few beats.
export function riskInfo(run, into) {
  const o = into || {};
  const st = run && run.state;
  if (!st) { o.beatsToSnap = 999; o.goldAtRisk = 0; o.keepIfSnap = 0; return o; }
  const keep = Math.floor(fin(st.gold, 0) * run.mods.keepOnSnap);
  o.keepIfSnap = keep;
  o.goldAtRisk = Math.max(0, Math.floor(fin(st.gold, 0)) - keep);
  let beats = 999;
  if (st.status === 'snapped') beats = 0;
  else if (st.status === 'running') {
    if (st.strain >= st.maxStrain) beats = 0;
    else if (run.slopeCount > 0) {
      let sum = 0;
      for (let i = 0; i < run.slopeCount; i++) sum += run.slope[i];
      const avg = sum / run.slopeCount;
      if (avg > 1e-9) beats = Math.min(999, Math.ceil((st.maxStrain - st.strain) / avg));
    }
  }
  o.beatsToSnap = beats;
  return o;
}

// Player pressed HAUL UP. Only works while running; a second call does nothing.
export function haul(run) {
  if (!run || !run.state || run.state.status !== 'running') return [];
  run.state.status = 'hauled';
  run.state.kept = Math.floor(run.state.gold);
  return [{ t: 'HAUL', gold: run.state.kept, depth: run.state.depth }];
}
