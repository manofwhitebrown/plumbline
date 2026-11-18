// Lifetime counters. Quests and achievements read these.
import { CREW } from '../data/crew.js';
import { s } from './state.js';
import { money, num } from './safe.js';
import { advance, best as questBest } from './quests.js';
import { totalOwned } from './crew.js';

// Add n to a counter and tell the quests.
export function bump(name, n = 1) {
  const x = num(n);
  const st = s();
  if (!(x > 0) || typeof st.stats[name] !== 'number') return;
  st.stats[name] = money(st.stats[name] + x);
  advance(name, x);
}

// Keep the highest value of a counter (quests see single-drop values).
export function top(name, value, questStat) {
  const v = num(value);
  const st = s();
  if (!(v > 0) || typeof st.stats[name] !== 'number') return;
  if (v > st.stats[name]) st.stats[name] = money(v);
  questBest(questStat || name, v);
}

export function partsOwnedCount() {
  const parts = s().parts;
  return Object.keys(parts).filter((id) => parts[id] > 0).length;
}

export function get() {
  const st = s();
  return {
    ...st.stats,
    bestDepth: st.bestDepth,
    goldThisCollapse: st.goldThisCollapse,
    coreDustTotal: st.coreDustTotal,
    partsOwned: partsOwnedCount(),
    crewOwned: totalOwned(),
    crewTypes: CREW.length,
    cheated: st.cheated,
  };
}
