// Costs and milestones. Pure functions, no state.
import { CREW_GROWTH, CREW_MILESTONES } from '../data/crew.js';
import { money, count, num } from './safe.js';

// Cost of the next one: base x 1.15^owned (rounded up).
export function costOf(base, owned, growth = CREW_GROWTH) {
  const c = Math.ceil(num(base) * Math.pow(growth, count(owned, 1e6)));
  return Number.isFinite(c) ? money(c) : money(Infinity) || 1e300;
}

// Cost of buying n in a row.
export function bulkCost(base, owned, n, growth = CREW_GROWTH) {
  const k = count(n, 1e6);
  if (k === 0) return 0;
  const first = num(base) * Math.pow(growth, count(owned, 1e6));
  const total = Math.ceil(first * (Math.pow(growth, k) - 1) / (growth - 1));
  return Number.isFinite(total) ? money(total) : 1e300;
}

// How many can be bought with this much gold (at least 0).
export function maxAffordable(base, owned, gold, growth = CREW_GROWTH, cap = 100000) {
  const g = money(gold);
  const first = costOf(base, owned, growth);
  if (!(first > 0) || g < first) return 0;
  const raw = Math.log(1 + (g * (growth - 1)) / (num(base) * Math.pow(growth, count(owned, 1e6)))) / Math.log(growth);
  let n = Math.max(0, Math.min(cap, Math.floor(Number.isFinite(raw) ? raw : 0)));
  while (n > 0 && bulkCost(base, owned, n, growth) > g) n--;
  while (n < cap && bulkCost(base, owned, n + 1, growth) <= g) n++;
  return n;
}

// Output multiplier from milestones: each one reached doubles it.
export function milestoneMult(owned) {
  const o = count(owned, 1e9);
  let hits = 0;
  for (const m of CREW_MILESTONES) if (o >= m) hits++;
  return Math.pow(2, hits);
}

// The next milestone and how far along we are toward it.
export function nextMilestone(owned) {
  const o = count(owned, 1e9);
  let prev = 0;
  for (const m of CREW_MILESTONES) {
    if (o < m) return { at: m, remaining: m - o, progress: (o - prev) / (m - prev) };
    prev = m;
  }
  return { at: null, remaining: 0, progress: 1 };
}
