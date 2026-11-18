// All numbers and words for the parts. No logic here.
// Unlock rules:
//   start = owned from the first Drop
//   gold  = shows up after this much total Gold earned
//   depth = shows up after reaching this Depth (best Depth, in metres)
//   codex = shows up after discovering this Combo (value is a combo id)
// "cost" is the Gold price to buy the part once. Parts are then owned for good.

// Each gem tier is worth this many times the tier below it.
export const TIER_MULT = 3;

export const FAMILIES = ['collector', 'processor', 'defense', 'engine', 'special'];

export const PART_DATA = {
  // ---------- Collectors ----------
  hook: {
    name: 'Hook', family: 'collector', tags: ['starter', 'grab'],
    desc: 'Grabs the gem or ore passing its column.',
    cost: 0, unlock: { type: 'start', value: 0 }, tune: {},
  },
  magnet: {
    name: 'Magnet', family: 'collector', tags: ['grab', 'ore', 'wide'],
    desc: 'Grabs ore in its column and both side columns.',
    cost: 40, unlock: { type: 'gold', value: 10 }, tune: {},
  },
  net: {
    name: 'Net', family: 'collector', tags: ['grab', 'gem', 'wide'],
    desc: 'Grabs gems in its column and the right column (right pays 75%).',
    cost: 260, unlock: { type: 'gold', value: 200 }, tune: { neighborPay: 0.75 },
  },
  vacuum: {
    name: 'Vacuum', family: 'collector', tags: ['grab', 'greedy', 'strain'],
    desc: 'Grabs everything except dangers in its column. Adds a little Strain.',
    cost: 9800, unlock: { type: 'gold', value: 9000 }, tune: { strain: 1 },
  },
  // ---------- Processors ----------
  polisher: {
    name: 'Polisher', family: 'processor', tags: ['tier', 'gem'],
    desc: 'Makes a passing gem one tier better.',
    cost: 70, unlock: { type: 'gold', value: 40 }, tune: { tierUp: 1 },
  },
  multiplier: {
    name: 'Multiplier', family: 'processor', tags: ['value'],
    desc: 'Doubles the value of what passes through.',
    cost: 400, unlock: { type: 'gold', value: 380 }, tune: { factors: [2, 3] },
  },
  smelter: {
    name: 'Smelter', family: 'processor', tags: ['ore', 'gem', 'tier'],
    desc: 'Turns ore into a tier 1 gem, worth a little more.',
    cost: 1900, unlock: { type: 'gold', value: 1800 }, tune: { toTier: 1, valueBoost: 1.25 },
  },
  splitter: {
    name: 'Splitter', family: 'processor', tags: ['copy', 'wide'],
    desc: 'Copies what passes into both side columns at half value.',
    cost: 2700, unlock: { type: 'codex', value: 'gem_press' }, tune: { share: 0.5 },
  },
  amplifier: {
    name: 'Amplifier', family: 'processor', tags: ['value', 'chain'],
    desc: 'Adds 25% value for each Part that already worked this step.',
    cost: 13000, unlock: { type: 'codex', value: 'wide_net' }, tune: { perFire: 0.25, maxFires: 8 },
  },
  gilder: {
    name: 'Gilder', family: 'processor', tags: ['value', 'count'],
    desc: 'Every 5th thing passing through is worth double.',
    cost: 18000, unlock: { type: 'gold', value: 17000 }, tune: { every: 5, factor: 2 },
  },
  prism: {
    name: 'Prism', family: 'processor', tags: ['gem', 'pair', 'shimmer'],
    desc: 'A tier 3+ gem shimmers for double when a Prism beside it also worked.',
    cost: 25000, unlock: { type: 'depth', value: 350 }, tune: { minTier: 3, factor: 2 },
  },
  // ---------- Defense ----------
  plate: {
    name: 'Plate', family: 'defense', tags: ['block', 'cooldown'],
    desc: 'Blocks the first danger in its column, then rests for 5 steps.',
    cost: 110, unlock: { type: 'gold', value: 90 }, tune: { cooldown: 5 },
  },
  oilcan: {
    name: 'Oil Can', family: 'defense', tags: ['strain', 'steady'],
    desc: 'Lowers Strain a little every step.',
    cost: 170, unlock: { type: 'depth', value: 70 }, tune: { strain: 0.5 },
  },
  spikeguard: {
    name: 'Spike Guard', family: 'defense', tags: ['danger', 'ore'],
    desc: 'Turns dangers in its column into ore.',
    cost: 900, unlock: { type: 'gold', value: 800 }, tune: { oreValue: 1 },
  },
  cooler: {
    name: 'Cooler', family: 'defense', tags: ['strain', 'gem'],
    desc: 'Lowers Strain by 2 when a gem is grabbed in its column.',
    cost: 1300, unlock: { type: 'depth', value: 140 }, tune: { strain: 2 },
  },
  shield: {
    name: 'Shield', family: 'defense', tags: ['block', 'area'],
    desc: 'Blocks dangers in a 3x3 area. 3 charges per Drop.',
    cost: 3800, unlock: { type: 'gold', value: 3500 }, tune: { charges: 3 },
  },
  sparerope: {
    name: 'Spare Rope', family: 'defense', tags: ['strain', 'rope'],
    desc: '+20 max Strain. Only one counts.',
    cost: 5200, unlock: { type: 'depth', value: 200 }, tune: { extra: 20 },
  },
  // ---------- Engines ----------
  anchor: {
    name: 'Anchor', family: 'engine', tags: ['slow', 'strain', 'steady'],
    desc: 'Dive slower (0.3 m less a step) and lower Strain.',
    cost: 600, unlock: { type: 'depth', value: 110 }, tune: { speed: 0.3, strain: 0.25 },
  },
  drill: {
    name: 'Drill', family: 'engine', tags: ['fast', 'strain', 'greedy'],
    desc: 'Dive faster (+1 m a step) but adds Strain.',
    cost: 7200, unlock: { type: 'depth', value: 260 }, tune: { speed: 1, strain: 0.5 },
  },
  metronome: {
    name: 'Metronome', family: 'engine', tags: ['timing', 'double'],
    desc: 'Every 4th step, Parts that change gems in its row work twice.',
    cost: 34000, unlock: { type: 'codex', value: 'drill_rush' }, tune: { every: 4 },
  },
  battery: {
    name: 'Battery', family: 'engine', tags: ['store', 'burst'],
    desc: 'Stores power for each grab. At 10, the next grab pays double.',
    cost: 46000, unlock: { type: 'depth', value: 480 }, tune: { need: 10, factor: 2 },
  },
  // ---------- Specials ----------
  echo: {
    name: 'Echo', family: 'special', tags: ['repeat', 'value'],
    desc: 'Repeats your last grab at half value.',
    cost: 62000, unlock: { type: 'codex', value: 'gilded_press' }, tune: { share: 0.5 },
  },
  compass: {
    name: 'Compass', family: 'special', tags: ['rare', 'luck'],
    desc: 'Rare finds appear twice as often.',
    cost: 85000, unlock: { type: 'depth', value: 600 }, tune: { rareMult: 2 },
  },
  jackpot: {
    name: 'Jackpot Chest', family: 'special', tags: ['relic', 'grab'],
    desc: 'Grabs relics in its column.',
    cost: 115000, unlock: { type: 'gold', value: 100000 }, tune: {},
  },
  fuse: {
    name: 'Fuse', family: 'special', tags: ['danger', 'blast', 'chain'],
    desc: 'When a danger hits in its column, nearby dangers blow up for Gold.',
    cost: 155000, unlock: { type: 'gold', value: 150000 }, tune: { bonusValue: 6 },
  },
  lantern: {
    name: 'Lantern', family: 'special', tags: ['peek', 'relic'],
    desc: 'Shows the next 2 steps in its column. Relics appear more.',
    cost: 210000, unlock: { type: 'codex', value: 'safe_dive' }, tune: { peek: 2, relicBonus: 0.1 },
  },
};

// Named combos. Detection rules live in src/engine/parts/combos.js.
export const COMBO_DATA = {
  gem_press: {
    name: 'Gem Press', tags: ['ore', 'tier', 'column'],
    desc: 'Smelter, Polisher, Multiplier in one column (bottom to top). Ore leaves as rich gems.',
  },
  wide_net: {
    name: 'Wide Net', tags: ['wide', 'copy'],
    desc: 'A Splitter with a Net on each side in its row. Every gem is grabbed in three columns.',
  },
  safe_dive: {
    name: 'Safe Dive', tags: ['steady', 'strain'],
    desc: 'Shield, Oil Can and Anchor together. Slow, deep and steady.',
  },
  drill_rush: {
    name: 'Drill Rush', tags: ['fast', 'greedy'],
    desc: 'Drill, Cooler and Plate together. Fast and greedy, with a little cover.',
  },
  echo_chamber: {
    name: 'Echo Chamber', tags: ['repeat', 'value'],
    desc: 'An Echo in or beside a column that holds a Multiplier. Big grabs ring twice.',
  },
  prism_pair: {
    name: 'Prism Pair', tags: ['shimmer', 'pair'],
    desc: 'Two Prisms side by side or one above the other. High tier gems shimmer.',
  },
  battery_burst: {
    name: 'Battery Burst', tags: ['store', 'burst'],
    desc: 'A Battery with 3 or more grabbing Parts. It fills fast and pays double often.',
  },
  metronome_mill: {
    name: 'Metronome Mill', tags: ['timing', 'double'],
    desc: 'A Metronome with 2 or more changing Parts in its row. They work twice every 4th step.',
  },
  lantern_scout: {
    name: 'Lantern Scout', tags: ['peek', 'rare'],
    desc: 'Lantern and Compass together. See what comes and find rare things more.',
  },
  relic_hunter: {
    name: 'Relic Hunter', tags: ['relic', 'rare'],
    desc: 'A Jackpot Chest right beside a Compass. Relics turn up and get grabbed.',
  },
  fuse_chain: {
    name: 'Fuse Chain', tags: ['blast', 'chain'],
    desc: 'Two Fuses in neighbouring columns. One blast sets off the next.',
  },
  gilded_press: {
    name: 'Gilded Press', tags: ['value', 'column'],
    desc: 'A Gilder and a Multiplier in the same column. Every 5th gem pays a lot.',
  },
  loud_chain: {
    name: 'Loud Chain', tags: ['chain', 'value'],
    desc: 'An Amplifier above 2 or more changing Parts in its column. Each one makes it louder.',
  },
  rock_alchemist: {
    name: 'Rock Alchemist', tags: ['danger', 'ore', 'column'],
    desc: 'Spike Guard, then Smelter, then Polisher in one column. Dangers become gems.',
  },
  cool_sweep: {
    name: 'Cool Sweep', tags: ['strain', 'greedy'],
    desc: 'A Vacuum and a Cooler in the same column. It grabs a lot and cools the rope.',
  },
  iron_wall: {
    name: 'Iron Wall', tags: ['block', 'defense'],
    desc: 'Plate, Shield and Spike Guard together. Very few dangers get through.',
  },
  long_rope: {
    name: 'Long Rope', tags: ['strain', 'steady'],
    desc: 'Spare Rope, Oil Can and Cooler together. A rope that lasts and lasts.',
  },
};
