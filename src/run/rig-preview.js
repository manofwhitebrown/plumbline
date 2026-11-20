// Rig preview: combos, plain warnings, and a "power" number from quick seeded test drops.
// Power is worked out a little at a time (under 6 ms per call) so the screen never stutters.
import { deps, call } from './deps.js';

const POWER_SEEDS = 20;
const BUDGET_MS = 6;
const CACHE_MAX = 64;
const FALLBACK_COLLECTORS = new Set(['hook', 'magnet', 'net', 'vacuum']);
const cache = new Map(); // key -> { sum, n }

function clock() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function isCollector(id) {
  try {
    if (typeof deps.getPart === 'function') {
      const p = deps.getPart(id);
      if (p && p.family) return p.family === 'collector';
    }
  } catch (e) { /* use the fallback list */ }
  return FALLBACK_COLLECTORS.has(id);
}

export function warningsFor(rig) {
  const warnings = [];
  const cells = rig && Array.isArray(rig.cells) ? rig.cells : [];
  const cols = rig && rig.cols ? rig.cols : 0;
  let parts = 0, collectors = 0, orphan = false;
  const hasCollector = Array(cols).fill(false);
  for (const row of cells) for (let c = 0; c < cols; c++) {
    if (row && row[c] && isCollector(row[c])) hasCollector[c] = true;
  }
  for (const row of cells) for (let c = 0; c < cols; c++) {
    const id = row && row[c];
    if (!id) continue;
    parts++;
    if (isCollector(id)) collectors++;
    else if (!hasCollector[c]) orphan = true;
  }
  if (parts === 0) warnings.push('Your rig is empty. Place a part to start.');
  else if (collectors === 0) warnings.push('No collector in this rig');
  else if (orphan) warnings.push('Parts have no collector in their column');
  return warnings;
}

function rigKey(rig, mods) {
  const m = mods || {};
  return JSON.stringify([rig.cells, m.maxStrain, m.keepOnSnap, m.goldMult, m.strainMult, m.luck, m.startDepth, m.twist]);
}

// Haul when the rope is close to snapping. A simple, fair test pilot.
function pilot({ run, riskInfo }) {
  let r = riskInfo;
  try { if (typeof r === 'function') r = r(run); } catch (e) { r = null; }
  return r && Number(r.beatsToSnap) <= 6 ? 'haul' : 'continue';
}

function goldOf(res) {
  for (const v of [res && res.kept, res && res.gold, res && res.state && res.state.gold]) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export function powerFor(rig, mods, full) {
  const sim = deps.engine && deps.engine.simulateRun;
  if (typeof sim !== 'function') return { power: 0, ready: true };
  const key = rigKey(rig, mods);
  let entry = cache.get(key);
  if (!entry) {
    if (cache.size >= CACHE_MAX) cache.clear();
    entry = { sum: 0, n: 0 };
    cache.set(key, entry);
  }
  const start = clock();
  const simMods = { ...(mods || {}), cheat: null };
  while (entry.n < POWER_SEEDS && (full || clock() - start < BUDGET_MS)) {
    try {
      entry.sum += goldOf(sim({ rig, mods: simMods, seed: 1000 + entry.n, policy: pilot }));
    } catch (e) {
      deps.log.warn('run: power test failed', e && e.message);
      entry.sum += 0;
    }
    entry.n++;
  }
  return { power: entry.n ? Math.round(entry.sum / entry.n) : 0, ready: entry.n >= POWER_SEEDS };
}

// opts.full = true finishes all test drops now (for tests and bots).
export function preview(rig, mods, opts = {}) {
  try {
    const safe = rig && Array.isArray(rig.cells) ? rig : { cols: 4, rows: 3, cells: [] };
    const combos = typeof deps.detectCombos === 'function' ? (deps.detectCombos(safe) || []) : [];
    const p = powerFor(safe, mods, !!opts.full);
    return { combos, power: p.power, powerReady: p.ready, warnings: warningsFor(safe) };
  } catch (e) {
    deps.log.warn('run: preview failed', e && e.message);
    return { combos: [], power: 0, powerReady: true, warnings: [] };
  }
}

export function _clearPowerCache() { cache.clear(); }
export default { preview, warningsFor, powerFor };
