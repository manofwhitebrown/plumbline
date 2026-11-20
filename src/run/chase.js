// Chase numbers for the drop screen and the Results screen. Pure: no saves, no bus, no DOM.
//   createGhost()        records Gold by depth during a drop (the ghost of this drop)
//   ghostAt(pts, depth)  Gold the saved best drop had at this depth, or null
//   chaseView(input)     the small pills the HUD shows ("40 Gold ahead of your best")
//   nearMiss(input)      the "Only 6 m from your best!" line after a drop
//   bestNextTip(input)   one purchase that would have kept more Gold after a Snap
import { CHASE, CHASE_TEXT } from '../data/chase.js';
import { byDepth } from '../data/biomes.js';

const num = (x, d = 0) => { const n = Number(x); return Number.isFinite(n) ? n : d; };
const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : ''));
function plain(n) {
  const v = Math.round(num(n));
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
}

// Records the Gold you had when you first reached each ghostStep metres. Gaps carry the last value, so it is always a flat list of numbers.
export function createGhost() {
  const pts = [];
  return {
    sample(depth, gold) {
      const d = Math.max(0, num(depth)), g = Math.max(0, num(gold));
      const i = Math.min(CHASE.ghostMax - 1, Math.floor(d / CHASE.ghostStep));
      if (i < pts.length) return; // only forward: each cell keeps the Gold you had when you first got that deep
      const prev = pts.length ? pts[pts.length - 1] : 0;
      while (pts.length < i) pts.push(prev);
      pts.push(g);
    },
    finish() { return pts.map((v) => Math.round(v)); },
    get length() { return pts.length; },
  };
}

// Keep only a clean list of non-negative numbers (a saved ghost can be old or damaged).
export function cleanGhost(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (let i = 0; i < raw.length && i < CHASE.ghostMax; i++) { const v = Number(raw[i]); out.push(Number.isFinite(v) && v >= 0 ? v : (out.length ? out[out.length - 1] : 0)); }
  return out;
}

export function ghostAt(pts, depth) {
  if (!Array.isArray(pts) || pts.length === 0) return null;
  const x = Math.max(0, num(depth)) / CHASE.ghostStep, i = Math.floor(x);
  if (i >= pts.length) return null; // the saved drop never got this deep
  const a = num(pts[i]), b = i + 1 < pts.length ? num(pts[i + 1]) : a;
  return a + (b - a) * (x - i);
}

// input: { depth, gold, bestDepth, ghost, nextBiomeIn, goals, fmt }
export function chaseView(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const fmt = typeof input.fmt === 'function' ? input.fmt : plain;
  const depth = Math.max(0, num(input.depth)), gold = Math.max(0, num(input.gold)), best = Math.max(0, num(input.bestDepth));
  const nextIn = Number.isFinite(Number(input.nextBiomeIn)) ? Math.max(0, Math.ceil(num(input.nextBiomeIn))) : null;
  const goals = Array.isArray(input.goals) ? input.goals : [];
  const v = { toBest: null, pastBest: false, nextIn, ghost: null, goals: { done: goals.filter((g) => g && g.done).length, total: goals.length }, pills: [] };
  if (best > 0) { v.pastBest = depth > best; v.toBest = v.pastBest ? 0 : Math.max(1, Math.ceil(best - depth)); }
  if (best > 0 && depth >= CHASE.ghostFrom) {
    const g = ghostAt(input.ghost, depth);
    if (g !== null) {
      const diff = Math.round(gold - g), tone = diff >= CHASE.levelWithin ? 'good' : diff <= -CHASE.levelWithin ? 'bad' : 'even';
      v.ghost = { gold: Math.round(g), diff, tone };
    }
  }
  const p = v.pills;
  if (best > 0) p.push(v.pastBest ? { id: 'best', text: CHASE_TEXT.newBest, tone: 'good' } : { id: 'best', text: fill(CHASE_TEXT.toBest, { n: fmt(v.toBest) }), tone: 'even' });
  if (v.ghost) p.push({ id: 'ghost', tone: v.ghost.tone, text: v.ghost.tone === 'good' ? fill(CHASE_TEXT.ghostAhead, { n: fmt(v.ghost.diff) }) : v.ghost.tone === 'bad' ? fill(CHASE_TEXT.ghostBehind, { n: fmt(-v.ghost.diff) }) : CHASE_TEXT.ghostLevel });
  if (nextIn !== null && nextIn > 0) p.push({ id: 'next', text: fill(CHASE_TEXT.nextBiome, { n: fmt(nextIn) }), tone: 'even' });
  if (p.length > CHASE.pillMax) p.length = CHASE.pillMax;
  return v;
}

// After a drop. Returns { kind, gap, text } or null. A new best never gets a near-miss line.
export function nearMiss(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const fmt = typeof input.fmt === 'function' ? input.fmt : plain;
  const depth = Math.max(0, num(input.depth)), best = Math.max(0, num(input.bestBefore));
  if (input.newRecord || input.cheated || depth <= 0) return null;
  if (best > 0 && depth < best) {
    const gap = Math.max(1, Math.ceil(best - depth)), near = Math.min(CHASE.nearMissMax, Math.max(CHASE.nearMissMin, best * CHASE.nearMissPct));
    if (gap <= near) return { kind: 'best', gap, text: fill(CHASE_TEXT.nearBest, { n: fmt(gap) }) };
  }
  const here = byDepth(depth), edge = num(here && here.to, Infinity);
  if (Number.isFinite(edge) && edge > depth && edge - depth <= CHASE.nearBiome && here.id !== 'abyss') {
    const gap = Math.max(1, Math.ceil(edge - depth));
    return { kind: 'biome', gap, text: fill(CHASE_TEXT.nearBiome, { n: fmt(gap) }) };
  }
  return null;
}

// After a Snap: the Gold a better rope upgrade would have kept. input: { outcome, gold, upgrade: { name, level, max, per, canBuy }, fmt }
export function bestNextTip(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const fmt = typeof input.fmt === 'function' ? input.fmt : plain;
  const u = input.upgrade && typeof input.upgrade === 'object' ? input.upgrade : null;
  if (input.outcome !== 'snapped' || input.cheated || !u || u.maxed || num(u.level) >= num(u.max, 0)) return null;
  const gold = Math.max(0, num(input.gold)), extra = Math.floor(gold * Math.max(0, num(u.per)) / 100);
  if (extra < CHASE.tipMinGold) return null;
  const text = fill(CHASE_TEXT.tip, { name: String(u.name || 'Rope Mender'), n: fmt(extra) }) + (u.canBuy ? ' ' + CHASE_TEXT.tipBuy : '');
  return { id: String(u.id || 'mender'), extra, canBuy: !!u.canBuy, text };
}

export default { createGhost, cleanGhost, ghostAt, chaseView, nearMiss, bestNextTip };
