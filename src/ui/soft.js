// Safe links to other AIs' modules. Core modules are imported directly.
// Optional modules (meta, run, render...) are handed in by boot.js, so a missing one never breaks the build.
import { log } from '../core/log.js';
import { bus } from '../core/bus.js';
import { fmt, fmtDepth, fmtTime, fmtPct } from '../core/format.js';
import { audio } from '../audio/index.js';

export { log, bus, fmt, fmtDepth, fmtTime, fmtPct };

const deps = {};

// boot.js calls this with whatever modules exist.
export function provide(obj) {
  if (obj && typeof obj === 'object') Object.assign(deps, obj);
}

export function dep(name) {
  return deps[name] || null;
}

// Haptics and audio wrappers never throw, even if the real module is half built.
export function buzz(kind) {
  try {
    const hap = deps.haptics;
    if (hap && typeof hap.buzz === 'function') hap.buzz(kind);
  } catch (e) { /* ignore */ }
}

export function ui(kind) {
  try { if (audio && typeof audio.ui === 'function') audio.ui(kind); } catch (e) { /* ignore */ }
}

export function audioCall(name, ...args) {
  try { if (audio && typeof audio[name] === 'function') return audio[name](...args); } catch (e) { /* ignore */ }
  return undefined;
}
