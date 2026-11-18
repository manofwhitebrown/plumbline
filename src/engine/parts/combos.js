// Combo detection. Reads a rig and says which named combos it contains.
// Row 0 is the top. The LAST row is the bottom and touches the stream first.
import { COMBO_DATA } from '../../data/parts.js';

function cellAt(rig, r, c) {
  const row = rig.cells[r];
  return row && typeof row[c] === 'string' ? row[c] : null;
}

// Every cell holding one of the given part ids -> [{r, c, id}]
function find(rig, ids) {
  const out = [];
  for (let r = 0; r < rig.rows; r++) {
    for (let c = 0; c < rig.cols; c++) {
      const id = cellAt(rig, r, c);
      if (id && ids.indexOf(id) >= 0) out.push({ r, c, id });
    }
  }
  return out;
}

const has = (rig, id) => find(rig, [id]).length > 0;
const COLLECTORS = ['hook', 'magnet', 'net', 'vacuum', 'jackpot'];
const CHANGERS = ['polisher', 'multiplier', 'smelter', 'splitter', 'amplifier', 'gilder', 'prism'];

// In one column: part a is lower than b, and b is lower than c (a nearest the bottom).
function stackInColumn(rig, ids) {
  for (let c = 0; c < rig.cols; c++) {
    let want = 0;
    for (let r = rig.rows - 1; r >= 0 && want < ids.length; r--) {
      if (cellAt(rig, r, c) === ids[want]) want++;
    }
    if (want === ids.length) return true;
  }
  return false;
}

function adjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

const RULES = {
  gem_press: (rig) => stackInColumn(rig, ['smelter', 'polisher', 'multiplier']),
  wide_net: (rig) => find(rig, ['splitter']).some((s) =>
    cellAt(rig, s.r, s.c - 1) === 'net' && cellAt(rig, s.r, s.c + 1) === 'net'),
  safe_dive: (rig) => has(rig, 'shield') && has(rig, 'oilcan') && has(rig, 'anchor'),
  drill_rush: (rig) => has(rig, 'drill') && has(rig, 'cooler') && has(rig, 'plate'),
  echo_chamber: (rig) => find(rig, ['echo']).some((e) =>
    find(rig, ['multiplier']).some((m) => Math.abs(m.c - e.c) <= 1)),
  prism_pair: (rig) => {
    const p = find(rig, ['prism']);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (adjacent(p[i], p[j])) return true;
    return false;
  },
  battery_burst: (rig) => has(rig, 'battery') && find(rig, COLLECTORS).length >= 3,
  metronome_mill: (rig) => find(rig, ['metronome']).some((m) =>
    find(rig, CHANGERS).filter((p) => p.r === m.r).length >= 2),
  lantern_scout: (rig) => has(rig, 'lantern') && has(rig, 'compass'),
  relic_hunter: (rig) => find(rig, ['jackpot']).some((j) =>
    find(rig, ['compass']).some((k) => Math.abs(k.r - j.r) <= 1 && Math.abs(k.c - j.c) <= 1)),
  fuse_chain: (rig) => {
    const f = find(rig, ['fuse']);
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (Math.abs(f[i].c - f[j].c) === 1) return true;
    return false;
  },
  gilded_press: (rig) => find(rig, ['gilder']).some((g) =>
    find(rig, ['multiplier']).some((m) => m.c === g.c)),
  loud_chain: (rig) => find(rig, ['amplifier']).some((a) =>
    find(rig, CHANGERS).filter((p) => p.c === a.c && p.r > a.r && p.id !== 'amplifier').length >= 2),
  rock_alchemist: (rig) => stackInColumn(rig, ['spikeguard', 'smelter', 'polisher']),
  cool_sweep: (rig) => find(rig, ['vacuum']).some((v) =>
    find(rig, ['cooler']).some((k) => k.c === v.c)),
  iron_wall: (rig) => has(rig, 'plate') && has(rig, 'shield') && has(rig, 'spikeguard'),
  long_rope: (rig) => has(rig, 'sparerope') && has(rig, 'oilcan') && has(rig, 'cooler'),
};

function validRig(rig) {
  return !!rig && Array.isArray(rig.cells) && Number.isInteger(rig.rows) && Number.isInteger(rig.cols) &&
    rig.rows > 0 && rig.cols > 0 && rig.rows <= 8 && rig.cols <= 8;
}

// detectCombos(rig) -> comboId[]   (never throws, bad rig gives [])
export function detectCombos(rig) {
  if (!validRig(rig)) return [];
  const out = [];
  for (const id of Object.keys(RULES)) {
    try { if (RULES[id](rig)) out.push(id); } catch (e) { /* a broken rule must not break the game */ }
  }
  return out;
}

export function comboInfo(id) {
  const d = COMBO_DATA[id];
  return d ? { id, name: d.name, desc: d.desc, tags: d.tags.slice() } : null;
}

export function allCombos() {
  return Object.keys(COMBO_DATA).map(comboInfo);
}

export const COMBO_IDS = Object.keys(RULES);
