// What the Results screen shows and when. Pure logic. Bad or missing data gives safe text.
import { fmt, fmtDepth } from '../../core/format.js';

const GOAL_MAX = 3;
const PART_MAX = 8;

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function str(x, max) {
  const s = typeof x === 'string' ? x.trim() : '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// Make any payload safe. Never throws.
export function normalizeResult(p) {
  const r = p && typeof p === 'object' ? p : {};
  const outcome = r.outcome === 'snapped' ? 'snapped' : 'hauled';
  const gold = Math.max(0, num(r.gold));
  const kept = outcome === 'hauled' ? gold : Math.min(gold, Math.max(0, num(r.kept)));
  const sum = r.summary && typeof r.summary === 'object' ? r.summary : {};
  const gem = sum.biggestGem && typeof sum.biggestGem === 'object' && num(sum.biggestGem.tier) > 0
    ? { tier: Math.min(6, Math.max(1, Math.floor(num(sum.biggestGem.tier)))), value: Math.max(0, num(sum.biggestGem.value)) } : null;
  const goals = (Array.isArray(r.goals) ? r.goals : []).filter((g) => g && typeof g === 'object').slice(0, GOAL_MAX)
    .map((g) => ({ text: str(g.text, 40), done: !!g.done, reward: Math.max(0, Math.floor(num(g.reward))) }));
  const partList = Array.isArray(sum.parts) ? sum.parts : (Array.isArray(r.partsUsed) ? r.partsUsed.map((id) => ({ id })) : []);
  const parts = partList.filter((x) => x && typeof x.id === 'string' && x.id).slice(0, PART_MAX)
    .map((x) => ({ id: x.id, fires: Math.max(0, Math.floor(num(x.fires))) }));
  const depth = Math.max(0, num(r.depth));
  return {
    outcome, snapped: outcome === 'snapped', gold, kept, lost: Math.max(0, gold - kept),
    depth, newRecord: !!r.newRecord, bestBefore: Math.max(0, num(r.bestBefore)),
    shards: Math.max(0, Math.floor(num(r.shardsEarned))), goals,
    goalsDone: goals.filter((g) => g.done).length,
    summaryText: str(sum.text, 140) || (outcome === 'hauled' ? 'You hauled ' + fmt(kept) + ' gold.' : 'The rope snapped.'),
    gem, bestCombo: Math.max(0, Math.floor(num(sum.bestCombo))), parts,
    chase: { near: str(r.chase && r.chase.nearMiss && r.chase.nearMiss.text, 60), tip: str(r.chase && r.chase.tip && r.chase.tip.text, 90) }, // [HOOK-1] wave 2
  };
}

export function titleText(r) {
  return r && r.snapped ? 'The rope snapped!' : 'Hauled!';
}

export function depthText(r) {
  return fmtDepth(r ? r.depth : 0);
}

// "kept 30 · lost 70". A haul keeps it all.
export function snapText(r) {
  if (!r || !r.snapped) return 'Kept it all';
  if (r.gold <= 0) return 'No Gold to lose';
  return 'kept ' + fmt(r.kept) + ' · lost ' + fmt(r.lost);
}

export function comboText(n) {
  return 'Best Combo x' + fmt(Math.max(0, num(n)));
}

// Reveal steps in order. `at` is the time in ms from the start. The last one is the buttons, at about 2.5 s.
// Steps with nothing to show are left out. Reduce motion shows everything at once.
export function revealPlan(r, reduceMotion) {
  const steps = [{ id: 'title', at: 0 }, { id: 'depth', at: 250 }];
  if (r && r.newRecord) steps.push({ id: 'record', at: 650 });
  steps.push({ id: 'gold', at: 800, dur: 800 });
  steps.push({ id: 'snap', at: 1600 });
  if (r && r.shards > 0) steps.push({ id: 'shards', at: 1750 });
  if (r && r.goals && r.goals.length) steps.push({ id: 'goals', at: 1900, each: 140 });
  if (r && (r.gem || r.bestCombo > 1)) steps.push({ id: 'best', at: 2200 });
  if (r && r.parts && r.parts.length) steps.push({ id: 'parts', at: 2300 });
  steps.push({ id: 'summary', at: 2400 });
  if (r && r.chase && (r.chase.near || r.chase.tip)) steps.push({ id: 'chase', at: 2450 }); // [HOOK-1] wave 2
  steps.push({ id: 'buttons', at: 2500 });
  if (reduceMotion) return steps.map((s) => ({ ...s, at: 0, dur: 0, each: 0 }));
  return steps;
}

// Which steps should be visible after `elapsed` ms.
export function visibleAt(plan, elapsed) {
  const t = Number.isFinite(elapsed) ? elapsed : 0;
  return (Array.isArray(plan) ? plan : []).filter((s) => t >= s.at).map((s) => s.id);
}
