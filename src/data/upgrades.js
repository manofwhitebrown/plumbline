// Permanent upgrade numbers. Data only.
// currency: 'gold' | 'shards' | 'core'.  Cost of the next level = base * growth^level (rounded up).
// effect: what one level gives. gate: needs this much best Depth before it shows as buyable.
export const UPGRADES = [
  { id: 'rope',     name: 'Stronger Rope',   desc: 'More room for Strain before the rope Snaps.',     currency: 'gold',   max: 20, base: 70,    growth: 2.6, per: 45,   unit: 'max Strain',      gate: 0 },
  { id: 'grease',   name: 'Better Grease',   desc: 'Strain builds up more slowly as you go down.',    currency: 'gold',   max: 8,  base: 150,   growth: 2.3, per: 4,    unit: '% less Strain',   gate: 0 },
  { id: 'mender',   name: 'Rope Mender',     desc: 'Keep more Gold when the rope Snaps.',             currency: 'gold',   max: 6,  base: 200,   growth: 2.5, per: 5,    unit: '% kept on Snap',  gate: 50 },
  { id: 'bucket',   name: 'Bigger Bucket',   desc: 'Adds room for more Parts. First a column, then a row.', currency: 'gold', max: 2, base: 800, growth: 40, per: 1,   unit: 'size step',       gate: 50 },
  { id: 'lantern',  name: 'Lucky Lantern',   desc: 'Better gems show up more often.',                 currency: 'gold',   max: 10, base: 250,   growth: 2.0, per: 3,    unit: '% luck',          gate: 50 },
  { id: 'tools',    name: 'Sharper Tools',   desc: 'Your Crew earns more Gold every second.',         currency: 'gold',   max: 10, base: 400,   growth: 2.1, per: 10,   unit: '% Crew Gold',     gate: 0 },
  { id: 'vault',    name: 'Vault',           desc: 'Your Crew keeps working longer while you are away.', currency: 'gold', max: 8, base: 2000,  growth: 2.6, per: 1,    unit: 'hour away cap',   gate: 100 },
  { id: 'deepstart',name: 'Deep Start',      desc: 'Every Drop begins deeper down.',                  currency: 'shards', max: 10, base: 20,    growth: 1.8, per: 15,   unit: 'm start Depth',   gate: 150 },
  { id: 'extra_copy', name: 'Extra Copy',    desc: 'You may own a second copy of every Part.',        currency: 'shards', max: 1,  base: 150,   growth: 1,   per: 1,    unit: 'extra copy',      gate: 200 },
  { id: 'loadouts', name: 'Loadout Slots',   desc: 'Save more Rig Loadouts.',                         currency: 'shards', max: 3,  base: 25,    growth: 2.0, per: 1,    unit: 'Loadout slot',    gate: 0 },
  { id: 'autohaul', name: 'Auto-Haul Assist',desc: 'Haul Up by itself at a Strain level you choose.', currency: 'shards', max: 1,  base: 60,    growth: 1,   per: 1,    unit: 'safety net',      gate: 100 },

  // Core Dust upgrades. They stay after a Collapse.
  { id: 'cd_start',  name: 'Old Friends',     desc: 'Start every new run with a Hook and a Magnet.',   currency: 'core',   max: 1,  base: 2,     growth: 1,   per: 1,    unit: 'free Parts',      gate: 0 },
  { id: 'cd_crew',   name: 'Crew Memory',     desc: 'Keep some Crew members after a Collapse.',        currency: 'core',   max: 5,  base: 3,     growth: 1.8, per: 2,    unit: 'Crew kept each',  gate: 0 },
  { id: 'cd_offline',name: 'Night Shift',     desc: 'Your Crew earns more while you are away.',        currency: 'core',   max: 5,  base: 2,     growth: 1.7, per: 5,    unit: '% away income',   gate: 0 },
  { id: 'cd_snap',   name: 'Strong Knots',    desc: 'Keep even more Gold when the rope Snaps.',        currency: 'core',   max: 3,  base: 4,     growth: 2.0, per: 5,    unit: '% kept on Snap',  gate: 0 },
  { id: 'cd_dust',   name: 'Dust Sense',      desc: 'Each Collapse gives more Core Dust.',             currency: 'core',   max: 5,  base: 5,     growth: 2.0, per: 10,   unit: '% more Core Dust',gate: 0 },
];

export const LIMITS = {
  baseMaxStrain: 100,
  baseKeepOnSnap: 0.30,
  maxKeepOnSnap: 0.60,
  minStrainMult: 0.4,
  baseLoadoutSlots: 3,
  coreDustGoldEach: 0.10,      // each Core Dust earned = +10% Gold
  bigNumber: 1e300,
};

export const COLLAPSE = {
  minBestDepth: 500,
  minGold: 2e7,
  depthDivisor: 1000,
  goldDivisor: 1e7,
};
