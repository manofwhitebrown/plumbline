// The workshop: buy parts with Gold. No selling, so no refund tricks.
import { s, changed } from './state.js';
import { money, count, num } from './safe.js';
import * as partsApi from './partsApi.js';
import { hasAny } from './codex.js';
import { hasExtraCopy } from './upgrades.js';
import { bump } from './stats.js';
import { fmt } from '../core/format.js';

const SECOND_COPY_FACTOR = 2.5;

export function ownedParts() {
  const out = {};
  const parts = s().parts;
  for (const id of Object.keys(parts)) if (parts[id] > 0) out[id] = parts[id];
  return out;
}

export const copiesAllowed = () => (hasExtraCopy() ? 2 : 1);

function unlockInfo(def) {
  const st = s();
  const u = def.unlock || { type: 'start', value: 0 };
  const v = num(u.value);
  switch (u.type) {
    case 'gold':
      return st.stats.goldEarned >= v ? { ok: true } : { ok: false, reason: `Earn ${fmt(v)} Gold in total` };
    case 'depth':
      return st.bestDepth >= v ? { ok: true } : { ok: false, reason: `Reach ${fmt(v)} m Depth` };
    case 'codex':
      return hasAny(u.value) ? { ok: true } : { ok: false, reason: 'Find it in the Codex first' };
    default:
      return { ok: true };
  }
}

// state: 'locked' | 'buyable' | 'poor' | 'owned'
export function partStatus(id) {
  const def = partsApi.getPart(id);
  if (!def) return null;
  const st = s();
  const have = count(st.parts[id]);
  const max = copiesAllowed();
  const base = money(Math.max(0, num(def.cost)));
  const cost = have === 0 ? base : money(Math.ceil(base * SECOND_COPY_FACTOR));
  const unlock = have > 0 ? { ok: true } : unlockInfo(def);
  let state;
  if (have >= max) state = 'owned';
  else if (!unlock.ok) state = 'locked';
  else state = st.gold >= cost ? 'buyable' : 'poor';
  return { id, state, count: have, max, cost, reason: unlock.ok ? null : unlock.reason };
}

export function canBuyPart(id) {
  const p = partStatus(id);
  return !!p && p.state === 'buyable';
}

export function buyPart(id) {
  if (typeof id !== 'string') return { ok: false, error: 'Unknown Part' };
  const p = partStatus(id);
  if (!p) return { ok: false, error: 'Unknown Part' };
  if (p.state === 'owned') return { ok: false, error: p.max > 1 ? 'You own all the copies you can' : 'You already own this Part' };
  if (p.state === 'locked') return { ok: false, error: p.reason || 'Not unlocked yet' };
  if (p.state === 'poor') return { ok: false, error: 'Not enough Gold' };
  const st = s();
  st.gold = money(st.gold - p.cost);
  st.parts[id] = p.count + 1;
  bump('partsBought', 1);
  changed('parts');
  return { ok: true, count: p.count + 1, paid: p.cost };
}

// All parts for the workshop screen, cheapest unlock first.
export function list() {
  return partsApi.allParts().map((d) => ({
    id: d.id, name: d.name || d.id, family: d.family || 'special', desc: d.desc || '', tags: d.tags || [],
    ...partStatus(d.id),
  }));
}

// Cheat helper: set a count. Clamped. Unknown ids are ignored.
export function setCount(id, n) {
  if (!partsApi.getPart(id)) return false;
  const v = count(n, 99);
  if (v === 0) delete s().parts[id]; else s().parts[id] = v;
  return true;
}
