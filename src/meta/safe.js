// Safe number helpers. Money must never become NaN, Infinity or negative.
import { LIMITS } from '../data/upgrades.js';

export function num(n, fallback = 0) {
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

// Finite, 0 or more, never above the big-number cap.
export function money(n) {
  const x = num(n, 0);
  if (x <= 0) return 0;
  return x > LIMITS.bigNumber ? LIMITS.bigNumber : x;
}

export function clamp(n, lo, hi) {
  const x = num(n, lo);
  return x < lo ? lo : x > hi ? hi : x;
}

// A whole number, 0 or more.
export function count(n, max = 1e9) {
  return Math.floor(clamp(n, 0, max));
}

// Copy a plain object of id -> count, dropping bad values.
export function cleanCounts(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const k of Object.keys(obj)) {
    const v = count(obj[k]);
    if (v > 0) out[k] = v;
  }
  return out;
}
