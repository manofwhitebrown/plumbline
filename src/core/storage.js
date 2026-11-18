// Picks a place to keep the save. Uses localStorage when it works, memory when it does not
// (private mode, blocked storage, full disk). Never throws.
import { log } from './log.js';

export function makeMemoryStorage() {
  const map = new Map();
  return {
    kind: 'memory',
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); }
  };
}

// Try real localStorage with a small write test.
export function pickStorage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return makeMemoryStorage();
    const probe = '__plumbline_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { kind: 'local', getItem: (k) => ls.getItem(k), setItem: (k, v) => ls.setItem(k, v), removeItem: (k) => ls.removeItem(k) };
  } catch (err) {
    log.warn('localStorage is not available, using memory', err);
    return makeMemoryStorage();
  }
}
