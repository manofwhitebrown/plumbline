// Daily Dive: one fixed Drop per day, same for everyone that day. Numbers only.
export const DIVE_MIN_DROPS = 3;          // finish this many normal Drops before the Dive opens
export const DIVE_SEED_SALT = 0x0d17e5ed; // mixed with the date; changing it changes every day's Drop
export const DIVE_STALE_MS = 30 * 60 * 1000; // a Dive "in progress" this old is treated as over

// Reward chest, paid once after the Dive. Bounded: it can never grow past the caps.
export const DIVE_CHEST = {
  shardsBase: 6,          // plus 1 per 60 m of Depth, plus the streak bonus
  shardsPerMetres: 60,
  streakBonusMax: 7,      // +1 Shard per streak day, up to this
  shardsCap: 40,
  goldMinutesBase: 10,    // minutes of Crew income, plus 1 per 20 m
  goldMinutesPerMetres: 20,
  goldMinutesCap: 60,
  goldFloor: 200,
};

// Chest size names by Depth reached (plain words).
export const DIVE_CHEST_NAMES = [
  { from: 0, name: 'Small chest' },
  { from: 150, name: 'Good chest' },
  { from: 400, name: 'Rich chest' },
];

// Plain lines for the Rewards card (max 60 characters each).
export const DIVE_TEXT = {
  title: 'Daily Dive',
  ready: 'One free try. Same Drop for everyone today.',
  tried: 'Done for today. A new Dive comes tomorrow.',
  running: 'Your Dive is going.',
  locked: 'Finish 3 Drops to unlock.',
  chest: 'Your chest is ready.',
  chestDone: 'Chest opened.',
};
