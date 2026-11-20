// Numbers for the chase pills, the ghost of your best drop, and the near-miss lines. (HOOK-1 wave 2, item 5)
export const CHASE = {
  ghostStep: 10,       // metres between ghost samples
  ghostMax: 400,       // samples kept (4000 m). Deeper than that the ghost is simply over.
  ghostFrom: 30,       // do not show the ghost pill before this depth (too noisy)
  levelWithin: 5,      // a Gold gap smaller than this reads as level
  nearMissMin: 12,     // a drop this close (metres) to your best always counts as close
  nearMissPct: 0.08,   // or this share of your best, whichever is bigger
  nearMissMax: 40,     // but never more than this many metres
  nearBiome: 15,       // close to the next Biome
  pillMax: 3,          // the HUD never shows more than this many pills
  tipMinGold: 1,       // do not show a tip that would have saved less than this much Gold
};

// Plain words only (docs/WORDS.md). {n} is filled in by the code.
export const CHASE_TEXT = {
  toBest: '{n} m to your best',
  newBest: 'New best!',
  nextBiome: '{n} m to the next Biome',
  ghostAhead: '{n} Gold ahead of your best',
  ghostBehind: '{n} Gold behind your best',
  ghostLevel: 'Level with your best',
  goals: 'Goals {done}/{total}',
  nearBest: 'Only {n} m from your best!',
  nearBiome: 'Only {n} m from the next Biome!',
  tip: '{name} would have kept you {n} more Gold.',
  tipBuy: 'You can buy it now.',
};
