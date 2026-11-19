// PLAY: switches and small numbers for the drop's active-play layer (boons, skills, encounters, guardians).
// A run only uses this layer when createRun gets a `play` option. Old callers see no change.
export const PLAY_DEFAULTS = Object.freeze({
  boons: true,
  abilities: Object.freeze(['brace', 'surge']), // which skills are unlocked
  encounters: true,
  guardians: true,
  relics: true,                 // relic items and rewards roll a named relic
  firstOfferDepth: null,        // set a number (e.g. 40) to give an early first boon pick
  freeBrace: 0,                 // extra Brace charges to start with (mercy after snaps)
  snapLuck: 0,                  // better gems for the first metres (set after a snap)
  noJump: true,                 // one step can never snap a rope that was below 80%
});

// Fairness (docs/design/FIRST_HOUR.md). Early on, the same column never gets a third danger in a row.
export const FAIRNESS = Object.freeze({
  maxDangerStreak: 2,
  streakUntilDepth: 300,        // the limit applies above this depth only up to here
  snapLuckMetres: 30,           // how far the snap luck lasts
  snapLuckAmount: 0.25,
  mercyAfterSnaps: 3,           // this many snaps in a row give a free Brace
  noJumpFrom: 0.8,
  noJumpCap: 0.97,
  secondWindStrain: 0.1,
});
