// Builds each beat's row of Items from the biome tables. Seeded and pure:
// the row for beat N depends only on (seed, N, depth, mods), never on what parts did.
// That is why peekNext() can look ahead without changing the real run.
import { makeRng } from '../core/rng.js';
import { ENGINE } from '../data/engine.js';
import { fin } from './safe.js';

// Turn any seed (number, text, nothing) into a 32-bit whole number.
export function seedToInt(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.floor(Math.abs(seed)) >>> 0;
  if (typeof seed === 'string') {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  return 1;
}

// Mix the run seed with the beat number into a fresh seed for that beat.
export function mixSeed(seed, beat) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(beat + 1, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

export function newItem() {
  return { kind: 'empty', tier: 1, value: 0, hazard: '', collected: false, drifts: false };
}

// The biome for a depth (or the locked one when a cheat forces it).
export function biomeFor(run, depth) {
  const forced = run.mods.cheat && run.mods.cheat.forceBiome;
  let def = null;
  try { def = forced ? run.deps.byId(forced) : run.deps.byDepth(depth); } catch (e) { def = null; }
  if (!def && forced) { try { def = run.deps.byDepth(depth); } catch (e) { def = null; } }
  return def || { id: 'clay', goldFactor: 1, strainFactor: 1, hazardStrain: ENGINE.fallbackHazardStrain, mix: null };
}

// Fill `row` (array of pooled items, one per lane) for the given beat.
export function spawnRow(run, beat, depth, def, row) {
  const rng = makeRng(mixSeed(run.seed, beat));
  let table = null;
  try { table = run.deps.lootTable(def, run.mods.luck); } catch (e) { table = null; }
  const ok = Array.isArray(table) && table.length > 0;
  const relicBonus = run.mods.relicBonus || 0;
  for (let lane = 0; lane < run.cols; lane++) {
    const it = row[lane];
    const pick = ok ? rng.weighted(table) : null;
    const u = rng.next(); // always drawn, so the stream never shifts
    it.collected = false; it.drifts = false;
    if (!pick || typeof pick.kind !== 'string') { it.kind = 'empty'; it.tier = 1; it.value = 0; it.hazard = ''; continue; }
    it.kind = pick.kind;
    it.tier = fin(pick.tier, 1, 'tier');
    it.value = fin(pick.value, 0, 'item value');
    it.hazard = pick.hazard || '';
    if (it.kind === 'hazard') {
      it.drifts = pick.drifts === true;
      run.drift[lane] = u;
      const hs = def.hazardStrain || ENGINE.fallbackHazardStrain;
      it.value = fin(hs[it.hazard], ENGINE.fallbackHazardStrain[it.hazard] || 3, 'hazard strain');
    } else if (relicBonus > 0 && it.kind !== 'empty' && u < relicBonus) {
      it.kind = 'relic';
      it.value = it.value * ENGINE.relicFactor;
    }
  }
  // Bats hop to a free side lane (half of them). Uses the same draw `u`, so it stays seeded.
  for (let lane = 0; lane < run.cols; lane++) {
    const it = row[lane];
    if (!it.drifts) continue;
    it.drifts = false;
    const u = run.drift[lane];
    if (u >= 0.5) continue;
    const to = u < 0.25 ? lane - 1 : lane + 1;
    if (to < 0 || to >= run.cols || row[to].kind !== 'empty') continue;
    const dst = row[to];
    dst.kind = it.kind; dst.tier = it.tier; dst.value = it.value; dst.hazard = it.hazard; dst.collected = false;
    it.kind = 'empty'; it.value = 0; it.hazard = '';
  }
  return row;
}

// Look at the next n rows without touching the run. Returns fresh copies.
export function peekRows(run, n) {
  const st = run.state;
  const count = Math.max(0, Math.min(ENGINE.peekMax, Math.floor(fin(n, 0, 'peek count'))));
  const out = [];
  if (st.status !== 'running') return out;
  const tmp = run.peekRow;
  for (let k = 1; k <= count; k++) {
    const depth = st.depth + st.speed * k;
    spawnRow(run, st.beat + k, depth, biomeFor(run, depth), tmp);
    const lanes = [];
    for (let l = 0; l < run.cols; l++) {
      const it = tmp[l];
      const o = { kind: it.kind, tier: it.tier, value: it.value };
      if (it.hazard) o.hazard = it.hazard;
      lanes.push(o);
    }
    out.push(lanes);
  }
  return out;
}
