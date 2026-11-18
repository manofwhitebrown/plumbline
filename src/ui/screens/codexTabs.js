// Codex model: tabs, entries, hints and NEW dots. The model is plain data, so tests need no page.
// meta.codex.list() gives entries { id, kind, name, desc, found }. Hidden ones are named '???'.
// We add what meta does not know: real names for hints, unlock rules, combo ingredients.
import { getPart, allParts, allCombos } from '../../engine/parts/index.js';
import { biomes } from '../../data/biomes.js';
import { fmt, fmtDepth } from '../../core/format.js';
import { registerSlice, getSlice, markDirty } from '../../core/save.js';

export const TABS = [
  { id: 'part', label: 'Parts' },
  { id: 'combo', label: 'Combos' },
  { id: 'biome', label: 'Biomes' },
  { id: 'relic', label: 'Relics' },
];

// What each Combo is made of. A test checks this against the Part names in the Combo text,
// so it cannot drift from src/data/parts.js.
export const COMBO_PARTS = {
  gem_press: ['smelter', 'polisher', 'multiplier'],
  wide_net: ['splitter', 'net'],
  safe_dive: ['shield', 'oilcan', 'anchor'],
  drill_rush: ['drill', 'cooler', 'plate'],
  echo_chamber: ['echo', 'multiplier'],
  prism_pair: ['prism'],
  battery_burst: ['battery'],
  metronome_mill: ['metronome'],
  lantern_scout: ['lantern', 'compass'],
  relic_hunter: ['jackpot', 'compass'],
  fuse_chain: ['fuse'],
  gilded_press: ['gilder', 'multiplier'],
  loud_chain: ['amplifier'],
  rock_alchemist: ['spikeguard', 'smelter', 'polisher'],
  cool_sweep: ['vacuum', 'cooler'],
  iron_wall: ['plate', 'shield', 'spikeguard'],
  long_rope: ['sparerope', 'oilcan', 'cooler'],
};

// How many copies a Combo needs, and any extra Parts it asks for in general words.
export const COMBO_TIMES = { wide_net: { net: 2 }, prism_pair: { prism: 2 }, fuse_chain: { fuse: 2 } };
export const COMBO_MORE = {
  battery_burst: 'and 3 or more grabbing Parts',
  metronome_mill: 'and 2 or more changing Parts in its row',
  loud_chain: 'and 2 or more changing Parts below it',
};

export const RELIC_TIERS = 6;

// ---------- the "seen" slice: which entries already lost their NEW dot ----------
let seenSlice = null;
function seen() {
  try {
    if (!seenSlice) {
      registerSlice('codexSeen', { version: 1, defaults: { seen: {} }, migrate: (old) => ({ seen: (old && typeof old.seen === 'object' && old.seen) || {} }) });
      seenSlice = true;
    }
    let s = getSlice('codexSeen');
    if (!s || typeof s !== 'object') s = { seen: {} };
    if (!s.seen || typeof s.seen !== 'object') s.seen = {};
    return s.seen;
  } catch (e) { return {}; }
}

export function isSeen(id) {
  return typeof id === 'string' && !!seen()[id];
}

export function markSeen(id) {
  if (typeof id !== 'string' || !id || id.length > 80) return false;
  const s = seen();
  if (s[id]) return false;
  s[id] = 1;
  try { markDirty('codexSeen'); } catch (e) { /* keep going */ }
  return true;
}

// ---------- hints for hidden entries ----------
function partHint(id) {
  const p = getPart(id);
  const u = p && p.unlock;
  if (!u) return 'Keep playing to find it.';
  if (u.type === 'start') return 'You start with this one.';
  if (u.type === 'gold') return 'Shows up in the Workshop after you earn ' + fmt(u.value) + ' Gold.';
  if (u.type === 'depth') return 'Shows up in the Workshop after you reach ' + fmtDepth(u.value) + '.';
  if (u.type === 'codex') {
    const c = allCombos().find((x) => x.id === u.value);
    return 'Find the ' + (c ? c.name : 'right') + ' Combo first.';
  }
  return 'Keep playing to find it.';
}

function biomeHint(id) {
  let list = [];
  try { list = biomes.list(); } catch (e) { list = []; }
  const b = list.find((x) => x.id === id);
  return b ? 'Reach ' + fmtDepth(b.from) + ' Depth.' : 'Go deeper to find it.';
}

function relicHint() {
  let list = [];
  try { list = biomes.list(); } catch (e) { list = []; }
  const b = list.find((x) => x.relicChance > 0);
  return b ? 'Relics start to show in ' + b.name + ', from ' + fmtDepth(b.from) + '.' : 'Go deeper to find relics.';
}

function comboHint(id) {
  const n = (COMBO_PARTS[id] || []).length;
  return n ? 'Put ' + n + ' Part' + (n === 1 ? '' : 's') + ' together in the right spots.' : 'Try new Rigs to find it.';
}

export function hintFor(entry) {
  if (!entry || typeof entry.id !== 'string') return '';
  const key = entry.id.slice(entry.id.indexOf(':') + 1);
  switch (entry.kind) {
    case 'part': return partHint(key);
    case 'combo': return comboHint(key);
    case 'biome': return biomeHint(key);
    case 'relic': return relicHint();
    default: return 'Keep playing to find it.';
  }
}

export function relicTier(entry) {
  const m = /^relic:t(\d+)$/.exec(entry && entry.id || '');
  const t = m ? Number(m[1]) : 1;
  return Math.min(RELIC_TIERS, Math.max(1, t));
}

// Real data names (for sheets and icons), whether found or not.
function realInfo(entry) {
  const key = entry.id.slice(entry.id.indexOf(':') + 1);
  if (entry.kind === 'part') { const p = getPart(key); return p ? { name: p.name, family: p.family } : {}; }
  if (entry.kind === 'combo') { const c = allCombos().find((x) => x.id === key); return c ? { name: c.name } : {}; }
  if (entry.kind === 'biome') {
    let list = [];
    try { list = biomes.list(); } catch (e) { list = []; }
    const b = list.find((x) => x.id === key);
    return b ? { name: b.name, palette: b.palette, from: b.from } : {};
  }
  return {};
}

// Turn meta's list into what the screen needs.
// list: meta.codex.list() result. Anything bad gives empty tabs, never an error.
export function buildModel(list, isSeenFn) {
  const check = typeof isSeenFn === 'function' ? isSeenFn : isSeen;
  const safe = Array.isArray(list) ? list.filter((e) => e && typeof e.id === 'string') : [];
  const foundIds = new Set(safe.filter((e) => e.found || e.discovered).map((e) => e.id));
  const tabs = {};
  for (const t of TABS) tabs[t.id] = { id: t.id, label: t.label, entries: [], found: 0, total: 0, fresh: 0 };

  for (const e of safe) {
    const kind = e.kind;
    const tab = tabs[kind];
    if (!tab) continue;
    const found = !!(e.found || e.discovered);
    const info = realInfo(e);
    const entry = {
      id: e.id, kind, found,
      name: found ? String(e.name || info.name || '') : '???',
      realName: info.name || String(e.name || ''),
      desc: found ? String(e.desc || '') : '',
      hint: found ? '' : hintFor(e),
      isNew: found && !check(e.id),
      family: info.family || null,
      palette: info.palette || null,
      from: Number.isFinite(info.from) ? info.from : 0,
      tier: kind === 'relic' ? relicTier(e) : 0,
      parts: [],
      more: '',
    };
    if (kind === 'combo') {
      const key = e.id.slice(6);
      entry.parts = (COMBO_PARTS[key] || []).map((pid) => {
        const p = getPart(pid);
        const times = (COMBO_TIMES[key] && COMBO_TIMES[key][pid]) || 1;
        return { id: pid, name: p ? p.name : pid, found: foundIds.has('part:' + pid), times };
      });
      entry.more = COMBO_MORE[key] || '';
    }
    if (kind === 'part') {
      const p = getPart(e.id.slice(5));
      entry.partId = p ? p.id : null;
    }
    tab.entries.push(entry);
    tab.total++;
    if (found) tab.found++;
    if (entry.isNew) tab.fresh++;
  }
  const all = Object.values(tabs);
  return {
    tabs,
    order: TABS.map((t) => tabs[t.id]),
    found: all.reduce((n, t) => n + t.found, 0),
    total: all.reduce((n, t) => n + t.total, 0),
    fresh: all.reduce((n, t) => n + t.fresh, 0),
  };
}

export function partCount() {
  return allParts().length;
}
