// Daily twists. getTwist(id), todaysTwist(dateKey), applyTwist(mods, id).
import { TWIST_DATA, TWIST_ORDER } from '../data/twists.js';

// Safe starting numbers when a field is missing or broken.
const DEFAULTS = { hazardRate: 1, gemRate: 1, oreRate: 1, hazardGold: 0, speedBonus: 0, relicBonus: 0, maxStrain: 100, goldMult: 1, strainMult: 1, luck: 0, startDepth: 0 };

// Apply one overlay entry to a number.
function applyOp(base, op) {
  let v = base;
  if (typeof op.add === 'number') v += op.add;
  if (typeof op.mul === 'number') v *= op.mul;
  if (typeof op.min === 'number') v = Math.max(v, op.min);
  if (typeof op.max === 'number') v = Math.min(v, op.max);
  return Number.isFinite(v) ? v : base;
}

// Returns a NEW mods object with the overlay applied. Bad input returns the input.
export function applyOverlay(mods, overlay) {
  if (!mods || typeof mods !== 'object' || !overlay) return mods;
  const out = Object.assign({}, mods);
  for (const key of Object.keys(overlay)) {
    const base = Number.isFinite(out[key]) ? out[key] : (key in DEFAULTS ? DEFAULTS[key] : 0);
    out[key] = applyOp(base, overlay[key]);
  }
  return out;
}

// getTwist(id) -> { id, name, desc, overlay, apply(mods) } | null
export function getTwist(id) {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(TWIST_DATA, id)) return null;
  const d = TWIST_DATA[id];
  return { id, name: d.name, desc: d.desc, overlay: d.overlay, apply: (mods) => applyOverlay(mods, d.overlay) };
}

export function allTwists() {
  return TWIST_ORDER.map(getTwist);
}

export function applyTwist(mods, id) {
  const t = getTwist(id);
  return t ? t.apply(mods) : mods;
}

// Days since 1970-01-01 for "YYYY-MM-DD". Returns null if the key is not a real date.
function dayNumber(dateKey) {
  if (typeof dateKey !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return Math.floor(t / 86400000);
}

// Small deterministic shuffle of the twist list for one 8-day cycle.
function cycleOrder(cycle) {
  const list = TWIST_ORDER.slice();
  let s = (cycle * 2654435761 + 12345) >>> 0;
  for (let i = list.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  }
  return list;
}

// todaysTwist(dateKey) -> id. Same date, same twist. Every 8 days all 8 twists appear once,
// and the same twist never shows two days in a row. Bad date gives null.
export function todaysTwist(dateKey) {
  const n = dayNumber(dateKey);
  if (n === null) return null;
  const cycle = Math.floor(n / 8), pos = ((n % 8) + 8) % 8;
  let order = cycleOrder(cycle);
  if (pos === 0) {
    // Make sure the first twist differs from the last twist of the cycle before.
    const prevLast = cycleOrder(cycle - 1)[7];
    if (order[0] === prevLast) { const t = order[0]; order[0] = order[1]; order[1] = t; }
  }
  // The swap above must not change the previous cycle's own last twist, so only position 0/1 move.
  if (pos === 1 && cycleOrder(cycle)[0] === cycleOrder(cycle - 1)[7]) {
    const o = cycleOrder(cycle); const t = o[0]; o[0] = o[1]; o[1] = t; order = o;
  }
  return order[pos];
}
