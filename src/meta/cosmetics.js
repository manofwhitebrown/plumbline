// COSMETICS [HOOK-3]: which Looks (bucket, rope, well colours) the player owns and wears. Slice `cosmetics`.
//   owned    = { id: time } earned or bought for real. The free defaults are always owned.
//   equipped = { bucket, rope, well } the id worn in each place.
//   seen     = { id: true } the player has looked at it (no gold dot).
//   cheatAll = true when a cheat opened every Look. Only works while the save is marked cheated.
// Looks are visual only. Cheated saves cannot earn or buy them.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { COSMETICS, LOOK_KINDS, DEFAULT_LOOKS, cosmeticById } from '../data/cosmetics.js';
import { s } from './state.js';
import { now } from './time.js';
import { spendShards } from './wallet.js';
import { earnedCount } from './relicBook.js';

export const COSMETICS_VERSION = 1;

export function defaults() { return { owned: {}, equipped: { ...DEFAULT_LOOKS }, seen: {}, cheatAll: false }; }

export function migrate(old) {
  const base = defaults();
  if (!old || typeof old !== 'object') return base;
  if (old.owned && typeof old.owned === 'object') for (const id of Object.keys(old.owned)) if (cosmeticById(id) && old.owned[id]) base.owned[id] = Number(old.owned[id]) || 1;
  if (old.seen && typeof old.seen === 'object') for (const id of Object.keys(old.seen)) if (cosmeticById(id) && old.seen[id]) base.seen[id] = true;
  if (old.equipped && typeof old.equipped === 'object') {
    for (const k of LOOK_KINDS) { const c = cosmeticById(old.equipped[k]); if (c && c.kind === k) base.equipped[k] = c.id; }
  }
  base.cheatAll = !!old.cheatAll;
  return base;
}

registerSlice('cosmetics', { version: COSMETICS_VERSION, defaults: defaults(), migrate });

function slice() {
  let sl = null;
  try { sl = getSlice('cosmetics'); } catch (e) { sl = null; }
  if (!sl || typeof sl !== 'object') sl = defaults();
  for (const k of ['owned', 'seen', 'equipped']) if (!sl[k] || typeof sl[k] !== 'object' || Array.isArray(sl[k])) sl[k] = k === 'equipped' ? { ...DEFAULT_LOOKS } : {};
  return sl;
}
function dirty() { try { markDirty('cosmetics'); } catch (e) { log.warn('cosmetics dirty failed', e && e.message); } }
const cheated = () => { try { return !!s().cheated; } catch (e) { return false; } };
function emit(name, p) { try { bus.emit(name, p); } catch (e) { log.warn('cosmetics emit failed', e && e.message); } }

export function isOwned(id) {
  const c = cosmeticById(id);
  if (!c) return false;
  if (c.unlock.t === 'free') return true;
  const sl = slice();
  return !!sl.owned[id] || (sl.cheatAll && cheated());
}

// Give every Look the player has really earned. Cheated saves earn nothing. Returns the new ids.
export function evaluate() {
  if (cheated()) return [];
  const sl = slice(), st = s(), fresh = [];
  const relics = earnedCount();
  for (const c of COSMETICS) {
    if (sl.owned[c.id] || c.unlock.t === 'free' || c.unlock.t === 'shards') continue;
    const ok = (c.unlock.t === 'relics' && relics >= c.unlock.n) || (c.unlock.t === 'ach' && !!(st.achievements && st.achievements[c.unlock.id]));
    if (ok) { sl.owned[c.id] = now() || 1; fresh.push(c.id); }
  }
  if (fresh.length) { dirty(); for (const id of fresh) emit('cosmetics:new', { id }); emit('cosmetics:changed', {}); }
  return fresh;
}

// Buy a Shard Look. Returns { ok, reason? }. Cheated saves cannot buy.
export function buy(id) {
  const c = cosmeticById(id);
  if (!c) return { ok: false, reason: 'unknown' };
  if (c.unlock.t !== 'shards') return { ok: false, reason: 'not for sale' };
  if (isOwned(id)) return { ok: false, reason: 'owned' };
  if (cheated()) return { ok: false, reason: 'cheated' };
  if (!spendShards(c.unlock.cost)) return { ok: false, reason: 'shards' };
  const sl = slice(); sl.owned[id] = now() || 1; dirty();
  emit('cosmetics:new', { id }); emit('cosmetics:changed', {});
  return { ok: true };
}

export function equip(id) {
  const c = cosmeticById(id);
  if (!c || !isOwned(id)) return false;
  const sl = slice();
  if (sl.equipped[c.kind] === id) return true;
  sl.equipped[c.kind] = id; sl.seen[id] = true; dirty();
  emit('cosmetics:changed', { kind: c.kind, id });
  return true;
}

// The Look worn for a kind. A Look that is no longer owned falls back to the free default.
export function equipped(kind) {
  const sl = slice();
  const c = cosmeticById(sl.equipped[kind]);
  if (c && c.kind === kind && isOwned(c.id)) return c;
  return cosmeticById(DEFAULT_LOOKS[kind]);
}
export function equippedIds() { const o = {}; for (const k of LOOK_KINDS) o[k] = equipped(k).id; return o; }

export function status(id) {
  const c = cosmeticById(id);
  if (!c) return null;
  const owned = isOwned(id), sl = slice();
  return { id, kind: c.kind, owned, worn: owned && equipped(c.kind).id === id, isNew: owned && c.unlock.t !== 'free' && !sl.seen[id],
    canBuy: !owned && c.unlock.t === 'shards' && !cheated(), cost: c.unlock.t === 'shards' ? c.unlock.cost : 0 };
}
export function list(kind) {
  return COSMETICS.filter((c) => !kind || c.kind === kind).map((c) => ({ ...c, ...status(c.id) }));
}
export function unseenCount() { return COSMETICS.filter((c) => { const t = status(c.id); return t && t.isNew; }).length; }
export function markSeen(id) {
  const sl = slice();
  if (!cosmeticById(id) || sl.seen[id]) return false;
  sl.seen[id] = true; dirty(); emit('cosmetics:changed', { id }); return true;
}
export function ownedCount() { return COSMETICS.filter((c) => isOwned(c.id)).length; }

// Cheat helper: open every Look. It only works while the save is marked cheated.
export function setCheatAll() {
  const sl = slice();
  if (sl.cheatAll) return false;
  sl.cheatAll = true; dirty(); emit('cosmetics:changed', {});
  return true;
}

let started = false;
export function start() {
  if (started) return;
  started = true;
  const guard = (fn) => (p) => { try { fn(p); } catch (e) { log.error('cosmetics hook failed', e && e.message); } };
  bus.on('relics:new', guard(evaluate));
  bus.on('achievement:unlocked', guard(evaluate));
  bus.on('run:ended', guard(() => { setTimeout(() => { try { evaluate(); } catch (e) { /* ignore */ } }, 0); }));
  try { evaluate(); } catch (e) { /* ignore */ }
}
start();
