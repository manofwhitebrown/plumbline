// Crew numbers. Data only, no logic.
export const CREW_GROWTH = 1.15;                    // each owned crew member makes the next cost 15% more
export const CREW_MILESTONES = [10, 25, 50, 100, 200, 300]; // each one doubles that crew's output

export const CREW = [
  { id: 'winch',   name: 'Winch Hand',    desc: 'Turns the winch and hauls up loose gold.',   baseCost: 50,       baseGps: 1,     unlockDepth: 0 },
  { id: 'smithy',  name: 'Smithy',        desc: 'Melts rough ore into clean gold bars.',      baseCost: 500,      baseGps: 4,     unlockDepth: 50 },
  { id: 'cart',    name: 'Cart Line',     desc: 'Carts gold from the well mouth to town.',    baseCost: 6000,     baseGps: 16,    unlockDepth: 150 },
  { id: 'lamp',    name: 'Lamp Hall',     desc: 'Lamps in the dark show where gems hide.',    baseCost: 70000,    baseGps: 80,   unlockDepth: 250 },
  { id: 'assay',   name: 'Assay Office',  desc: 'Finds the true worth of every gem.',         baseCost: 1000000,  baseGps: 400,  unlockDepth: 400 },
  { id: 'foundry', name: 'Deep Foundry',  desc: 'A great furnace that never goes cold.',      baseCost: 15000000, baseGps: 2000, unlockDepth: 600 },
];

// A manager triples one crew's output. Bought once with Gold.
export const MANAGER = { costMult: 150, minOwned: 10, outputMult: 3 };

// Away income
export const OFFLINE = {
  baseCapMs: 8 * 3600 * 1000,   // 8 hours
  efficiency: 0.6,              // 60% of normal income
  minAwayMs: 60 * 1000,         // under one minute is ignored
  maxEfficiency: 0.95,
};
