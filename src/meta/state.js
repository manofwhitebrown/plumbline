// The `meta` save slice: defaults, migration, and safe access.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { num, money, count, clamp, cleanCounts } from './safe.js';

export const META_VERSION = 1;

export const STAT_KEYS = ['drops', 'hauls', 'snaps', 'gems', 'ore', 'relics', 'chains', 'blocked',
  'maxCombo', 'maxDepthRun', 'goldEarned', 'collapses', 'dailyClaims', 'partsBought', 'crewBought',
  'questsDone', 'playMs'];

export function defaults() {
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = 0;
  return {
    gold: 0, shards: 0, coreDust: 0, coreDustTotal: 0,
    goldThisCollapse: 0, bestDepth: 0,
    parts: { hook: 1 }, crew: {}, managers: {}, upgrades: {},
    lastSeen: 0, offlinePending: null,
    daily: { streak: 0, lastClaimDay: -1, twistOn: false },
    quests: { day: -1, list: [] },
    achievements: {},
    stats,
    autoHaulPct: 0,
    cheated: false, cheatMods: null, cheatStartDepth: 0,
  };
}

// Upgrade an older save to the newest shape. Never loses data it understands.
export function migrate(old, fromVersion) {
  const base = defaults();
  if (!old || typeof old !== 'object') return base;
  const src = { ...old };
  if (fromVersion < 1) {
    // Version 0 used `best` for best depth and an array of part ids.
    if (src.bestDepth == null && src.best != null) src.bestDepth = src.best;
    if (Array.isArray(src.parts)) {
      const map = {};
      for (const id of src.parts) if (typeof id === 'string') map[id] = (map[id] || 0) + 1;
      src.parts = map;
    }
    if (src.coreDustTotal == null && src.coreDust != null) src.coreDustTotal = src.coreDust;
    if (src.goldThisCollapse == null && src.lifetimeGold != null) src.goldThisCollapse = src.lifetimeGold;
    if (src.stats == null) src.stats = {};
    if (src.stats.goldEarned == null && src.lifetimeGold != null) src.stats.goldEarned = src.lifetimeGold;
  }
  const out = { ...base, ...src };
  out.stats = { ...base.stats, ...(src.stats || {}) };
  out.daily = { ...base.daily, ...(src.daily || {}) };
  out.quests = { ...base.quests, ...(src.quests || {}) };
  return out;
}

// Fix any bad value in place. Safe to run many times.
export function repair(s) {
  const d = defaults();
  for (const k of ['gold', 'shards', 'coreDust', 'coreDustTotal', 'goldThisCollapse']) s[k] = money(s[k]);
  s.coreDustTotal = Math.max(s.coreDustTotal, s.coreDust);
  s.bestDepth = clamp(s.bestDepth, 0, 1e9);
  s.parts = cleanCounts(s.parts);
  if (!s.parts.hook) s.parts.hook = 1;
  s.crew = cleanCounts(s.crew);
  s.managers = cleanCounts(s.managers);
  s.upgrades = cleanCounts(s.upgrades);
  s.lastSeen = num(s.lastSeen, 0);
  const p = s.offlinePending;
  s.offlinePending = p && typeof p === 'object' && num(p.gold) > 0
    ? { ms: count(p.ms, 1e12), gold: money(p.gold) } : null;
  if (!s.daily || typeof s.daily !== 'object') s.daily = { ...d.daily };
  s.daily.streak = count(s.daily.streak, 7);
  s.daily.lastClaimDay = num(s.daily.lastClaimDay, -1);
  s.daily.twistOn = !!s.daily.twistOn;
  if (!s.quests || typeof s.quests !== 'object') s.quests = { ...d.quests };
  s.quests.day = num(s.quests.day, -1);
  if (!Array.isArray(s.quests.list)) s.quests.list = [];
  if (!s.achievements || typeof s.achievements !== 'object') s.achievements = {};
  if (!s.stats || typeof s.stats !== 'object') s.stats = {};
  for (const k of STAT_KEYS) s.stats[k] = money(s.stats[k]);
  s.autoHaulPct = clamp(s.autoHaulPct, 0, 95);
  s.cheated = !!s.cheated;
  if (!s.cheated) { s.cheatMods = null; s.cheatStartDepth = 0; }
  s.cheatStartDepth = clamp(s.cheatStartDepth, 0, 5000);
  return s;
}

registerSlice('meta', { version: META_VERSION, defaults: defaults(), migrate });

const checked = new WeakSet();

// The live slice. Repaired the first time we see each object.
export function s() {
  let slice = getSlice('meta');
  if (!slice || typeof slice !== 'object') {
    log.warn('meta slice missing, using empty state');
    slice = defaults();
  }
  if (!checked.has(slice)) { repair(slice); checked.add(slice); }
  return slice;
}

export function dirty() { try { markDirty('meta'); } catch (e) { log.warn('markDirty failed', e && e.message); } }

export function changed(what) {
  dirty();
  try { bus.emit('meta:changed', { what }); } catch (e) { log.warn('emit failed', e && e.message); }
}
