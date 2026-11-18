// Gold maths. One place for every formula about gold.
import { ENGINE } from '../data/engine.js';
import { fin, clamp } from './safe.js';

export function depthBonus(depth) {
  return 1 + Math.max(0, fin(depth, 0, 'depth')) / ENGINE.depthBonusDiv;
}

// combo 1 = x1.0, combo 2 = x1.1 ... combo 11 and up = x2.0
export function comboMult(combo) {
  const steps = clamp(fin(combo, 0, 'combo') - 1, 0, ENGINE.comboCap);
  return 1 + ENGINE.comboStep * steps;
}

// Gold for one collected item. Whole number, at least 1 when the item is worth anything.
export function itemGold(value, combo, goldMult, depth, factor = 1) {
  const v = fin(value, 0, 'item value');
  if (v <= 0) return 0;
  const raw = v * fin(factor, 1, 'factor') * comboMult(combo) * fin(goldMult, 1, 'goldMult') * depthBonus(depth);
  const g = Math.round(fin(raw, 0, 'gold'));
  return g < 1 ? 1 : g;
}

// What the player keeps after a snap.
export function snapPayout(gold, keepOnSnap) {
  const g = Math.max(0, Math.floor(fin(gold, 0, 'gold')));
  const kept = Math.floor(g * clamp(fin(keepOnSnap, 0.3, 'keepOnSnap'), 0, 1));
  return { goldKept: kept, goldLost: g - kept };
}
