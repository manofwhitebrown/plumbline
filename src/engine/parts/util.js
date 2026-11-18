// Small helpers shared by all parts. Keep this file tiny and safe.
import { PART_DATA } from '../../data/parts.js';

// Build a frozen PartDef from the data file plus the hooks of the part.
export function mk(id, extra) {
  const d = PART_DATA[id];
  return Object.freeze(Object.assign({
    id, name: d.name, family: d.family, tags: d.tags.slice(),
    desc: d.desc, cost: d.cost, unlock: Object.assign({}, d.unlock), tune: d.tune,
    reach: [0], hazardReach: [],
  }, extra || {}));
}

// A number that is always finite.
export function num(x, fallback) {
  return typeof x === 'number' && Number.isFinite(x) ? x : (fallback === undefined ? 0 : fallback);
}

// Is this a thing the player can be paid for?
export function isLoot(item) {
  return !!item && (item.kind === 'gem' || item.kind === 'ore' || item.kind === 'relic');
}

// Keep values from growing to Infinity.
export function capValue(v) {
  return v > 1e30 ? 1e30 : v;
}

// One FIRE event for this part.
export function fire(ctx) {
  ctx.emit({ t: 'FIRE', r: ctx.r, c: ctx.c, partId: ctx.partId });
}

// Per-run state of one cell. It hangs on the run, so a new run starts clean.
export function stateOf(run, r, c) {
  if (!run.partState) run.partState = [];
  const rows = run.partState;
  if (!rows[r]) rows[r] = [];
  if (!rows[r][c]) rows[r][c] = {};
  return rows[r][c];
}
