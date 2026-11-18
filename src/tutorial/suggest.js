// Suggest a good rig. Hill climbing with the real engine and fixed seeds.
// Always returns a valid rig for the size and the owned counts. Same input, same answer
// (the time limit is only a safety net: tests pass maxEvals to make it exact).
import { simulateRun } from '../engine/index.js';
import { getPart } from '../engine/parts/index.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const BUDGET_MS = 150;
const HAUL_AT = 0.75;
const MAX_BEATS = 250;
const FAMILY_ORDER = ['collector', 'processor', 'defense', 'engine', 'special'];

function pickSize(value, allowed, fallback) {
  return allowed.indexOf(value) !== -1 ? value : fallback;
}

export function emptyRig(cols, rows) {
  const c = pickSize(cols, [4, 5], 4);
  const r = pickSize(rows, [3, 4], 3);
  const cells = [];
  for (let i = 0; i < r; i++) cells.push(new Array(c).fill(null));
  return { cols: c, rows: r, cells };
}

// Owned parts as a sorted list of [id, count]. Accepts { id: n } or [id, id, ...].
function ownedList(owned, mods, getP) {
  const counts = {};
  if (Array.isArray(owned)) {
    for (const id of owned) if (typeof id === 'string') counts[id] = (counts[id] || 0) + 1;
  } else if (owned && typeof owned === 'object') {
    for (const id of Object.keys(owned)) {
      const n = Math.floor(Number(owned[id]));
      if (Number.isFinite(n) && n > 0) counts[id] = Math.min(n, 4);
    }
  }
  const out = [];
  for (const id of Object.keys(counts).sort()) {
    let known = null;
    try { known = getP(id); } catch (e) { known = null; }
    if (known) out.push([id, counts[id]]);
  }
  void mods;
  return out;
}

function cloneCells(cells) { return cells.map((row) => row.slice()); }
function keyOf(cells) { return cells.map((row) => row.map((x) => x || '.').join(',')).join('|'); }

// A sensible start: collectors on the bottom row, the rest in the rows above.
function seedRig(cols, rows, list, getP) {
  const rig = emptyRig(cols, rows);
  const items = [];
  for (const [id, n] of list) for (let i = 0; i < n; i++) items.push(id);
  const famRank = (id) => {
    let fam = '';
    try { fam = (getP(id) || {}).family || ''; } catch (e) { fam = ''; }
    const i = FAMILY_ORDER.indexOf(fam);
    return i < 0 ? FAMILY_ORDER.length : i;
  };
  items.sort((a, b) => famRank(a) - famRank(b));
  // Fill order: bottom row first, middle columns first.
  const colOrder = [];
  const mid = (rig.cols - 1) / 2;
  for (let c = 0; c < rig.cols; c++) colOrder.push(c);
  colOrder.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
  const spots = [];
  for (let r = rig.rows - 1; r >= 0; r--) for (const c of colOrder) spots.push([r, c]);
  for (let i = 0; i < items.length && i < spots.length; i++) rig.cells[spots[i][0]][spots[i][1]] = items[i];
  return rig;
}

export const suggest = {
  // opts (tests only): { maxEvals, budgetMs, deps, getPart }
  bestRig(mods, ownedParts, opts) {
    const m = mods && typeof mods === 'object' ? mods : {};
    const o = opts && typeof opts === 'object' ? opts : {};
    const base = emptyRig(m.cols, m.rows);
    try {
      const getP = typeof o.getPart === 'function' ? o.getPart : getPart;
      const list = ownedList(ownedParts, m, getP);
      if (!list.length) return base;
      const cols = base.cols, rows = base.rows;
      const start = seedRig(cols, rows, list, getP);
      const budget = Number.isFinite(o.budgetMs) ? o.budgetMs : BUDGET_MS;
      const maxEvals = Number.isFinite(o.maxEvals) ? o.maxEvals : 1e9;
      const t0 = Date.now();
      let evals = 0;
      const cache = new Map();
      const simMods = Object.assign({}, m, { cheat: null });
      const policy = ({ run }) => (run.state.strain >= HAUL_AT * run.state.maxStrain ? 'haul' : 'continue');
      const outOfTime = () => evals >= maxEvals || Date.now() - t0 >= budget;

      const score = (cells) => {
        const k = keyOf(cells);
        if (cache.has(k)) return cache.get(k);
        let total = 0;
        for (const seed of SEEDS) {
          let g = 0;
          try {
            const res = simulateRun({ rig: { cols, rows, cells }, mods: simMods, seed, policy, deps: o.deps, maxBeats: MAX_BEATS });
            g = res && Number.isFinite(res.kept) ? res.kept : 0;
          } catch (e) { g = 0; }
          total += g;
        }
        evals++;
        const s = total / SEEDS.length;
        cache.set(k, s);
        return s;
      };

      let best = cloneCells(start.cells);
      let bestScore = score(best);
      let improved = true;
      while (improved && !outOfTime()) {
        improved = false;
        const cells = cloneCells(best);
        const spots = [];
        for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) spots.push([r, c]);
        // Moves: swap two cells (either may be empty). This keeps owned counts exact.
        for (let i = 0; i < spots.length && !outOfTime(); i++) {
          for (let j = i + 1; j < spots.length && !outOfTime(); j++) {
            const [r1, c1] = spots[i], [r2, c2] = spots[j];
            if (cells[r1][c1] === cells[r2][c2]) continue;
            const t = cloneCells(cells);
            t[r1][c1] = cells[r2][c2]; t[r2][c2] = cells[r1][c1];
            const s = score(t);
            if (s > bestScore + 1e-9) { best = t; bestScore = s; improved = true; break; }
          }
          if (improved) break;
        }
      }
      // Remove parts that hurt (a part may cost more than it earns).
      for (let r = 0; r < rows && !outOfTime(); r++) for (let c = 0; c < cols && !outOfTime(); c++) {
        if (!best[r][c]) continue;
        const t = cloneCells(best); t[r][c] = null;
        if (!t.some((row) => row.some(Boolean))) continue;
        const s = score(t);
        if (s > bestScore + 1e-9) { best = t; bestScore = s; }
      }
      return { cols, rows, cells: best };
    } catch (e) {
      return base;
    }
  },
};

export default suggest;
