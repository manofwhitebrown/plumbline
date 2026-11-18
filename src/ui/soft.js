// Soft links to other AIs' modules. If a module is not there yet, we use a safe fallback.
async function soft(path, pick, fallback) {
  try {
    const mod = await import(/* @vite-ignore */ path);
    const val = pick(mod);
    return val === undefined ? fallback : val;
  } catch (e) {
    return fallback;
  }
}

const quietLog = { warn() {}, error() {}, recent: () => [] };
const quietBus = { on: () => () => {}, emit() {} };
const nothing = () => {};

function plainFmt(n) {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  const units = ['K', 'M', 'B', 'T'];
  let v = abs, i = -1;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return (n < 0 ? '-' : '') + (v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.floor(v)) + units[i];
}

export const log = await soft('../core/log.js', (m) => m.log, quietLog);
export const bus = await soft('../core/bus.js', (m) => m.bus, quietBus);
export const fmt = await soft('../core/format.js', (m) => m.fmt, plainFmt);
export const fmtDepth = await soft('../core/format.js', (m) => m.fmtDepth, (m) => plainFmt(m) + ' m');
export const buzzRaw = await soft('../platform/haptics.js', (m) => m.buzz, nothing);
export const audioRaw = await soft('../audio/index.js', (m) => m.audio, null);

// Safe wrappers: they never throw, even if the real module is half built.
export function buzz(kind) {
  try { buzzRaw(kind); } catch (e) { /* ignore */ }
}
export function ui(kind) {
  try { if (audioRaw && typeof audioRaw.ui === 'function') audioRaw.ui(kind); } catch (e) { /* ignore */ }
}
export function audioCall(name, ...args) {
  try { if (audioRaw && typeof audioRaw[name] === 'function') return audioRaw[name](...args); } catch (e) { /* ignore */ }
  return undefined;
}
