// Per-drop goals: pick 3, track progress from engine events, report finished ones.
// Pure logic: no clock, no storage. Pass in an rng (core/rng) for the pick.
import { TEMPLATES, availableTemplates, MAX_GOALS, GOAL_SHARD_CAP } from '../data/goals.js';

const NONE = Object.freeze([]);
const FIRST_DROP_BEST = 60; // a brand new player gets goals sized for a ~60 m drop

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function pickIndex(rng, n) {
  const r = rng && typeof rng.next === 'function' ? num(rng.next()) : 0.5;
  return Math.min(n - 1, Math.max(0, Math.floor(Math.abs(r) % 1 * n)));
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = pickIndex(rng, i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Make a fresh list of goals for one drop. Never throws.
export function generate({ bestDepth = 0, rng = null } = {}) {
  try {
    const best = Math.max(num(bestDepth), 0);
    const sized = Math.max(best, FIRST_DROP_BEST);
    const kinds = shuffle(availableTemplates(best), rng).slice(0, MAX_GOALS);
    const levels = shuffle([0, 1, 2], rng);
    const goals = [];
    for (let i = 0; i < kinds.length; i++) {
      const t = kinds[i];
      const made = t.make(t.kind === 'depth' ? sized : best, levels[i % 3]);
      goals.push({
        id: t.kind, kind: t.kind, level: levels[i % 3],
        ...made, progress: 0, progress01: 0, hits: 0, done: false, failed: false,
      });
    }
    return goals;
  } catch (e) {
    return [];
  }
}

function setProgress(g, value) {
  g.progress = Math.max(g.progress, Math.min(num(value), g.target));
  g.progress01 = g.target > 0 ? Math.min(1, g.progress / g.target) : 0;
}

function finish(g, doneList) {
  if (g.done) return doneList;
  g.done = true;
  g.progress = g.target;
  g.progress01 = 1;
  const out = doneList === NONE ? [] : doneList;
  out.push(g);
  return out;
}

// Feed one beat of events. Changes the goals in place. Returns goals that just finished.
// state = { depth, strain } read from the run after the beat.
export function update(goals, events, state) {
  if (!Array.isArray(goals) || goals.length === 0) return NONE;
  let doneList = NONE;
  const depth = num(state && state.depth);
  const list = Array.isArray(events) ? events : NONE;
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    if (!g || g.done || g.failed) continue;
    if (g.kind === 'depth') {
      setProgress(g, depth);
      if (g.progress >= g.target) doneList = finish(g, doneList);
    } else if (g.kind === 'gems' || g.kind === 'combo') {
      for (let k = 0; k < list.length; k++) {
        const e = list[k];
        if (!e || e.t !== 'COLLECT') continue;
        if (g.kind === 'combo') setProgress(g, e.combo);
        else if (e.item && (e.item.kind === 'gem' || e.item.kind === 'relic') && num(e.item.tier) >= g.tier) setProgress(g, g.progress + 1);
      }
      if (g.progress >= g.target) doneList = finish(g, doneList);
    } else if (g.kind === 'cleanRope') {
      for (let k = 0; k < list.length; k++) {
        const e = list[k];
        if (e && e.t === 'HAZARD' && !e.absorbedBy) g.hits++;
      }
      if (g.hits > g.maxHits) { g.failed = true; continue; }
      setProgress(g, depth);
      if (g.progress >= g.target) doneList = finish(g, doneList);
    } else if (g.kind === 'haulStrain') {
      setProgress(g, depth); // shown as depth progress; the strain check happens when you haul
    }
  }
  return doneList;
}

// Call once when the drop ends. Checks goals that depend on how it ended.
export function finalize(goals, { outcome, depth, strain } = {}) {
  if (!Array.isArray(goals)) return NONE;
  let doneList = NONE;
  for (const g of goals) {
    if (g && g.kind === 'haulStrain' && !g.done && outcome === 'hauled'
      && num(depth) >= g.target && num(strain) < g.strainBelow) doneList = finish(g, doneList);
  }
  return doneList;
}

// Shards from the goals that are done. Capped.
export function rewardOf(goals) {
  if (!Array.isArray(goals)) return 0;
  let sum = 0;
  for (const g of goals) if (g && g.done) sum += Math.max(0, Math.floor(num(g.reward)));
  return Math.min(sum, GOAL_SHARD_CAP);
}

export const goalsApi = { generate, update, finalize, rewardOf, TEMPLATES };
export default goalsApi;
