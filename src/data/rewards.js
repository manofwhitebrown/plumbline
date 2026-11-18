// Rewards: daily streak, quests, achievements. Data only.

// 7-day streak. gold = minutes of Crew income (with a small floor).
export const DAILY = [
  { shards: 5,  goldMinutes: 5,  goldFloor: 100 },
  { shards: 8,  goldMinutes: 10, goldFloor: 200 },
  { shards: 10, goldMinutes: 15, goldFloor: 300 },
  { shards: 12, goldMinutes: 20, goldFloor: 400 },
  { shards: 15, goldMinutes: 30, goldFloor: 600 },
  { shards: 20, goldMinutes: 45, goldFloor: 900 },
  { shards: 50, goldMinutes: 90, goldFloor: 2000 },
];

// Quests. kind 'sum' adds up over the day. kind 'best' keeps the highest single value.
// minBest = needs this much best Depth to be offered.
export const QUESTS = [
  { id: 'q_gems25',   text: 'Collect 25 gems',                 stat: 'gems',     kind: 'sum',  target: 25,   shards: 6,  minBest: 0 },
  { id: 'q_gems80',   text: 'Collect 80 gems',                 stat: 'gems',     kind: 'sum',  target: 80,   shards: 10, minBest: 150 },
  { id: 'q_ore20',    text: 'Collect 20 ore',                  stat: 'ore',      kind: 'sum',  target: 20,   shards: 6,  minBest: 0 },
  { id: 'q_depth100', text: 'Reach 100 m Depth in one Drop',   stat: 'depth',    kind: 'best', target: 100,  shards: 6,  minBest: 0 },
  { id: 'q_depth250', text: 'Reach 250 m Depth in one Drop',   stat: 'depth',    kind: 'best', target: 250,  shards: 10, minBest: 200 },
  { id: 'q_depth500', text: 'Reach 500 m Depth in one Drop',   stat: 'depth',    kind: 'best', target: 500,  shards: 14, minBest: 400 },
  { id: 'q_drops5',   text: 'Finish 5 Drops',                  stat: 'drops',    kind: 'sum',  target: 5,    shards: 6,  minBest: 0 },
  { id: 'q_hauls3',   text: 'Haul Up 3 times',                 stat: 'hauls',    kind: 'sum',  target: 3,    shards: 6,  minBest: 0 },
  { id: 'q_combo10',  text: 'Reach a Combo of 10',             stat: 'combo',    kind: 'best', target: 10,   shards: 6,  minBest: 0 },
  { id: 'q_combo25',  text: 'Reach a Combo of 25',             stat: 'combo',    kind: 'best', target: 25,   shards: 10, minBest: 150 },
  { id: 'q_chains20', text: 'Set off 20 chains',               stat: 'chains',   kind: 'sum',  target: 20,   shards: 6,  minBest: 0 },
  { id: 'q_block5',   text: 'Block 5 hazards',                 stat: 'blocked',  kind: 'sum',  target: 5,    shards: 6,  minBest: 0 },
  { id: 'q_crew5',    text: 'Hire 5 Crew levels',              stat: 'crewBought', kind: 'sum', target: 5,   shards: 6,  minBest: 0 },
  { id: 'q_part1',    text: 'Buy a new Part in the Workshop',  stat: 'partsBought', kind: 'sum', target: 1,  shards: 8,  minBest: 0 },
  { id: 'q_gold5k',   text: 'Earn 5K Gold',                    stat: 'goldEarned', kind: 'sum', target: 5000, shards: 6, minBest: 0 },
  { id: 'q_gold1m',   text: 'Earn 1M Gold',                    stat: 'goldEarned', kind: 'sum', target: 1e6, shards: 12, minBest: 300 },
  { id: 'q_relic1',   text: 'Find a relic',                    stat: 'relics',   kind: 'sum',  target: 1,    shards: 8,  minBest: 100 },
];
export const QUESTS_PER_DAY = 3;

// 30 achievements. stat names are read from meta.stats.get().
export const ACHIEVEMENTS = [
  { id: 'a_depth100',  name: 'First Hundred',   desc: 'Reach 100 m Depth.',            stat: 'bestDepth', gte: 100,  shards: 5 },
  { id: 'a_depth250',  name: 'Quartz Country',  desc: 'Reach 250 m Depth.',            stat: 'bestDepth', gte: 250,  shards: 10 },
  { id: 'a_depth500',  name: 'Halfway to Deep', desc: 'Reach 500 m Depth.',            stat: 'bestDepth', gte: 500,  shards: 20 },
  { id: 'a_depth750',  name: 'Into the Void',   desc: 'Reach 750 m Depth.',            stat: 'bestDepth', gte: 750,  shards: 30 },
  { id: 'a_depth1000', name: 'The Abyss',       desc: 'Reach 1000 m Depth.',           stat: 'bestDepth', gte: 1000, shards: 50 },
  { id: 'a_depth1500', name: 'No Bottom',       desc: 'Reach 1500 m Depth.',           stat: 'bestDepth', gte: 1500, shards: 80 },
  { id: 'a_gold1k',    name: 'Pocket Change',   desc: 'Earn 1K Gold in total.',        stat: 'goldEarned', gte: 1e3, shards: 3 },
  { id: 'a_gold100k',  name: 'Heavy Purse',     desc: 'Earn 100K Gold in total.',      stat: 'goldEarned', gte: 1e5, shards: 10 },
  { id: 'a_gold10m',   name: 'Gold Hoard',      desc: 'Earn 10M Gold in total.',       stat: 'goldEarned', gte: 1e7, shards: 25 },
  { id: 'a_gold1b',    name: 'Dragon Money',    desc: 'Earn 1B Gold in total.',        stat: 'goldEarned', gte: 1e9, shards: 60 },
  { id: 'a_combo5',    name: 'Warming Up',      desc: 'Reach a Combo of 5.',           stat: 'maxCombo', gte: 5,    shards: 3 },
  { id: 'a_combo15',   name: 'On a Roll',       desc: 'Reach a Combo of 15.',          stat: 'maxCombo', gte: 15,   shards: 10 },
  { id: 'a_combo30',   name: 'Unstoppable',     desc: 'Reach a Combo of 30.',          stat: 'maxCombo', gte: 30,   shards: 25 },
  { id: 'a_parts3',    name: 'Tinkerer',        desc: 'Own 3 different Parts.',        stat: 'partsOwned', gte: 3,  shards: 5 },
  { id: 'a_parts8',    name: 'Gear Head',       desc: 'Own 8 different Parts.',        stat: 'partsOwned', gte: 8,  shards: 12 },
  { id: 'a_parts16',   name: 'Workshop Master', desc: 'Own 16 different Parts.',       stat: 'partsOwned', gte: 16, shards: 25 },
  { id: 'a_parts24',   name: 'Full Set',        desc: 'Own all 24 Parts.',             stat: 'partsOwned', gte: 24, shards: 50 },
  { id: 'a_collapse1', name: 'Fresh Start',     desc: 'Collapse once.',                stat: 'collapses', gte: 1,   shards: 25 },
  { id: 'a_collapse5', name: 'Seasoned',        desc: 'Collapse 5 times.',             stat: 'collapses', gte: 5,   shards: 50 },
  { id: 'a_collapse10',name: 'Cycle Keeper',    desc: 'Collapse 10 times.',            stat: 'collapses', gte: 10,  shards: 90 },
  { id: 'a_snap1',     name: 'Twang',           desc: 'Snap the rope once.',           stat: 'snaps', gte: 1,       shards: 3 },
  { id: 'a_snap10',    name: 'Rope Seller\'s Friend', desc: 'Snap the rope 10 times.', stat: 'snaps', gte: 10,      shards: 8 },
  { id: 'a_snap50',    name: 'Never Learns',    desc: 'Snap the rope 50 times.',       stat: 'snaps', gte: 50,      shards: 20 },
  { id: 'a_haul1',     name: 'Safe and Sound',  desc: 'Haul Up once.',                 stat: 'hauls', gte: 1,       shards: 3 },
  { id: 'a_haul25',    name: 'Steady Hands',    desc: 'Haul Up 25 times.',             stat: 'hauls', gte: 25,      shards: 10 },
  { id: 'a_haul100',   name: 'Old Hand',        desc: 'Haul Up 100 times.',            stat: 'hauls', gte: 100,     shards: 30 },
  { id: 'a_drops10',   name: 'Getting Started', desc: 'Finish 10 Drops.',              stat: 'drops', gte: 10,      shards: 5 },
  { id: 'a_drops100',  name: 'Regular',         desc: 'Finish 100 Drops.',             stat: 'drops', gte: 100,     shards: 20 },
  { id: 'a_drops500',  name: 'Well Dweller',    desc: 'Finish 500 Drops.',             stat: 'drops', gte: 500,     shards: 60 },
  { id: 'a_crew100',   name: 'Busy Surface',    desc: 'Own 100 Crew levels in total.', stat: 'crewOwned', gte: 100, shards: 25 },
];

// Daily twist ids (AI-3 defines what each one does in src/engine/twists.js).
export const TWIST_IDS = ['brittle_rope', 'gem_rain', 'hazard_fest'];
