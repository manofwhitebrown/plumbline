// Mercy after bad luck (docs/design/FIRST_HOUR.md). Pure helpers: the session keeps the count, this decides what it earns.
import { FAIRNESS } from '../../data/play.js';

// Snaps in a row after one more drop ended. A Haul Up (or anything that is not a snap) starts the count over.
export function nextSnapStreak(streak, outcome) {
  const s = Math.max(0, Math.floor(Number(streak) || 0));
  if (outcome === 'snapped') return Math.min(99, s + 1);
  if (outcome === 'hauled') return 0;
  return s;
}

// Play options a new drop gets: a free Brace and better gems for the first metres once the streak is long enough.
export function mercyOptions(streak) {
  const s = Math.max(0, Math.floor(Number(streak) || 0));
  if (s >= FAIRNESS.mercyAfterSnaps) return { freeBrace: 1, snapLuck: 1 };
  return {};
}
