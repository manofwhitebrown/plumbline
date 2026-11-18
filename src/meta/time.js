// One place to read the time. Tests can replace it so they never use the real clock.
import * as clock from '../core/clock.js';

let source = null;
let tzOverride = null;

export function now() {
  const t = source ? source() : clock.now();
  return Number.isFinite(t) ? t : 0;
}

// Tests only: setTimeSource(() => 123456, 0). Call with no args to go back to the real clock.
export function setTimeSource(fn, tzOffsetMinutes) {
  source = typeof fn === 'function' ? fn : null;
  tzOverride = tzOffsetMinutes == null ? null : tzOffsetMinutes;
}

// Whole days since 1970, counted in the player's local time zone.
export function dayIndex(ts = now()) {
  let off = tzOverride;
  if (off == null) {
    try { off = new Date(ts).getTimezoneOffset(); } catch { off = 0; }
  }
  if (!Number.isFinite(off)) off = 0;
  const d = Math.floor((ts - off * 60000) / 86400000);
  return Number.isFinite(d) ? d : 0;
}

// Milliseconds until the next local midnight.
export function msToNextDay(ts = now()) {
  const day = dayIndex(ts);
  let off = tzOverride;
  if (off == null) { try { off = new Date(ts).getTimezoneOffset(); } catch { off = 0; } }
  if (!Number.isFinite(off)) off = 0;
  const next = (day + 1) * 86400000 + off * 60000;
  return Math.max(0, Math.min(86400000, next - ts));
}
