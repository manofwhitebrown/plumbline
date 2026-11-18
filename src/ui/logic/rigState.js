// Rig screen state machine: tap a part, then a cell. Pure, no DOM.
// state: { mode: 'idle' | 'part' | 'move', partId, from }
export function initial() {
  return { mode: 'idle', partId: null, from: null };
}

// cellId is the part in the tapped cell (or null). Returns { state, effect }.
export function tapPart(state, partId, owned, inUse) {
  if (typeof partId !== 'string' || !partId) return { state, effect: { type: 'none' } };
  if (state.mode === 'part' && state.partId === partId) return { state: initial(), effect: { type: 'none' } };
  if ((owned | 0) - (inUse | 0) <= 0) return { state, effect: { type: 'deny', reason: 'All copies are in use' } };
  return { state: { mode: 'part', partId, from: null }, effect: { type: 'highlight' } };
}

export function tapCell(state, r, c, cellPart) {
  if (!Number.isInteger(r) || !Number.isInteger(c)) return { state, effect: { type: 'none' } };
  if (state.mode === 'part') {
    return { state: initial(), effect: { type: 'place', r, c, partId: state.partId } };
  }
  if (state.mode === 'move') {
    if (state.from && state.from.r === r && state.from.c === c) return { state: initial(), effect: { type: 'none' } };
    return { state: initial(), effect: { type: 'swap', a: state.from, b: { r, c } } };
  }
  if (cellPart) return { state, effect: { type: 'openSheet', r, c, partId: cellPart } };
  return { state, effect: { type: 'none' } };
}

export function startMove(state, r, c) {
  return { mode: 'move', partId: null, from: { r, c } };
}

export function cancel() {
  return initial();
}

// Drag and drop: a part from the tray onto a cell, or a placed part onto another cell.
export function drop(source, r, c) {
  if (!source || !Number.isInteger(r) || !Number.isInteger(c)) return { type: 'none' };
  if (source.kind === 'tray') return { type: 'place', r, c, partId: source.partId };
  if (source.kind === 'cell') {
    if (source.r === r && source.c === c) return { type: 'none' };
    return { type: 'swap', a: { r: source.r, c: source.c }, b: { r, c } };
  }
  return { type: 'none' };
}

// Which cells should glow for the picked part? Empty cells, or all cells if swapping is allowed.
export function glowCells(rig, partId) {
  const out = [];
  if (!rig || !Array.isArray(rig.cells) || !partId) return out;
  for (let r = 0; r < rig.cells.length; r++) {
    const row = rig.cells[r] || [];
    for (let c = 0; c < row.length; c++) out.push({ r, c, empty: !row[c] });
  }
  return out;
}
