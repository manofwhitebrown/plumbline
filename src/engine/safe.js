// Small safety helpers. They turn bad numbers into good ones and log each problem once.
import { log } from '../core/log.js';

const seen = new Set();

// Log a message only the first time we see this key.
export function warnOnce(key, msg) {
  if (seen.has(key)) return;
  if (seen.size > 200) seen.clear();
  seen.add(key);
  try { log.warn('[engine] ' + msg); } catch (e) { /* logging must never break the game */ }
}

// A finite number, or the fallback (default 0).
export function fin(x, fallback = 0, where = 'value') {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (x !== undefined && x !== null) warnOnce('fin:' + where, 'bad number in ' + where + ', using ' + fallback);
  return fallback;
}

export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

// A clamped finite number.
export function clampNum(x, lo, hi, fallback, where) {
  return clamp(fin(x, fallback, where), lo, hi);
}
