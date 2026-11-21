// Mastery: a Part gets better the more you use it. Numbers only, no logic.
// ECONOMY-2: tune these. Every cap below keeps Mastery a small bonus, never the main income.

export const MASTERY_MAX = 5;

// Total uses needed to reach level 1, 2, 3, 4, 5.
// A use is one thing the Part grabbed, or one time it joined a chain.
export const MASTERY_USES = [20, 80, 250, 700, 1600];

// Gold from that Part's grabs, per level (a fraction: 0.03 is +3%).
export const MASTERY_GOLD_PER_LEVEL = 0.03;

// Level 5 only: share of the Gold lost to a Snap that this Part wins back (per Part).
export const MASTERY_SNAP_SAVE_L5 = 0.03;

// Safety caps for one Drop.
export const MASTERY_BONUS_CAP = 0.15;      // total bonus never above 15% of the Gold collected
export const MASTERY_SNAP_SAVE_CAP = 0.09;  // never wins back more than 9% of what a Snap cost
export const MASTERY_USES_PER_DROP = 400;   // one Part counts at most this many uses in one Drop
export const MASTERY_RECENT_MAX = 4;        // level-ups remembered for the Rewards screen

// Plain sentences (max 90 characters each). {n} is the level.
export const MASTERY_TEXT = {
  base: 'Mastery {n} of 5: +{g}% Gold from this Part.',
  top: 'Mastery 5 of 5: +{g}% Gold from this Part, and a Snap costs less.',
  none: 'Mastery 0 of 5: use this Part to make it better.',
};
