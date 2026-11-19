// motion/easing.js: shared easing set and a tiny timeline maths helper. Pure logic, no DOM.
import { clamp01, lerp } from '../../feel/spring.js';

// Cubic bezier solver (same curve as CSS cubic-bezier), Newton plus bisection fallback.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    x = clamp01(x);
    if (x === 0 || x === 1) return x;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i++) {
      const e = sx(t);
      if (Math.abs(e - x) < 1e-5) break;
      if (e < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

export const ease = {
  linear: (t) => clamp01(t),
  out: bezier(0.2, 0.8, 0.2, 1),       // art direction default: things that arrive
  inOut: bezier(0.65, 0, 0.35, 1),
  in: bezier(0.5, 0, 0.9, 0.4),
  // gentle settle for sheets: a tiny, bounded overshoot (max about 3 percent)
  settle: (t) => { t = clamp01(t); const c = 0.7; const u = t - 1; return t === 0 ? 0 : t === 1 ? 1 : 1 + (c + 1) * u * u * u + c * u * u; },
};

// Duration table (ms) from the art direction. Nothing in the UI goes over 400.
export const DUR = { small: 160, screen: 220, sheet: 260, ui: 400 };

// Progress 0..1 of a segment [start, start + len] at time t, eased.
export function seg(t, start, len, fn) {
  const p = len <= 0 ? (t >= start ? 1 : 0) : clamp01((t - start) / len);
  return (fn || ease.out)(p);
}

export { lerp, clamp01 };
