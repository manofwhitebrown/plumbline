// Permanent upgrades (Gold, Shards or Core Dust). Levels live in state.upgrades.
import { UPGRADES, LIMITS } from '../data/upgrades.js';
import { s, changed } from './state.js';
import { money, count, clamp } from './safe.js';
import { fmt } from '../core/format.js';

const BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));
export const def = (id) => BY_ID.get(id) || null;

export function level(id) {
  const u = def(id);
  return u ? Math.min(u.max, count(s().upgrades[id])) : 0;
}

// Cost of the next level (null if maxed).
export function nextCost(id) {
  const u = def(id);
  if (!u) return null;
  const lv = level(id);
  if (lv >= u.max) return null;
  return Math.ceil(u.base * Math.pow(u.growth, lv));
}

function wallet(u) {
  const st = s();
  return u.currency === 'gold' ? st.gold : u.currency === 'shards' ? st.shards : st.coreDust;
}

function take(u, amount) {
  const st = s();
  const key = u.currency === 'gold' ? 'gold' : u.currency === 'shards' ? 'shards' : 'coreDust';
  if (st[key] < amount) return false;
  st[key] = money(st[key] - amount);
  return true;
}

// Plain-English line for a level of an upgrade.
export function effectText(id, lv) {
  const u = def(id);
  if (!u) return '';
  const total = u.per * lv;
  if (id === 'bucket') return lv === 0 ? 'Bucket 4 x 3' : lv === 1 ? 'Bucket 5 x 3' : 'Bucket 5 x 4';
  if (id === 'autohaul' || id === 'extra_copy' || id === 'cd_start') return lv > 0 ? 'On' : 'Off';
  if (id === 'cd_crew') return `${total} Crew kept each`;
  return `+${fmt(total)} ${u.unit}`.replace('+0 ', '0 ');
}

export function info(id) {
  const u = def(id);
  if (!u) return null;
  const lv = level(id);
  const maxed = lv >= u.max;
  const cost = nextCost(id);
  const st = s();
  let reason = null;
  if (!maxed && st.bestDepth < u.gate) reason = `Reach ${u.gate} m Depth first`;
  const canAfford = cost != null && wallet(u) >= cost;
  return {
    id, name: u.name, desc: u.desc, currency: u.currency, level: lv, max: u.max, maxed,
    cost, canAfford, locked: !!reason, reason,
    canBuy: !maxed && !reason && canAfford,
    now: effectText(id, lv), next: maxed ? null : effectText(id, lv + 1),
    progress: u.max > 0 ? lv / u.max : 1,
  };
}

export function list() { return UPGRADES.map((u) => info(u.id)); }

export function buy(id) {
  const i = info(id);
  if (!i) return { ok: false, error: 'Unknown upgrade' };
  if (i.maxed) return { ok: false, error: 'Already at the top level' };
  if (i.locked) return { ok: false, error: i.reason };
  if (!i.canAfford) return { ok: false, error: `Not enough ${i.currency === 'core' ? 'Core Dust' : i.currency === 'gold' ? 'Gold' : 'Shards'}` };
  const u = def(id);
  if (!take(u, i.cost)) return { ok: false, error: 'Not enough to pay' };
  s().upgrades[id] = i.level + 1;
  changed('upgrades');
  return { ok: true, level: i.level + 1 };
}

// Set a level directly. Used only by cheats and Collapse. Always clamped.
export function setLevel(id, lv) {
  const u = def(id);
  if (!u) return false;
  const v = Math.floor(clamp(lv, 0, u.max));
  if (v === 0) delete s().upgrades[id]; else s().upgrades[id] = v;
  return true;
}

export function loadoutSlots() { return LIMITS.baseLoadoutSlots + level('loadouts'); }
export function hasExtraCopy() { return level('extra_copy') > 0; }

export function autoHaul() {
  return level('autohaul') > 0 ? s().autoHaulPct : 0;
}
// pct 0 = off, otherwise 30..95. Needs the upgrade.
export function setAutoHaul(pct) {
  if (level('autohaul') <= 0) return { ok: false, error: 'Buy Auto-Haul Assist first' };
  const v = Math.round(clamp(pct, 0, 95));
  s().autoHaulPct = v === 0 ? 0 : Math.max(30, v);
  changed('autohaul');
  return { ok: true, pct: s().autoHaulPct };
}
