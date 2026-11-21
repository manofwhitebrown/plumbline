// RELIC BOOK [HOOK-3]: which of the 36 relics the player has found, for the Relic Wall.
// Slice `relicBook`: { found: {id: time}, cheat: {id: time}, seen: {id: true} }.
//   found = really found in a Drop. cheat = shown by a cheat (never counts for bonuses or Looks).
//   seen  = the player has looked at it (no gold dot any more).
// Cheated saves find nothing. Everything fails soft.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { RELICS, RARITY, relicById } from '../data/relics.js';
import { WALL_BONUSES, WALL_TOTAL, WALL_HINTS } from '../data/cosmetics.js';
import { biomes } from '../data/biomes.js';
import { s } from './state.js';
import { now } from './time.js';

export const RELIC_BOOK_VERSION = 1;

export function defaults() { return { found: {}, cheat: {}, seen: {} }; }

// Keep only known relic ids with a finite time. Never loses a real find.
function cleanMap(m, asBool) {
  const out = {};
  if (!m || typeof m !== 'object') return out;
  for (const id of Object.keys(m)) {
    if (!relicById(id)) continue;
    const v = m[id];
    if (asBool) { if (v) out[id] = true; } else if (v) out[id] = Number.isFinite(Number(v)) ? Number(v) : 1;
  }
  return out;
}

export function migrate(old, fromVersion) {
  const base = defaults();
  if (!old || typeof old !== 'object') return base;
  // v0 (never shipped, but be kind): a plain array of ids.
  if (Array.isArray(old)) { for (const id of old) if (relicById(id)) base.found[id] = 1; return base; }
  base.found = cleanMap(old.found, false);
  base.cheat = cleanMap(old.cheat, false);
  base.seen = cleanMap(old.seen, true);
  return base;
}

registerSlice('relicBook', { version: RELIC_BOOK_VERSION, defaults: defaults(), migrate });

function slice() {
  let sl = null;
  try { sl = getSlice('relicBook'); } catch (e) { sl = null; }
  if (!sl || typeof sl !== 'object') sl = defaults();
  for (const k of ['found', 'cheat', 'seen']) if (!sl[k] || typeof sl[k] !== 'object' || Array.isArray(sl[k])) sl[k] = {};
  return sl;
}
function dirty() { try { markDirty('relicBook'); } catch (e) { log.warn('relicBook dirty failed', e && e.message); } }
const cheated = () => { try { return !!s().cheated; } catch (e) { return false; } };

// Record one find. Returns true only the first time. Cheaters find nothing (unless opts.force from a cheat).
export function record(id, opts) {
  if (!relicById(id)) return false;
  const sl = slice();
  if (opts && opts.cheat) {
    if (sl.found[id] || sl.cheat[id]) return false;
    sl.cheat[id] = now(); dirty();
    try { bus.emit('relics:changed', { id, cheat: true }); } catch (e) { log.warn('relicBook emit failed', e && e.message); }
    return true;
  }
  if (cheated() || sl.found[id]) return false;
  sl.found[id] = now() || 1;
  delete sl.cheat[id];
  dirty();
  try { bus.emit('relics:new', { id }); bus.emit('relics:changed', { id }); } catch (e) { log.warn('relicBook emit failed', e && e.message); }
  return true;
}

export function recordMany(ids) {
  let n = 0;
  if (Array.isArray(ids)) for (const id of ids) if (record(id)) n++;
  return n;
}

// Cheat helper: show every relic on the wall. These do not count for bonuses or Looks.
export function recordAllCheat() {
  let n = 0;
  for (const r of RELICS) if (record(r.id, { cheat: true })) n++;
  return n;
}

export const has = (id) => { const sl = slice(); return !!(sl.found[id] || sl.cheat[id]); };
export const hasEarned = (id) => !!slice().found[id];
export const count = () => { const sl = slice(); return RELICS.filter((r) => sl.found[r.id] || sl.cheat[r.id]).length; };
export const earnedCount = () => { const sl = slice(); return RELICS.filter((r) => sl.found[r.id]).length; };

export function unseenCount() {
  const sl = slice();
  return RELICS.filter((r) => (sl.found[r.id] || sl.cheat[r.id]) && !sl.seen[r.id]).length;
}
export function markSeen(id) {
  const sl = slice();
  if (!relicById(id) || sl.seen[id]) return false;
  sl.seen[id] = true; dirty();
  try { bus.emit('relics:changed', { id }); } catch (e) { /* ignore */ }
  return true;
}
export function markAllSeen() {
  const sl = slice(); let n = 0;
  for (const r of RELICS) if ((sl.found[r.id] || sl.cheat[r.id]) && !sl.seen[r.id]) { sl.seen[r.id] = true; n++; }
  if (n) { dirty(); try { bus.emit('relics:changed', {}); } catch (e) { /* ignore */ } }
  return n;
}

function biomeName(id) {
  try { const b = biomes.byId(id); if (b && b.name) return String(b.name); } catch (e) { /* fall through */ }
  return typeof id === 'string' && id ? id.charAt(0).toUpperCase() + id.slice(1) : '';
}

// All 36 as plain cards. Hidden ones carry no name: '???' and a short hint.
export function list() {
  const sl = slice();
  return RELICS.map((r) => {
    const found = !!(sl.found[r.id] || sl.cheat[r.id]);
    const rar = RARITY[r.rarity] || RARITY.common;
    return {
      id: r.id, found, isNew: found && !sl.seen[r.id], biome: r.biome, where: biomeName(r.biome), shape: r.shape,
      rarity: r.rarity, color: rar.color,
      name: found ? r.name : '???',
      line: found ? r.hint : (WALL_HINTS[r.biome] || 'Not found yet'),
    };
  });
}

// The Wall summary: how many found, which bonuses are reached, what comes next.
export function wall() {
  const earned = earnedCount(), shown = count();
  const bonuses = WALL_BONUSES.map((b) => ({ at: b.at, text: b.text, kind: b.kind, pct: b.pct, reached: earned >= b.at }));
  const next = bonuses.find((b) => !b.reached) || null;
  return { found: shown, earned, total: WALL_TOTAL, bonuses, next };
}

// What the Wall adds to a Drop: { gold, luck } as small fractions. Only real finds count.
export function wallMods() {
  const out = { gold: 0, luck: 0 };
  if (cheated()) return out;
  const earned = earnedCount();
  for (const b of WALL_BONUSES) if (earned >= b.at && b.kind in out) out[b.kind] += b.pct;
  out.gold = Math.round(out.gold * 10000) / 10000; out.luck = Math.round(out.luck * 10000) / 10000;
  return out;
}

let started = false;
// Listens for the end of a Drop and files the relics it found. Safe to call many times.
export function start() {
  if (started) return;
  started = true;
  bus.on('run:ended', (r) => {
    try {
      if (!r || typeof r !== 'object' || r.cheated) return;
      const ids = r.play && Array.isArray(r.play.relics) ? r.play.relics : [];
      recordMany(ids);
    } catch (e) { log.error('relicBook hook failed', e && e.message); }
  });
}
start();
