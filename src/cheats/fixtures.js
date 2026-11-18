// Test states for the debug page (?debug=1&fixture=empty|busy|extreme).
// They are loaded into MEMORY ONLY. loadFixture refuses to run if the save is on the real device storage.
import { getSlice, markDirty, storageKind } from '../core/save.js';
import { log } from '../core/log.js';
import { s as metaSlice } from '../meta/state.js';
import { allParts } from '../engine/parts/index.js';
import { ACHIEVEMENTS } from '../data/rewards.js';
import { CREW } from '../data/crew.js';
import { rigs } from '../run/rigs.js';
import { meta } from '../meta/index.js';

export const FIXTURES = ['empty', 'busy', 'extreme'];

const DAY = 24 * 3600 * 1000;

function ids() { return allParts().map((p) => p.id); }
function crewIds() { return (Array.isArray(CREW) ? CREW : []).map((c) => c.id); }

// Fill the codex and the achievements list.
function fillLists(st, share) {
  const codex = getSlice('codex');
  if (codex) {
    const all = meta.codex.list();
    const upto = Math.ceil(all.length * share);
    codex.found = {};
    all.slice(0, upto).forEach((e) => { codex.found[e.id] = Date.now() - DAY; });
  }
  st.achievements = {};
  ACHIEVEMENTS.slice(0, Math.ceil(ACHIEVEMENTS.length * share)).forEach((a) => { st.achievements[a.id] = Date.now() - DAY; });
}

function setRun(best, drops) {
  const r = getSlice('run');
  if (!r) return;
  r.bestDepth = best; r.totalDrops = drops; r.longestHaul = best; r.totalKept = best * 100;
  r.checkpoint = null; r.lastPaidSeed = null;
  markDirty('run');
}

function placeRig(partIds) {
  rigs.clear();
  let i = 0;
  const rig = rigs.getRig();
  for (let r = rig.rows - 1; r >= 0 && i < partIds.length; r--) {
    for (let c = 0; c < rig.cols && i < partIds.length; c++) rigs.place(r, c, partIds[i++]);
  }
}

function empty() {
  const st = metaSlice();
  Object.assign(st, { gold: 0, shards: 0, coreDust: 0, coreDustTotal: 0, goldThisCollapse: 0, bestDepth: 0,
    parts: { hook: 1 }, crew: {}, managers: {}, upgrades: {}, offlinePending: null });
  st.achievements = {};
  setRun(0, 0);
  const codex = getSlice('codex'); if (codex) codex.found = {};
  rigs.clear();
}

function busy() {
  empty();
  const st = metaSlice();
  Object.assign(st, { gold: 48250, shards: 120, coreDust: 3, coreDustTotal: 3, goldThisCollapse: 640000, bestDepth: 420 });
  st.parts = { hook: 1, magnet: 1, net: 1, polisher: 1, multiplier: 1, plate: 1, oilcan: 1, drill: 1 };
  st.crew = { winch: 12, smithy: 6, cart: 2 };
  st.upgrades = { rope: 3, grease: 2, tools: 2, loadouts: 1 };
  st.daily = { streak: 3, lastClaimDay: -1, twistOn: false };
  st.offlinePending = { ms: 3 * 3600 * 1000, gold: 5200 };
  fillLists(st, 0.4);
  setRun(420, 37);
  placeRig(['hook', 'magnet', 'polisher', 'plate']);
}

function extreme() {
  empty();
  const st = metaSlice();
  const parts = {};
  ids().forEach((id) => { parts[id] = 1; });
  const crew = {};
  crewIds().forEach((id) => { crew[id] = 400; });
  Object.assign(st, { gold: 9.994e35, shards: 999999, coreDust: 9999, coreDustTotal: 9999, goldThisCollapse: 9.994e35, bestDepth: 99999 });
  st.parts = parts; st.crew = crew; st.managers = { ...crew };
  st.upgrades = { rope: 8, grease: 8, mender: 6, bucket: 2, lantern: 10, tools: 10, vault: 8, deepstart: 10, extra_copy: 1, loadouts: 3, autohaul: 1 };
  st.offlinePending = { ms: 8 * 3600 * 1000, gold: 9.9e34 };
  st.daily = { streak: 7, lastClaimDay: -1, twistOn: true };
  st.stats.maxCombo = 99; st.stats.maxDepthRun = 99999; st.stats.drops = 99999; st.stats.goldEarned = 9.994e35;
  fillLists(st, 1);
  setRun(99999, 99999);
  const longest = allParts().slice().sort((a, b) => String(b.name).length - String(a.name).length).map((p) => p.id);
  placeRig(longest);
}

// Loads a test state. Returns { ok, name } or { ok:false, error }. Never throws.
export function loadFixture(name) {
  try {
    if (!FIXTURES.includes(name)) return { ok: false, error: 'Unknown fixture.' };
    if (storageKind() !== 'memory') return { ok: false, error: 'Fixtures need the memory-only save.' };
    if (name === 'empty') empty(); else if (name === 'busy') busy(); else extreme();
    markDirty('meta');
    return { ok: true, name };
  } catch (err) {
    log.error('fixture failed', err);
    return { ok: false, error: 'The test state could not be loaded.' };
  }
}

export default { loadFixture, FIXTURES };
