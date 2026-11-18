// The codex: parts, combos, biomes and relics the player has found. Slice `codex`.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { s } from './state.js';
import { now } from './time.js';
import * as partsApi from './partsApi.js';

const BIOMES = [
  ['clay', 'Clay', 'Warm brown earth near the top of the well.'],
  ['quartz', 'Quartz', 'Cold blue stone. Bats start to appear.'],
  ['amber', 'Amber', 'Honey-orange walls and tangled roots.'],
  ['magma', 'Magma', 'Deep red heat and hissing steam.'],
  ['void', 'Void', 'Violet darkness where light bends.'],
  ['abyss', 'Abyss', 'The endless dark below the Void.'],
];
const RELICS = ['Tarnished', 'Etched', 'Gilded', 'Jeweled', 'Voidtouched', 'Prismatic'];

registerSlice('codex', { version: 1, defaults: { found: {} }, migrate: (old) => ({ found: (old && old.found) || {} }) });

function found() {
  let slice = getSlice('codex');
  if (!slice || typeof slice !== 'object') slice = { found: {} };
  if (!slice.found || typeof slice.found !== 'object') slice.found = {};
  return slice.found;
}

export function has(id) {
  return typeof id === 'string' && !!found()[id];
}

// Record a discovery once. Returns true only the first time. Cheaters discover nothing.
export function record(entryId, opts) {
  if (typeof entryId !== 'string' || !entryId || entryId.length > 80) return false;
  const force = opts && opts.force;
  if (!force && s().cheated) return false;
  const f = found();
  if (f[entryId]) return false;
  f[entryId] = now();
  try { markDirty('codex'); } catch (e) { log.warn('codex dirty failed', e && e.message); }
  try { bus.emit('codex:new', { id: entryId }); } catch (e) { log.warn('codex emit failed', e && e.message); }
  return true;
}

// Cheat helper: discover everything.
export function recordAll() {
  let n = 0;
  for (const e of allEntries()) if (record(e.id, { force: true })) n++;
  return n;
}

function allEntries() {
  const out = [];
  for (const p of partsApi.allParts()) {
    out.push({ id: `part:${p.id}`, kind: 'part', name: p.name || p.id, desc: p.desc || '' });
  }
  const seen = new Set();
  for (const c of partsApi.allCombos()) {
    const id = `combo:${c.id}`;
    seen.add(id);
    out.push({ id, kind: 'combo', name: c.name || String(c.id), desc: c.desc || '' });
  }
  // Combos found but not in AI-3's list still show, so nothing found is ever hidden.
  for (const id of Object.keys(found())) {
    if (id.startsWith('combo:') && !seen.has(id)) out.push({ id, kind: 'combo', name: id.slice(6), desc: '' });
  }
  for (const [id, name, desc] of BIOMES) out.push({ id: `biome:${id}`, kind: 'biome', name, desc });
  RELICS.forEach((name, i) => out.push({ id: `relic:t${i + 1}`, kind: 'relic', name: `${name} Relic`, desc: `A relic of tier ${i + 1}.` }));
  return out;
}

// Parts are also "found" when owned.
export function list() {
  const f = found();
  const owned = s().parts;
  return allEntries().map((e) => {
    const isFound = !!f[e.id] || (e.kind === 'part' && (owned[e.id.slice(5)] || 0) > 0);
    return { ...e, found: isFound, discovered: isFound, name: isFound ? e.name : '???', desc: isFound ? e.desc : 'Not found yet.' };
  });
}

export function progress() {
  const l = list();
  const done = l.filter((e) => e.found).length;
  return { found: done, total: l.length, fraction: l.length ? done / l.length : 0 };
}

// Check a part's unlock value against the codex. Accepts a raw id or a full entry id.
export function hasAny(value) {
  if (typeof value !== 'string') return false;
  return has(value) || has(`combo:${value}`) || has(`part:${value}`) || has(`biome:${value}`);
}
