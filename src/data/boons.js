// BOONS (roguelite picks). All numbers live here. No logic.
// A boon lasts for the rest of the drop. Each boon has tags. Tags link to the parts in the rig:
// the more matching parts you have, the stronger the boon (see TAG_PARTS and AFFINITY).
//
// fx keys (all added up by src/engine/play/fx.js, then capped by CAPS):
//   gold      +fraction of all gold              gem   +fraction on gem value        ore   +fraction on ore value
//   big       +fraction on level 4+ gems         strain  fraction LESS strain every step (negative = more)
//   hazard    fraction LESS strain from dangers  luck  + to the luck number (better gems rise more often)
//   speed     + metres per step                  combo  + to the Combo step (0.1 is the base)
//   comboGrace  steps the Combo survives with no grab
//   wide      1 = every collector also grabs the next column
//   second    snaps survived (rope drops to 10% strain)    ward  dangers ignored
//   hazGold   gold paid when a danger hits you (in gem value units)
//   cd        fraction less ability cooldown     braceCharges / surgeCharges  extra charges
//   flare     1 = unlocks the Flare ability      maxStrain  +fraction of max strain   keep  + keep on snap
//   relic     + relic find chance                chainGold  +fraction of gold for each link in a chain this step
//   famGold   { family: +fraction } gold from grabs made by that kind of part
//   coolPerGem  fraction of max strain taken off for each gem grabbed
export const RARITIES = Object.freeze({
  common: Object.freeze({ id: 'common', name: 'Common', weight: 70, color: '#9fb4ff' }),
  rare: Object.freeze({ id: 'rare', name: 'Rare', weight: 25, color: '#ffb454' }),
  legendary: Object.freeze({ id: 'legendary', name: 'Legendary', weight: 5, color: '#b583ff' }),
});

export const OFFER = Object.freeze({
  choices: 3,
  seconds: 6,              // the picker waits this long, then takes the middle card
  every: 100,              // metres between offers (plus the Biome edges)
  biomeEdges: [250, 450, 700],
  legendaryFrom: 300,      // no Legendary before this depth
  rareBoostPerCentury: 0.04, // Rare gets this much more weight every 100 m
  guardianWeights: { common: 0, rare: 70, legendary: 30 }, // the boon after a guardian
  affinityBias: 0.35,      // weight bonus for each matching part in the rig (up to 3 parts)
  maxPerRun: 40,
});

// How strong a boon is for this rig: x (1 + AFFINITY.step * matching parts), up to AFFINITY.maxParts.
export const AFFINITY = Object.freeze({ step: 0.15, maxParts: 4 });

// Which parts count for each tag. A string that is a part family matches the whole family.
export const TAG_PARTS = Object.freeze({
  collector: ['hook', 'magnet', 'net', 'vacuum', 'wide_net'],
  chain: ['splitter', 'echo', 'metronome', 'amplifier', 'fuse', 'battery'],
  value: ['multiplier', 'gilder', 'polisher', 'amplifier', 'echo', 'prism'],
  guard: ['plate', 'shield', 'oilcan', 'cooler', 'sparerope', 'spikeguard', 'anchor'],
  speed: ['drill', 'anchor', 'metronome', 'battery'],
  luck: ['compass', 'lantern', 'jackpot', 'prism'],
  risk: ['drill', 'vacuum', 'fuse'],
});

export const TAGS = Object.freeze(['collector', 'chain', 'value', 'guard', 'speed', 'luck', 'risk']);
export const TAG_NAMES = Object.freeze({
  collector: 'Collector', chain: 'Chain', value: 'Value', guard: 'Guard', speed: 'Quick', luck: 'Luck', risk: 'Risk',
});

// Two boons with the same tag wake a named bonus.
export const SYNERGIES = Object.freeze({
  collector: { name: 'Open Hands', desc: 'Two Collector boons: grabs pay 10% more.', fx: { famGold: { collector: 0.1 } } },
  chain: { name: 'Spark Storm', desc: 'Two Chain boons: chains pay 5% more.', fx: { chainGold: 0.05 } },
  value: { name: 'Fat Purse', desc: 'Two Value boons: all gold 8% more.', fx: { gold: 0.08 } },
  guard: { name: 'Iron Will', desc: 'Two Guard boons: 8% less strain.', fx: { strain: 0.08 } },
  speed: { name: 'Quick Draw', desc: 'Two Quick boons: skills come back 15% sooner.', fx: { cd: 0.15 } },
  luck: { name: 'Lucky Streak', desc: 'Two Luck boons: better gems rise more often.', fx: { luck: 0.1 } },
  risk: { name: 'Daredevil', desc: 'Two Risk boons: all gold 12% more.', fx: { gold: 0.12 } },
});

// Nothing can stack past these.
export const CAPS = Object.freeze({
  gold: 0.8, gem: 1, ore: 2, big: 1, strain: 0.3, hazard: 0.4, luck: 0.6, speed: 1, combo: 0.1, comboGrace: 40,
  second: 1, ward: 2, hazGold: 8, cd: 0.6, braceCharges: 2, surgeCharges: 2, maxStrain: 0.25, keep: 0.25,
  relic: 0.2, chainGold: 0.4, famGold: 0.8, coolPerGem: 0.006,
});

const b = (id, name, rarity, tags, desc, fx) => Object.freeze({ id, name, rarity, tags: Object.freeze(tags), desc, fx: Object.freeze(fx) });

export const BOONS = Object.freeze([
  // ---- common ----
  b('gem_rush', 'Gem Rush', 'common', ['value'], 'Gems are worth 25% more.', { gem: 0.25 }),
  b('rich_ore', 'Rich Ore', 'common', ['value'], 'Ore is worth 40% more.', { ore: 0.4 }),
  b('slack_rope', 'Slack Rope', 'common', ['guard'], 'The rope takes 15% less strain.', { strain: 0.15 }),
  b('thick_hide', 'Thick Hide', 'common', ['guard'], 'Dangers cost 25% less strain.', { hazard: 0.25 }),
  b('lucky_lamp', 'Lucky Lamp', 'common', ['luck'], 'Better gems rise more often.', { luck: 0.12 }),
  b('coin_purse', 'Coin Purse', 'common', ['value'], 'All gold is worth 10% more.', { gold: 0.1 }),
  b('cool_head', 'Cool Head', 'common', ['guard'], 'Each gem you grab eases the rope a little.', { coolPerGem: 0.0015 }),
  b('quick_hands', 'Quick Hands', 'common', ['speed'], 'Skills come back 20% sooner.', { cd: 0.2 }),
  b('good_grease', 'Good Grease', 'common', ['guard'], 'Less strain and a little more gold.', { strain: 0.08, gold: 0.05 }),
  b('tough_rope', 'Tough Rope', 'common', ['guard'], 'The rope can take 10% more strain.', { maxStrain: 0.1 }),
  b('pack_rat', 'Pack Rat', 'common', ['guard'], 'Keep 5% more gold after a snap.', { keep: 0.05 }),
  b('bright_eyes', 'Bright Eyes', 'common', ['luck'], 'Relics are easier to spot.', { relic: 0.04 }),
  b('chain_spark', 'Chain Spark', 'common', ['chain'], 'Each link in a chain adds 4% gold.', { chainGold: 0.04 }),
  b('firm_grip', 'Firm Grip', 'common', ['collector'], 'Collectors pay 12% more.', { famGold: { collector: 0.12 } }),
  b('tinkerers_luck', "Tinker's Luck", 'common', ['chain'], 'Processors pay 12% more.', { famGold: { processor: 0.12 } }),
  b('big_game', 'Big Game', 'common', ['luck'], 'Gems of level 4 and up pay 25% more.', { big: 0.25 }),
  b('small_ward', 'Small Ward', 'common', ['guard'], 'The next danger does nothing.', { ward: 1 }),
  b('hot_streak', 'Hot Streak', 'common', ['collector'], 'Your Combo climbs faster.', { combo: 0.03 }),
  b('flare_lamp', 'Flare Lamp', 'common', ['speed'], 'Unlocks Flare: clears the next row of dangers.', { flare: 1 }),
  b('steady_pace', 'Steady Pace', 'common', ['speed'], 'Slower descent, 10% less strain.', { speed: -0.1, strain: 0.1 }),
  b('lean_bucket', 'Lean Bucket', 'common', ['risk'], 'A little faster and a little richer.', { speed: 0.1, gold: 0.06 }),
  // ---- rare ----
  b('wide_grip', 'Wide Grip', 'rare', ['collector'], 'Every collector also grabs the next column.', { wide: 1 }),
  b('sure_hands', 'Sure Hands', 'rare', ['collector'], 'Your Combo holds for 20 steps with no grab.', { comboGrace: 20 }),
  b('gold_tooth', 'Gold Tooth', 'rare', ['risk'], 'Dangers that hit you pay gold.', { hazGold: 3 }),
  b('second_wind', 'Second Wind', 'rare', ['guard'], 'Survive one snap. The rope drops to 10% strain.', { second: 1 }),
  b('prism_luck', 'Prism Luck', 'rare', ['luck'], 'Level 4 and up gems rise much more often.', { luck: 0.25 }),
  b('heavy_bucket', 'Heavy Bucket', 'rare', ['risk'], 'Faster, richer, and a heavier pull on the rope.', { speed: 0.3, gold: 0.2, strain: -0.1 }),
  b('chain_surge', 'Chain Surge', 'rare', ['chain'], 'Each link in a chain adds 8% gold.', { chainGold: 0.08 }),
  b('twin_brace', 'Twin Brace', 'rare', ['guard'], 'One more Brace charge.', { braceCharges: 1 }),
  b('overcharge', 'Overcharge', 'rare', ['speed'], 'One more Surge charge. Skills come back 10% sooner.', { surgeCharges: 1, cd: 0.1 }),
  b('iron_rope', 'Iron Rope', 'rare', ['guard'], 'The rope can take 12% more strain.', { maxStrain: 0.12 }),
  b('vein_sense', 'Vein Sense', 'rare', ['luck'], 'More relics and better gems.', { relic: 0.08, luck: 0.1 }),
  b('collectors_pride', "Collector's Pride", 'rare', ['collector'], 'Collectors pay 25% more.', { famGold: { collector: 0.25 } }),
  b('miser', 'Miser', 'rare', ['value'], 'Gems are worth 40% more.', { gem: 0.4 }),
  b('danger_hunter', 'Danger Hunter', 'rare', ['risk'], 'Dangers cost 15% less and pay a little gold.', { hazard: 0.15, hazGold: 2 }),
  // ---- legendary ----
  b('golden_age', 'Golden Age', 'legendary', ['value', 'risk'], 'All gold is worth 20% more. The rope pulls a bit harder.', { gold: 0.2, strain: -0.05 }),
  b('unbreakable', 'Unbreakable', 'legendary', ['guard'], '18% less strain and a stronger rope.', { strain: 0.18, maxStrain: 0.08 }),
  b('star_chain', 'Star Chain', 'legendary', ['chain', 'collector'], 'Chains pay 8% more per link. Your Combo climbs faster.', { chainGold: 0.08, combo: 0.03 }),
  b('sky_of_gems', 'Sky of Gems', 'legendary', ['luck'], 'Much better gems, and big ones pay 40% more.', { luck: 0.3, big: 0.4 }),
  b('phoenix_rope', 'Phoenix Rope', 'legendary', ['guard'], 'Survive one snap. The rope drops to 5% strain and you get a free Brace.', { second: 1, braceCharges: 1 }),
  b('time_tinker', 'Time Tinker', 'legendary', ['speed'], 'Skills come back 25% sooner and Surge gains a charge.', { cd: 0.25, surgeCharges: 1 }),
]);

const BY_ID = Object.freeze(Object.fromEntries(BOONS.map((x) => [x.id, x])));
export function boonById(id) { return typeof id === 'string' && BY_ID[id] ? BY_ID[id] : null; }
