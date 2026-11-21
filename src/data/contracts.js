// Contracts: 3 at a time, picked from these templates. Numbers and plain words only.
// text: max 28 characters (the goal-text limit). Words come from docs/WORDS.md.
// scope 'drop' = checked against the best single Drop. scope 'sum' = adds up over many Drops.
// stat names: gems, ore, relics, chains, blocked, combo (best Combo), depth, haulDepth (Depth of a Haul Up),
//   combos (different Combos in the Rig), parts (different Parts in the Rig), drops, hauls.
// reward: { shards } or { goldMinutes, goldFloor } (minutes of Crew income, with a small floor).
// minBest: needs this much best Depth before it can be offered.
export const CONTRACTS_ACTIVE = 3;
export const CONTRACT_TEXT_MAX = 28;
export const CONTRACT_PARAM_MAX = 1e9; // progress never goes above this

export const CONTRACTS = [
  { id: 'c_gems20',   text: 'Collect 20 gems in one Drop',   scope: 'drop', stat: 'gems',     target: 20,  minBest: 0,   reward: { shards: 6 } },
  { id: 'c_gems45',   text: 'Collect 45 gems in one Drop',   scope: 'drop', stat: 'gems',     target: 45,  minBest: 150, reward: { shards: 12 } },
  { id: 'c_ore15',    text: 'Collect 15 ore in one Drop',    scope: 'drop', stat: 'ore',      target: 15,  minBest: 0,   reward: { goldMinutes: 8, goldFloor: 150 } },
  { id: 'c_relic2',   text: 'Find 2 relics in one Drop',     scope: 'drop', stat: 'relics',   target: 2,   minBest: 150, reward: { shards: 14 } },
  { id: 'c_haul150',  text: 'Haul Up above 150 m',           scope: 'drop', stat: 'haulDepth', target: 150, minBest: 0,  reward: { shards: 6 } },
  { id: 'c_haul300',  text: 'Haul Up above 300 m',           scope: 'drop', stat: 'haulDepth', target: 300, minBest: 200, reward: { shards: 10 } },
  { id: 'c_haul600',  text: 'Haul Up above 600 m',           scope: 'drop', stat: 'haulDepth', target: 600, minBest: 450, reward: { shards: 18 } },
  { id: 'c_depth250', text: 'Reach 250 m in one Drop',       scope: 'drop', stat: 'depth',    target: 250, minBest: 100, reward: { goldMinutes: 15, goldFloor: 300 } },
  { id: 'c_combos2',  text: 'Use 2 different Combos',        scope: 'drop', stat: 'combos',   target: 2,   minBest: 60,  reward: { shards: 6 } },
  { id: 'c_combos3',  text: 'Use 3 different Combos',        scope: 'drop', stat: 'combos',   target: 3,   minBest: 200, reward: { shards: 10 } },
  { id: 'c_parts4',   text: 'Use 4 different Parts',         scope: 'drop', stat: 'parts',    target: 4,   minBest: 100, reward: { goldMinutes: 10, goldFloor: 200 } },
  { id: 'c_chains30', text: 'Set off 30 chains in a Drop',   scope: 'drop', stat: 'chains',   target: 30,  minBest: 100, reward: { shards: 8 } },
  { id: 'c_combo12',  text: 'Reach a Combo of 12',           scope: 'drop', stat: 'combo',    target: 12,  minBest: 0,   reward: { shards: 6 } },
  { id: 'c_combo25',  text: 'Reach a Combo of 25',           scope: 'drop', stat: 'combo',    target: 25,  minBest: 200, reward: { shards: 12 } },
  { id: 'c_block5',   text: 'Stop 5 dangers in one Drop',    scope: 'drop', stat: 'blocked',  target: 5,   minBest: 0,   reward: { shards: 6 } },
  { id: 'c_drops4',   text: 'Finish 4 Drops',                scope: 'sum',  stat: 'drops',    target: 4,   minBest: 0,   reward: { goldMinutes: 10, goldFloor: 200 } },
  { id: 'c_hauls3',   text: 'Haul Up 3 times',               scope: 'sum',  stat: 'hauls',    target: 3,   minBest: 0,   reward: { shards: 7 } },
  { id: 'c_gems100',  text: 'Collect 100 gems in total',     scope: 'sum',  stat: 'gems',     target: 100, minBest: 0,   reward: { shards: 8 } },
  { id: 'c_ore60',    text: 'Collect 60 ore in total',       scope: 'sum',  stat: 'ore',      target: 60,  minBest: 0,   reward: { goldMinutes: 12, goldFloor: 250 } },
  { id: 'c_relics5',  text: 'Find 5 relics in total',        scope: 'sum',  stat: 'relics',   target: 5,   minBest: 150, reward: { shards: 15 } },
  { id: 'c_block15',  text: 'Stop 15 dangers in total',      scope: 'sum',  stat: 'blocked',  target: 15,  minBest: 0,   reward: { shards: 8 } },
];

export const CONTRACT_SHARD_CAP = 25; // a single contract never pays more shards than this
