// The first hour (docs/design/FIRST_HOUR.md). What a new player's first drops teach, in order.
// `drops` = how many drops the player has finished (the tutorial drop counts). Pure: returns play options for createRun.
import { mercyOptions } from './mercy.js';
import { FIRST_HOUR } from '../../data/play.js';

export function firstHourOptions(drops) {
  const n = Math.max(0, Math.floor(Number(drops) || 0));
  for (const step of FIRST_HOUR.steps) if (n < step.until) return { ...step.opts };
  return {};
}

// Everything a new drop needs: the first-hour script, then mercy on top (mercy wins where both set a number).
export function startOptions(drops, snapStreak) {
  return { ...firstHourOptions(drops), ...mercyOptions(snapStreak) };
}
