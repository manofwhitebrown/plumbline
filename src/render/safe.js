// One place for warnings. Switch to core/log.js when it lands on main.
let count = 0;
export function warn(...args) {
  count++;
  if (count > 50) return; // never flood the console
  try { console.warn('[render]', ...args); } catch (e) { /* ignore */ }
}
export function num(v, fallback = 0) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function easeOut(t) { t = clamp01(t); return 1 - (1 - t) * (1 - t) * (1 - t); }
