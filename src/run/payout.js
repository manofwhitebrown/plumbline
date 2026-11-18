// Turns a finished drop into gold, shards, a record and a plain-language summary. Pure.
import { rewardOf } from './goals.js';

export const SHARD_CAP_PER_DROP = 150; // no drop can ever pay more shards than this
const SHARDS_PER_METRES = 50;

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// Small number text used when no formatter is passed in.
function basicFmt(n) {
  const v = Math.round(num(n));
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
}

export function shardsFor({ depth, goals, newRecord }) {
  const fromDepth = Math.floor(Math.max(0, num(depth)) / SHARDS_PER_METRES);
  const total = fromDepth + rewardOf(goals) + (newRecord ? 1 : 0);
  return Math.max(0, Math.min(SHARD_CAP_PER_DROP, total));
}

// input: { outcome, gold, goldKept, depth, bestBefore, goals, tally, partsInRig, cheated, fmt }
export function computePayout(input = {}) {
  const fmt = typeof input.fmt === 'function' ? input.fmt : basicFmt;
  const outcome = input.outcome === 'snapped' ? 'snapped' : 'hauled';
  const gold = Math.max(0, num(input.gold));
  const kept = outcome === 'hauled' ? gold : Math.min(gold, Math.max(0, num(input.goldKept)));
  const depth = Math.max(0, num(input.depth));
  const bestBefore = Math.max(0, num(input.bestBefore));
  const newRecord = !input.cheated && depth > bestBefore;
  const goals = Array.isArray(input.goals) ? input.goals : [];
  const shardsEarned = input.cheated ? 0 : shardsFor({ depth, goals, newRecord });
  const tally = input.tally || { biggest: { tier: 0, value: 0 }, bestCombo: 0, fires: {}, gems: 0 };

  const partsUsed = Array.isArray(input.partsInRig) ? Array.from(new Set(input.partsInRig)) : [];
  const text = outcome === 'hauled'
    ? `You reached ${fmt(depth)} m and hauled ${fmt(kept)} gold.`
    : `The rope snapped at ${fmt(depth)} m. You kept ${fmt(kept)} of ${fmt(gold)} gold.`;

  return {
    outcome, gold, kept, depth, bestBefore, newRecord, shardsEarned,
    goals: goals.map((g) => ({ id: g.id, text: g.text, done: !!g.done, reward: g.reward })),
    partsUsed,
    summary: {
      text,
      biggestGem: tally.biggest && tally.biggest.tier ? { tier: tally.biggest.tier, value: tally.biggest.value } : null,
      bestCombo: num(tally.bestCombo),
      gems: num(tally.gems),
      parts: partsUsed.map((id) => ({ id, fires: num(tally.fires && tally.fires[id]) })),
    },
  };
}

export default { computePayout, shardsFor, SHARD_CAP_PER_DROP };
