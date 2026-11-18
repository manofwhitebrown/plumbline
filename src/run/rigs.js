// The rig: parts on the bucket grid. Row 0 is the top, the LAST row touches the stream first.
// Saved in slice `rig`. Three loadout slots. Parts come from what the player owns (meta.ownedParts()).
import { deps, call } from './deps.js';
import { preview as previewRig } from './rig-preview.js';

const SLICE = 'rig';
const SLOTS = 3;
const MAX_NAME = 20;
let registered = false;

function toInt(x) {
  if (x === null || x === undefined || x === '' || typeof x === 'boolean' || typeof x === 'object') return NaN;
  const n = Number(x);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

export function makeCells(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

// Copy a grid into a new size. Parts keep their row and column. Anything outside is dropped.
export function fitCells(cells, cols, rows) {
  const out = makeCells(cols, rows);
  if (!Array.isArray(cells)) return out;
  for (let r = 0; r < rows; r++) {
    const row = Array.isArray(cells[r]) ? cells[r] : [];
    for (let c = 0; c < cols; c++) out[r][c] = typeof row[c] === 'string' && row[c] ? row[c] : null;
  }
  return out;
}

function sizeFor(mods) {
  const m = mods || {};
  return { cols: Number(m.cols) >= 5 ? 5 : 4, rows: Number(m.rows) >= 4 ? 4 : 3 };
}

function modsNow() {
  const m = call(deps.meta, 'getMods');
  return m && typeof m === 'object' ? m : {};
}

// How many copies of each part the player owns: { hook: 1, net: 2 }.
export function ownedCounts(mods) {
  const out = {};
  const o = call(deps.meta, 'ownedParts');
  if (Array.isArray(o)) {
    for (const id of o) if (typeof id === 'string') out[id] = (out[id] || 0) + 1;
  } else if (o && typeof o === 'object') {
    for (const id of Object.keys(o)) { const n = toInt(o[id]); if (n > 0) out[id] = n; }
  }
  if (mods && Array.isArray(mods.unlockedParts)) {
    for (const id of mods.unlockedParts) if (typeof id === 'string' && !out[id]) out[id] = 1;
  }
  return out;
}

// Take parts off the grid that are not owned, or that have more copies placed than owned.
function trimToOwned(cells, owned) {
  const used = {};
  let dropped = 0;
  for (const row of cells) for (let c = 0; c < row.length; c++) {
    const id = row[c];
    if (!id) continue;
    used[id] = (used[id] || 0) + 1;
    if (!owned[id] || used[id] > owned[id]) { row[c] = null; dropped++; }
  }
  return dropped;
}

function starterRig() {
  const cells = makeCells(4, 3);
  cells[2][1] = 'hook';
  return { cols: 4, rows: 3, cells, loadouts: Array(SLOTS).fill(null) };
}

function cleanLoadout(l) {
  if (!l || typeof l !== 'object' || !Array.isArray(l.cells)) return null;
  const { cols, rows } = sizeFor({ cols: l.cols, rows: l.rows });
  return { name: String(l.name || '').slice(0, MAX_NAME), cols, rows, cells: fitCells(l.cells, cols, rows) };
}

function cleanSlice(old) {
  const o = old && typeof old === 'object' ? old : {};
  if (!Array.isArray(o.cells)) return starterRig();
  const { cols, rows } = sizeFor(o);
  const loadouts = Array.from({ length: SLOTS }, (_, i) => cleanLoadout(Array.isArray(o.loadouts) ? o.loadouts[i] : null));
  return { cols, rows, cells: fitCells(o.cells, cols, rows), loadouts };
}

function slice() {
  if (!registered) {
    registered = true;
    call(deps.save, 'registerSlice', SLICE, { version: 1, defaults: starterRig(), migrate: (old) => cleanSlice(old) });
  }
  const s = deps.save.getSlice(SLICE);
  if (!s || !Array.isArray(s.cells) || !Array.isArray(s.loadouts)) {
    Object.assign(s || {}, cleanSlice(s));
  }
  return s;
}

function changed() {
  call(deps.save, 'markDirty', SLICE);
  call(deps.bus, 'emit', 'rig:changed', { rig: getRig() });
}

// Make the saved rig match the current upgrades and owned parts.
function sync() {
  const s = slice();
  const mods = modsNow();
  const { cols, rows } = sizeFor(mods);
  let dirty = false;
  if (cols !== s.cols || rows !== s.rows) {
    s.cells = fitCells(s.cells, cols, rows); s.cols = cols; s.rows = rows; dirty = true;
  }
  if (trimToOwned(s.cells, ownedCounts(mods)) > 0) dirty = true;
  if (dirty) changed();
  return s;
}

export function getRig() {
  const s = sync();
  return { cols: s.cols, rows: s.rows, cells: s.cells.map((row) => row.slice()) };
}

function inRange(s, r, c) {
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < s.rows && c < s.cols;
}

function countPlaced(s, id, skipR, skipC) {
  let n = 0;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    if (r === skipR && c === skipC) continue;
    if (s.cells[r][c] === id) n++;
  }
  return n;
}

export function place(r, c, partId) {
  const s = sync();
  const row = toInt(r), col = toInt(c);
  if (!inRange(s, row, col)) return { ok: false, error: 'That spot is not on the rig.' };
  if (typeof partId !== 'string' || !partId) return { ok: false, error: 'Pick a part first.' };
  const owned = ownedCounts(modsNow())[partId] || 0;
  if (owned < 1) return { ok: false, error: 'You do not own that part yet.' };
  if (s.cells[row][col] === partId) return { ok: true, rig: getRig() };
  if (countPlaced(s, partId, row, col) >= owned) {
    return { ok: false, error: 'All your copies of that part are on the rig. Take one off first.' };
  }
  s.cells[row][col] = partId;
  changed();
  return { ok: true, rig: getRig() };
}

export function remove(r, c) {
  const s = sync();
  const row = toInt(r), col = toInt(c);
  if (!inRange(s, row, col)) return { ok: false, error: 'That spot is not on the rig.' };
  const removed = s.cells[row][col];
  if (!removed) return { ok: true, removed: null };
  s.cells[row][col] = null;
  changed();
  return { ok: true, removed };
}

function spot(x) {
  if (Array.isArray(x)) return { r: toInt(x[0]), c: toInt(x[1]) };
  return x && typeof x === 'object' ? { r: toInt(x.r), c: toInt(x.c) } : { r: NaN, c: NaN };
}

export function swap(a, b) {
  const s = sync();
  const p = spot(a), q = spot(b);
  if (!inRange(s, p.r, p.c) || !inRange(s, q.r, q.c)) return { ok: false, error: 'That spot is not on the rig.' };
  const t = s.cells[p.r][p.c];
  s.cells[p.r][p.c] = s.cells[q.r][q.c];
  s.cells[q.r][q.c] = t;
  changed();
  return { ok: true, rig: getRig() };
}

export function clear() {
  const s = sync();
  s.cells = makeCells(s.cols, s.rows);
  changed();
  return { ok: true, rig: getRig() };
}

// Parts you own but have not placed: { id: copiesLeft }.
export function tray() {
  const s = sync();
  const left = ownedCounts(modsNow());
  for (const row of s.cells) for (const id of row) if (id && left[id]) left[id]--;
  for (const id of Object.keys(left)) if (left[id] <= 0) delete left[id];
  return left;
}

// Always returns a rig that is safe to give the engine. `problems` says what was fixed, in plain words.
export function validate(rig, mods) {
  const problems = [];
  let source = rig;
  if (!source || typeof source !== 'object' || !Array.isArray(source.cells)) {
    problems.push('The rig was not valid, so it was cleared.');
    source = { cells: [] };
  }
  const { cols, rows } = sizeFor(mods || modsNow());
  const cells = fitCells(source.cells, cols, rows);
  if (trimToOwned(cells, ownedCounts(mods)) > 0) problems.push('Some parts are not yours yet, so they were taken off.');
  return { ok: problems.length === 0, rig: { cols, rows, cells }, problems };
}

function slotOf(slot) {
  const i = toInt(slot);
  return i >= 0 && i < SLOTS ? i : -1;
}

export const loadouts = {
  save(slot, name) {
    const i = slotOf(slot);
    if (i < 0) return { ok: false, error: 'Pick loadout 1, 2 or 3.' };
    const s = sync();
    const old = s.loadouts[i];
    const label = typeof name === 'string' && name.trim() ? name.trim().slice(0, MAX_NAME) : (old && old.name) || 'Loadout ' + (i + 1);
    s.loadouts[i] = { name: label, cols: s.cols, rows: s.rows, cells: s.cells.map((row) => row.slice()) };
    call(deps.save, 'markDirty', SLICE);
    return { ok: true, name: label };
  },
  load(slot) {
    const i = slotOf(slot);
    if (i < 0) return { ok: false, error: 'Pick loadout 1, 2 or 3.' };
    const s = sync();
    const saved = s.loadouts[i];
    if (!saved) return { ok: false, error: 'That loadout is empty.' };
    s.cells = fitCells(saved.cells, s.cols, s.rows);
    const dropped = trimToOwned(s.cells, ownedCounts(modsNow()));
    changed();
    return { ok: true, dropped, rig: getRig() };
  },
  list() {
    const s = sync();
    return s.loadouts.map((l, i) => (l ? { slot: i, name: l.name, parts: l.cells.flat().filter(Boolean).length } : null));
  },
  rename(slot, name) {
    const i = slotOf(slot);
    const s = sync();
    if (i < 0 || !s.loadouts[i]) return { ok: false, error: 'That loadout is empty.' };
    s.loadouts[i].name = String(name || '').trim().slice(0, MAX_NAME) || 'Loadout ' + (i + 1);
    call(deps.save, 'markDirty', SLICE);
    return { ok: true };
  },
};

export function preview(rig, opts) {
  return previewRig(rig || getRig(), modsNow(), opts);
}

export function _forget() { registered = false; }

export const rigs = { getRig, place, remove, swap, clear, tray, validate, preview, loadouts };
export default rigs;
