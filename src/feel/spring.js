// feel/spring.js: smooth following for numbers, vectors and colours. Pure logic, no DOM.
//
// API (all times in milliseconds, all calls safe with NaN, undefined or huge dt):
//   createSpring(value = 0, smoothMs = 150, opts?)  -> { value, vel, target, update(target, dtMs) -> value, snap(v), settled() }
//       Critically damped (no overshoot). smoothMs ~ time to reach the target. opts.maxSpeed (units/s) is optional.
//   createSpring2(x, y, smoothMs)  -> { x, y, update(tx, ty, dtMs), snap(x, y), settled() }
//   createColorSpring(r, g, b, smoothMs) -> { r, g, b, update(tr, tg, tb, dtMs), snap(...), toCss() }  (channels 0..255)
//   smoothDamp(current, target, vel, smoothMs, dtMs, out) -> out = { value, vel }   (low level, writes into `out`, no allocation)
//   damp(current, target, lambdaPerSec, dtMs) -> number   (exponential ease, frame-rate independent)
//   smoothstep(a, b, x), clamp(x, a, b), clamp01(x), lerp(a, b, t)
//
// Frame-rate independent: big dt values are cut into steps of at most 8 ms, so 30 fps and 144 fps land together.
// No per-frame allocations: springs write into their own fields.

export const STEP_MS = 8;
const MAX_DT = 250;

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x) => (Number.isFinite(x) ? (x < 0 ? 0 : x > 1 ? 1 : x) : 0);
export const lerp = (a, b, t) => a + (b - a) * t;
export const fin = (x, d = 0) => (Number.isFinite(x) ? x : d);
export function smoothstep(a, b, x) {
  if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return 0;
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function damp(current, target, lambdaPerSec, dtMs) {
  const c = fin(current), t = fin(target, c);
  const dt = clamp(fin(dtMs), 0, MAX_DT) / 1000;
  const l = Math.max(0, fin(lambdaPerSec, 10));
  return t + (c - t) * Math.exp(-l * dt);
}

// One exact critically damped step (dt in seconds, small). Writes out.value and out.vel.
function stepOnce(cur, target, vel, smoothSec, dt, out) {
  const omega = 2 / smoothSec;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel + omega * change) * dt;
  let v = (vel - omega * temp) * e;
  let val = target + (change + temp) * e;
  if ((target - cur > 0) === (val > target)) { val = target; v = 0; } // never overshoot
  out.value = val; out.vel = v;
}

export function smoothDamp(current, target, vel, smoothMs, dtMs, out) {
  const o = out || { value: 0, vel: 0 };
  let cur = fin(current), v = fin(vel);
  const tgt = fin(target, cur);
  const smooth = Math.max(1, fin(smoothMs, 150)) / 1000;
  let left = clamp(fin(dtMs), 0, MAX_DT);
  while (left > 0) {
    const dt = Math.min(STEP_MS, left) / 1000;
    stepOnce(cur, tgt, v, smooth, dt, o);
    cur = o.value; v = o.vel; left -= STEP_MS;
  }
  o.value = cur; o.vel = v;
  return o;
}

export function createSpring(value = 0, smoothMs = 150, opts) {
  const maxSpeed = opts && Number.isFinite(opts.maxSpeed) && opts.maxSpeed > 0 ? opts.maxSpeed : Infinity;
  const tmp = { value: 0, vel: 0 };
  const s = {
    value: fin(value), vel: 0, target: fin(value), smoothMs: Math.max(1, fin(smoothMs, 150)),
    update(target, dtMs) {
      s.target = fin(target, s.target);
      smoothDamp(s.value, s.target, s.vel, s.smoothMs, dtMs, tmp);
      s.value = tmp.value; s.vel = clamp(tmp.vel, -maxSpeed, maxSpeed);
      return s.value;
    },
    snap(v) { s.value = s.target = fin(v, s.value); s.vel = 0; return s.value; },
    settled(eps = 0.001) { return Math.abs(s.value - s.target) < eps && Math.abs(s.vel) < eps; },
  };
  return s;
}

export function createSpring2(x = 0, y = 0, smoothMs = 150) {
  const sx = createSpring(x, smoothMs), sy = createSpring(y, smoothMs);
  const s = {
    x: sx.value, y: sy.value,
    update(tx, ty, dtMs) { s.x = sx.update(tx, dtMs); s.y = sy.update(ty, dtMs); return s; },
    snap(nx, ny) { s.x = sx.snap(nx); s.y = sy.snap(ny); return s; },
    settled(eps) { return sx.settled(eps) && sy.settled(eps); },
  };
  return s;
}

export function createColorSpring(r = 0, g = 0, b = 0, smoothMs = 200) {
  const sr = createSpring(r, smoothMs), sg = createSpring(g, smoothMs), sb = createSpring(b, smoothMs);
  const c = (v) => Math.round(clamp(v, 0, 255));
  const s = {
    r: sr.value, g: sg.value, b: sb.value,
    update(tr, tg, tb, dtMs) {
      s.r = clamp(sr.update(tr, dtMs), 0, 255); s.g = clamp(sg.update(tg, dtMs), 0, 255); s.b = clamp(sb.update(tb, dtMs), 0, 255);
      return s;
    },
    snap(nr, ng, nb) { s.r = sr.snap(nr); s.g = sg.snap(ng); s.b = sb.snap(nb); return s; },
    toCss() { return 'rgb(' + c(s.r) + ',' + c(s.g) + ',' + c(s.b) + ')'; },
  };
  return s;
}
