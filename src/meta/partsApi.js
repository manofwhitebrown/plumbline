// Bridge to AI-3's parts. Works even if a helper is missing, and tests can swap in a fake set.
import * as partsModule from '../engine/parts/index.js';
import { log } from '../core/log.js';

let override = null;

// Tests only: setPartsProvider({ getPart, allParts, detectCombos, allCombos }). null = real one.
export function setPartsProvider(p) { override = p || null; }

function provider() { return override || partsModule; }

export function allParts() {
  try {
    const fn = provider().allParts;
    const list = typeof fn === 'function' ? fn() : [];
    return Array.isArray(list) ? list.filter((p) => p && typeof p.id === 'string') : [];
  } catch (e) { log.warn('allParts failed', e && e.message); return []; }
}

export function getPart(id) {
  try {
    const fn = provider().getPart;
    const p = typeof fn === 'function' ? fn(id) : null;
    return p && typeof p === 'object' ? p : null;
  } catch (e) { log.warn('getPart failed', e && e.message); return null; }
}

// Combos found in a rig. Returns an array of { id, name?, desc? }. Empty if unsupported.
export function detectCombos(rig) {
  try {
    const fn = provider().detectCombos;
    const list = typeof fn === 'function' ? fn(rig) : [];
    return Array.isArray(list) ? list.filter((c) => c && c.id != null) : [];
  } catch (e) { log.warn('detectCombos failed', e && e.message); return []; }
}

// Every combo that exists (for the codex list). Empty if AI-3 gives no list.
export function allCombos() {
  try {
    const fn = provider().allCombos;
    const list = typeof fn === 'function' ? fn() : [];
    return Array.isArray(list) ? list.filter((c) => c && c.id != null) : [];
  } catch (e) { log.warn('allCombos failed', e && e.message); return []; }
}
