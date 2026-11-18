// Time helpers. now() never goes backwards, even if the player changes the device clock.
let source = () => Date.now();
let offset = 0;   // grows when the device clock jumps back, so our time keeps moving forward
let last = 0;

export function now() {
  let raw = Number(source());
  if (!Number.isFinite(raw)) raw = last;
  let t = raw + offset;
  if (t < last) {            // the clock went back: bend our time so it carries on from `last`
    offset += last - t;
    t = last;
  }
  last = t;
  return t;
}

// Milliseconds since ts. Never negative. Never above capMs (default 30 days).
export function elapsedSince(ts, capMs = 30 * 24 * 3600 * 1000) {
  const start = Number(ts);
  if (!Number.isFinite(start)) return 0;
  let cap = Number(capMs);
  if (!Number.isFinite(cap) || cap < 0) cap = 0;
  const d = now() - start;
  if (!(d > 0)) return 0;
  return d > cap ? cap : d;
}

// For tests: swap the time source (a function returning ms) or pass nothing to restore.
export function setTimeSource(fn) {
  source = typeof fn === 'function' ? fn : () => Date.now();
  offset = 0;
  last = 0;
}

export const clock = { now, elapsedSince, setTimeSource };
export default clock;
