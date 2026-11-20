// Slice `run`: best depth, per-biome bests, total drops, longest haul, plus the crash checkpoint.
import { deps, call } from './deps.js';
import { nextSnapStreak } from '../engine/play/mercy.js'; // [HOOK-1] snaps in a row
import { cleanGhost } from './chase.js'; // [HOOK-1] wave 2: ghost of the best drop

const SLICE = 'run';
const VERSION = 1;
let registered = false;

function num(x, min = 0) {
  const n = Number(x);
  return Number.isFinite(n) && n >= min ? n : min;
}

function cleanBiomes(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(raw)) {
      const b = raw[id] || {};
      out[id] = { drops: Math.floor(num(b.drops)), bestGold: num(b.bestGold) };
    }
  }
  return out;
}

function cleanCheckpoint(cp) {
  if (!cp || typeof cp !== 'object' || !Number.isFinite(Number(cp.seed))) return null;
  return {
    seed: Number(cp.seed), beat: Math.floor(num(cp.beat)), depth: num(cp.depth), gold: num(cp.gold),
    keepOnSnap: Math.min(0.6, num(cp.keepOnSnap, 0) || 0.3), cheated: !!cp.cheated,
    biomeId: typeof cp.biomeId === 'string' ? cp.biomeId : 'clay',
  };
}

// Make any saved shape safe. Used for old versions and for corrupt data.
export function clean(old) {
  const o = old && typeof old === 'object' ? old : {};
  return {
    bestDepth: num(o.bestDepth), perBiome: cleanBiomes(o.perBiome),
    totalDrops: Math.floor(num(o.totalDrops)), longestHaul: num(o.longestHaul),
    totalKept: num(o.totalKept), checkpoint: cleanCheckpoint(o.checkpoint),
    lastPaidSeed: Number.isFinite(Number(o.lastPaidSeed)) ? Number(o.lastPaidSeed) : null,
    ghost: cleanGhost(o.ghost), // [HOOK-1] Gold by depth of the best drop
    snapStreak: Math.min(99, Math.max(0, Math.floor(num(o.snapStreak)))), // [HOOK-1] snaps in a row (mercy)
  };
}

function slice() {
  if (!registered) {
    registered = true;
    call(deps.save, 'registerSlice', SLICE, {
      version: VERSION, defaults: clean({}), migrate: (old) => clean(old),
    });
  }
  const s = deps.save.getSlice(SLICE);
  if (s && typeof s.bestDepth !== 'number') Object.assign(s, clean(s)); // repair a bad slice in place
  return s || clean({});
}

function dirty() { call(deps.save, 'markDirty', SLICE); }

export function bestDepth() { return slice().bestDepth; }
export function getSnapStreak() { return slice().snapStreak || 0; } // [HOOK-1]
export function getGhost() { return cleanGhost(slice().ghost); } // [HOOK-1]

export function get() {
  const s = slice();
  return { bestDepth: s.bestDepth, perBiome: { ...s.perBiome }, totalDrops: s.totalDrops, longestHaul: s.longestHaul };
}

// Record a finished drop. Cheated drops count for nothing.
export function recordDrop({ outcome, depth, kept, biomeId, cheated, ghost } = {}) {
  const s = slice();
  const bestBefore = s.bestDepth;
  if (cheated) return { bestBefore, newRecord: false };
  s.snapStreak = nextSnapStreak(s.snapStreak, outcome); // [HOOK-1]
  const d = num(depth);
  const newRecord = d > bestBefore;
  if (newRecord) { s.bestDepth = d; if (Array.isArray(ghost)) s.ghost = cleanGhost(ghost); } // [HOOK-1]
  s.totalDrops += 1;
  s.totalKept += num(kept);
  if (outcome === 'hauled') s.longestHaul = Math.max(s.longestHaul, d);
  const id = typeof biomeId === 'string' ? biomeId : 'clay';
  const b = s.perBiome[id] || (s.perBiome[id] = { drops: 0, bestGold: 0 });
  b.drops += 1;
  b.bestGold = Math.max(b.bestGold, num(kept));
  dirty();
  return { bestBefore, newRecord };
}

export function saveCheckpoint(cp) {
  const s = slice();
  s.checkpoint = cleanCheckpoint(cp);
  dirty();
}
export function peekCheckpoint() { return slice().checkpoint; }
export function clearCheckpoint() { const s = slice(); s.checkpoint = null; dirty(); }
export function lastPaidSeed() { return slice().lastPaidSeed; }
export function markPaid(seed) { const s = slice(); s.lastPaidSeed = Number.isFinite(Number(seed)) ? Number(seed) : null; dirty(); }

// For tests: forget that the slice was registered.
export function _forget() { registered = false; }

export const records = { bestDepth, getGhost, getSnapStreak, get, recordDrop, saveCheckpoint, peekCheckpoint, clearCheckpoint, lastPaidSeed, markPaid };
export default records;
