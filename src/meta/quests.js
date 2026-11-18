// 3 daily quests. They rotate at local midnight. Rewards are Shards.
import { QUESTS, QUESTS_PER_DAY } from '../data/rewards.js';
import { makeRng } from '../core/rng.js';
import { s, changed } from './state.js';
import { now, dayIndex } from './time.js';
import { money, num } from './safe.js';
import { addShards } from './wallet.js';

const BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

// Pick today's quests. Same day gives the same quests. One quest per stat so they never overlap.
function pick(day, best) {
  const rng = makeRng((day * 7919 + 17) >>> 0);
  const pool = QUESTS.filter((q) => q.minBest <= best);
  const chosen = [];
  const usedStats = new Set();
  let guard = 0;
  while (chosen.length < QUESTS_PER_DAY && pool.length && guard++ < 200) {
    const q = pool[rng.int(0, pool.length - 1)];
    if (usedStats.has(q.stat) || chosen.includes(q)) continue;
    usedStats.add(q.stat);
    chosen.push(q);
  }
  return chosen.map((q) => ({ id: q.id, progress: 0, claimed: false }));
}

export function ensureToday() {
  const st = s();
  const day = dayIndex(now());
  // A clock moved backwards never creates fresh quests.
  if (st.quests.day >= day && st.quests.list.length) return;
  if (st.quests.day > day) return;
  st.quests = { day, list: pick(day, st.bestDepth) };
  changed('quests');
}

// A stat went up by n (kind 'sum').
export function advance(stat, n) {
  const amount = num(n);
  if (!(amount > 0)) return;
  ensureToday();
  for (const e of s().quests.list) {
    const q = BY_ID.get(e.id);
    if (q && q.stat === stat && q.kind === 'sum') e.progress = money(e.progress + amount);
  }
}

// A single-drop value (kind 'best'). Keeps the highest.
export function best(stat, value) {
  const v = num(value);
  if (!(v > 0)) return;
  ensureToday();
  for (const e of s().quests.list) {
    const q = BY_ID.get(e.id);
    if (q && q.stat === stat && q.kind === 'best' && v > e.progress) e.progress = money(v);
  }
}

function view(e) {
  const q = BY_ID.get(e.id);
  if (!q) return null;
  const done = e.progress >= q.target;
  return {
    id: q.id, text: q.text, target: q.target, progress: Math.min(e.progress, q.target),
    fraction: Math.min(1, e.progress / q.target), done, claimed: !!e.claimed,
    canClaim: done && !e.claimed, shards: q.shards,
  };
}

export function list() {
  ensureToday();
  return s().quests.list.map(view).filter(Boolean);
}

export function claim(id) {
  ensureToday();
  const e = s().quests.list.find((x) => x.id === id);
  const v = e && view(e);
  if (!v) return { ok: false, error: 'No such quest' };
  if (v.claimed) return { ok: false, error: 'Already claimed' };
  if (!v.done) return { ok: false, error: 'Not finished yet' };
  e.claimed = true;
  addShards(v.shards);
  s().stats.questsDone = money(s().stats.questsDone + 1);
  changed('quests');
  return { ok: true, shards: v.shards };
}

// Cheat helper: mark every quest finished (still needs a claim).
export function completeAll() {
  ensureToday();
  for (const e of s().quests.list) {
    const q = BY_ID.get(e.id);
    if (q) e.progress = q.target;
  }
  changed('quests');
}
export const unclaimedCount = () => list().filter((q) => q.canClaim).length;
