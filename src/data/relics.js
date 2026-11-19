// RELICS: 36 collectables, 6 for each Biome. All numbers live here. No logic.
// A relic gives a small permanent bonus the first time you find it. Find all 6 of a Biome for a Set bonus.
// Finding one again makes Relic Dust, which levels the relic up (a bigger bonus).
//
// bonus: { kind, pct }  kind is one of:
//   gold    all gold in a drop          crew   gold from the Crew          keep   gold kept after a snap (added to the share)
//   strain  less strain (fraction)      luck   better gems rise more often relic  more relics rise
// Everything is added up in src/meta/relics.js and capped there (see RELIC_CAPS).
export const RARITY = Object.freeze({
  common: Object.freeze({ id: 'common', name: 'Common', weight: 60, dust: 1, color: '#9fb4ff' }),
  rare: Object.freeze({ id: 'rare', name: 'Rare', weight: 30, dust: 3, color: '#ffb454' }),
  epic: Object.freeze({ id: 'epic', name: 'Epic', weight: 10, dust: 8, color: '#b583ff' }),
});

// Upgrading: level 1 is the first find. Each level costs Relic Dust and multiplies the bonus.
export const LEVELS = Object.freeze([
  Object.freeze({ level: 1, cost: 0, mult: 1 }),
  Object.freeze({ level: 2, cost: 5, mult: 1.5 }),
  Object.freeze({ level: 3, cost: 15, mult: 2 }),
]);

// No set of relics can ever double your income.
export const RELIC_CAPS = Object.freeze({ gold: 0.45, crew: 0.4, keep: 0.12, strain: 0.2, luck: 0.15, relic: 0.1, totalIncome: 0.8 });

const r = (id, name, biome, rarity, kind, pct, hint, shape) =>
  Object.freeze({ id, name, biome, rarity, bonus: Object.freeze({ kind, pct }), hint, shape });

export const RELICS = Object.freeze([
  // clay
  r('cracked_bowl', 'Cracked Bowl', 'clay', 'common', 'gold', 0.01, 'Someone ate here, long ago.', 'bowl'),
  r('clay_whistle', 'Clay Whistle', 'clay', 'common', 'luck', 0.01, 'It still makes one soft note.', 'whistle'),
  r('potters_thumb', "Potter's Thumb", 'clay', 'common', 'strain', 0.01, 'A thumb print, baked in.', 'thumb'),
  r('baker_token', "Baker's Token", 'clay', 'rare', 'crew', 0.02, 'It smells of warm bread.', 'coin'),
  r('mud_idol', 'Mud Idol', 'clay', 'rare', 'keep', 0.02, 'A small face. It looks calm.', 'idol'),
  r('sunbaked_mask', 'Sunbaked Mask', 'clay', 'epic', 'gold', 0.03, 'Warm, even this deep.', 'mask'),
  // quartz
  r('frost_shard', 'Frost Shard', 'quartz', 'common', 'strain', 0.01, 'Cold to the touch.', 'shard'),
  r('ice_lens', 'Ice Lens', 'quartz', 'common', 'luck', 0.01, 'Things look sharper through it.', 'lens'),
  r('blue_comb', 'Blue Comb', 'quartz', 'common', 'gold', 0.01, 'Teeth of blue glass.', 'comb'),
  r('glass_bell', 'Glass Bell', 'quartz', 'rare', 'relic', 0.01, 'It rings when relics are near.', 'bell'),
  r('snow_compass', 'Snow Compass', 'quartz', 'rare', 'keep', 0.02, 'It always points up.', 'compass'),
  r('crystal_crown', 'Crystal Crown', 'quartz', 'epic', 'gold', 0.03, 'Fit for a very small king.', 'crown'),
  // amber
  r('bee_in_amber', 'Bee in Amber', 'amber', 'common', 'gold', 0.01, 'Caught mid-flight.', 'bee'),
  r('root_charm', 'Root Charm', 'amber', 'common', 'strain', 0.01, 'Knotted three times.', 'knot'),
  r('honey_coin', 'Honey Coin', 'amber', 'common', 'crew', 0.01, 'Sticky and sweet.', 'coin'),
  r('fossil_fern', 'Fossil Fern', 'amber', 'rare', 'luck', 0.02, 'A leaf from before the well.', 'fern'),
  r('amber_eye', 'Amber Eye', 'amber', 'rare', 'gold', 0.02, 'It watches the rope.', 'eye'),
  r('weavers_spindle', "Weaver's Spindle", 'amber', 'epic', 'strain', 0.03, 'Still wound with thread.', 'spindle'),
  // magma
  r('ember_nail', 'Ember Nail', 'magma', 'common', 'gold', 0.01, 'Glows when you hold it.', 'nail'),
  r('slag_ring', 'Slag Ring', 'magma', 'common', 'keep', 0.01, 'Heavy and rough.', 'ring'),
  r('ash_locket', 'Ash Locket', 'magma', 'common', 'strain', 0.01, 'There is a name inside.', 'locket'),
  r('forge_tongs', 'Forge Tongs', 'magma', 'rare', 'crew', 0.02, 'The smith left in a hurry.', 'tongs'),
  r('obsidian_blade', 'Obsidian Blade', 'magma', 'rare', 'gold', 0.02, 'Sharper than it should be.', 'blade'),
  r('maw_tooth', 'Maw Tooth', 'magma', 'epic', 'gold', 0.03, 'It came from something big.', 'tooth'),
  // void
  r('dark_thread', 'Dark Thread', 'void', 'common', 'luck', 0.01, 'You cannot see where it ends.', 'thread'),
  r('hollow_coin', 'Hollow Coin', 'void', 'common', 'gold', 0.01, 'There is nothing inside.', 'coin'),
  r('night_seed', 'Night Seed', 'void', 'common', 'relic', 0.01, 'It will not sprout.', 'seed'),
  r('star_map', 'Star Map', 'void', 'rare', 'strain', 0.02, 'The stars are in the wrong place.', 'map'),
  r('eclipse_pin', 'Eclipse Pin', 'void', 'rare', 'crew', 0.02, 'It holds a little shade.', 'pin'),
  r('eye_lens', 'Eye Lens', 'void', 'epic', 'luck', 0.03, 'It looks back.', 'lens'),
  // abyss
  r('deep_pearl', 'Deep Pearl', 'abyss', 'common', 'gold', 0.01, 'Pale and perfectly round.', 'pearl'),
  r('drowned_bell', 'Drowned Bell', 'abyss', 'common', 'keep', 0.01, 'It rings under water.', 'bell'),
  r('black_anchor', 'Black Anchor', 'abyss', 'common', 'strain', 0.01, 'Small, but very heavy.', 'anchor'),
  r('whale_rib', 'Whale Rib', 'abyss', 'rare', 'crew', 0.02, 'Bigger than the bucket.', 'rib'),
  r('endless_knot', 'Endless Knot', 'abyss', 'rare', 'gold', 0.02, 'It has no ends.', 'knot'),
  r('heart_of_the_well', 'Heart of the Well', 'abyss', 'epic', 'gold', 0.04, 'It beats, slowly.', 'heart'),
]);

export const SETS = Object.freeze({
  clay: Object.freeze({ id: 'clay', name: "Potter's Set", bonus: Object.freeze({ kind: 'gold', pct: 0.03 }) }),
  quartz: Object.freeze({ id: 'quartz', name: 'Frostwork Set', bonus: Object.freeze({ kind: 'strain', pct: 0.04 }) }),
  amber: Object.freeze({ id: 'amber', name: 'Hive Set', bonus: Object.freeze({ kind: 'luck', pct: 0.04 }) }),
  magma: Object.freeze({ id: 'magma', name: 'Forge Set', bonus: Object.freeze({ kind: 'crew', pct: 0.05 }) }),
  void: Object.freeze({ id: 'void', name: 'Nightfall Set', bonus: Object.freeze({ kind: 'keep', pct: 0.04 }) }),
  abyss: Object.freeze({ id: 'abyss', name: 'Deep Set', bonus: Object.freeze({ kind: 'gold', pct: 0.05 }) }),
});

const BY_ID = Object.freeze(Object.fromEntries(RELICS.map((x) => [x.id, x])));
export function relicById(id) { return typeof id === 'string' && BY_ID[id] ? BY_ID[id] : null; }
export function relicsOf(biome) { return RELICS.filter((x) => x.biome === biome); }

// Roll one relic. `rng` is a seeded rng. `owned` (optional) is a set-like of ids the player already has.
// Where it comes from decides the Biome. `bias` (0..1) moves weight from Common toward Rare and Epic.
// Always uses exactly 2 random numbers, so the rest of the run never shifts.
export function rollRelic(rng, biomeId, bias = 0) {
  const u1 = rng.next(), u2 = rng.next();
  const b = Math.min(1, Math.max(0, Number(bias) || 0));
  const w = { common: RARITY.common.weight * (1 - b), rare: RARITY.rare.weight * (1 + b * 0.5), epic: RARITY.epic.weight * (1 + b * 2) };
  const total = w.common + w.rare + w.epic;
  let x = u1 * total, rarity = 'epic';
  if (x < w.common) rarity = 'common'; else if (x < w.common + w.rare) rarity = 'rare';
  const pool = RELICS.filter((q) => q.biome === biomeId && q.rarity === rarity);
  const list = pool.length ? pool : RELICS.filter((q) => q.biome === biomeId);
  const all = list.length ? list : RELICS;
  return all[Math.min(all.length - 1, Math.floor(u2 * all.length))];
}
