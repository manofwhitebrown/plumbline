// STUB: rig slice. Real version comes next. Row 0 is the top, the last row touches the stream first.
function emptyRig(cols = 4, rows = 3) {
  return { cols, rows, cells: Array.from({ length: rows }, () => Array(cols).fill(null)) };
}
const rig = emptyRig();
rig.cells[2][0] = 'hook';

export function getRig() { return rig; }
export function place() { return { ok: false, error: 'Not ready yet.' }; }
export function remove() { return { ok: true }; }
export function swap() { return { ok: true }; }
export function clear() { return { ok: true }; }
export function validate(r) { return { ok: true, rig: r || emptyRig() }; }
export function preview() { return { combos: [], power: 0, warnings: [] }; }
export const loadouts = { save() { return { ok: true }; }, load() { return { ok: true }; } };

export const rigs = { getRig, place, remove, swap, clear, validate, preview, loadouts };
export default rigs;
