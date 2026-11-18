// The parts registry: getPart, allParts, partsByFamily, validatePartDef, detectCombos.
import { PART_DATA, FAMILIES } from '../../data/parts.js';
import { collectors } from './collectors.js';
import { processors } from './processors.js';
import { defense } from './defense.js';
import { engineParts } from './engine.js';
import { special } from './special.js';
import { detectCombos, comboInfo, allCombos, COMBO_IDS } from './combos.js';

const LIST = [].concat(collectors, processors, defense, engineParts, special);
const BY_ID = Object.create(null);
for (const def of LIST) BY_ID[def.id] = def;

const UNLOCK_TYPES = ['start', 'gold', 'depth', 'codex'];

// getPart(id) -> PartDef | null   (unknown or bad id gives null)
export function getPart(id) {
  return typeof id === 'string' && BY_ID[id] ? BY_ID[id] : null;
}

// allParts() -> PartDef[]  (a new array each call)
export function allParts() {
  return LIST.slice();
}

export function partsByFamily(family) {
  return LIST.filter((p) => p.family === family);
}

// validatePartDef(def) -> { ok, errors: string[] }
export function validatePartDef(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return { ok: false, errors: ['not an object'] };
  if (typeof def.id !== 'string' || !def.id) errors.push('bad id');
  if (typeof def.name !== 'string' || !def.name) errors.push('bad name');
  if (FAMILIES.indexOf(def.family) < 0) errors.push('bad family');
  if (!Array.isArray(def.tags)) errors.push('bad tags');
  if (typeof def.desc !== 'string' || !def.desc || def.desc.length > 90) errors.push('desc missing or over 90 characters');
  if (typeof def.cost !== 'number' || !Number.isFinite(def.cost) || def.cost < 0) errors.push('bad cost');
  const u = def.unlock;
  if (!u || UNLOCK_TYPES.indexOf(u.type) < 0) errors.push('bad unlock type');
  else if (u.type === 'codex' ? (typeof u.value !== 'string' || COMBO_IDS.indexOf(u.value) < 0)
    : (typeof u.value !== 'number' || !Number.isFinite(u.value) || u.value < 0)) errors.push('bad unlock value');
  for (const k of ['onBeat', 'onItem', 'onHazard', 'passive', 'onCollect', 'onBeatEnd']) {
    if (def[k] !== undefined && typeof def[k] !== 'function') errors.push(k + ' must be a function');
  }
  return { ok: errors.length === 0, errors };
}

export { detectCombos, comboInfo, allCombos, COMBO_IDS, PART_DATA };
