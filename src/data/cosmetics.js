// COSMETICS and RELIC WALL numbers. [HOOK-3] Data only, no logic.
// Looks are purely visual: colour tints and gradients, nothing that changes the game.
// Three kinds: bucket, rope, well (the colour of the well walls). Each kind has one free default.
//
// unlock: { t:'free' } | { t:'relics', n } (find n different relics) | { t:'ach', id } (an achievement from rewards.js)
//       | { t:'shards', cost } (buy once with Shards)
// look (bucket): { tint, alpha, rim }   tint over the wood, rim = colour of the top edge glow
// look (rope):   { tint, alpha }        tint over the rope
// look (well):   { top, bottom, alpha } soft colour wash over the well walls, top to bottom
// Text limits (tests): name 14, how 40, desc 90.

export const LOOK_KINDS = Object.freeze(['bucket', 'rope', 'well']);
export const KIND_LABEL = Object.freeze({ bucket: 'Bucket', rope: 'Rope', well: 'Well' });

const c = (id, kind, name, desc, unlock, how, look) =>
  Object.freeze({ id, kind, name, desc, unlock: Object.freeze(unlock), how, look: Object.freeze(look) });

export const COSMETICS = Object.freeze([
  c('bkt_oak', 'bucket', 'Plain Oak', 'The old wooden bucket, as it always was.', { t: 'free' }, 'Yours from the start', { tint: '#000000', alpha: 0, rim: '#ffeeb8' }),
  c('bkt_copper', 'bucket', 'Copper Pail', 'Warm red metal that shines like a new coin.', { t: 'relics', n: 6 }, 'Find 6 relics', { tint: '#d9733a', alpha: 0.38, rim: '#ffc79a' }),
  c('bkt_frost', 'bucket', 'Frostwork', 'Pale blue wood, cold to the touch.', { t: 'ach', id: 'a_depth500' }, 'Reach 500 m Depth', { tint: '#7fc4ff', alpha: 0.34, rim: '#d6f0ff' }),
  c('bkt_gilded', 'bucket', 'Gilded Barrel', 'Gold from rim to base. Very proud of itself.', { t: 'shards', cost: 60 }, 'Costs 60 Shards', { tint: '#ffd24a', alpha: 0.42, rim: '#fff3b0' }),

  c('rp_hemp', 'rope', 'Plain Hemp', 'Honest brown rope, twisted by hand.', { t: 'free' }, 'Yours from the start', { tint: '#000000', alpha: 0 }),
  c('rp_ember', 'rope', 'Ember Cord', 'A red rope that glows a little at the edges.', { t: 'relics', n: 12 }, 'Find 12 relics', { tint: '#ff6a3d', alpha: 0.42 }),
  c('rp_blue', 'rope', 'Blue Braid', 'Sea blue strands, braided tight.', { t: 'shards', cost: 30 }, 'Costs 30 Shards', { tint: '#4fa3ff', alpha: 0.45 }),
  c('rp_star', 'rope', 'Starlight Cord', 'A violet rope that looks full of tiny stars.', { t: 'ach', id: 'a_combo15' }, 'Reach a Combo of 15', { tint: '#b583ff', alpha: 0.46 }),

  c('wl_dusk', 'well', 'Dusk', 'The well walls as you know them.', { t: 'free' }, 'Yours from the start', { top: '#000000', bottom: '#000000', alpha: 0 }),
  c('wl_teal', 'well', 'Teal Deep', 'Cool green water light on every wall.', { t: 'shards', cost: 40 }, 'Costs 40 Shards', { top: '#2fd0b5', bottom: '#0d4a7a', alpha: 0.22 }),
  c('wl_rose', 'well', 'Rose Dawn', 'A soft pink glow, like morning above.', { t: 'relics', n: 20 }, 'Find 20 relics', { top: '#ff9ab8', bottom: '#7a2a5a', alpha: 0.22 }),
  c('wl_moss', 'well', 'Moss Hollow', 'Green and quiet, like an old garden.', { t: 'ach', id: 'a_gold100k' }, 'Earn 100K Gold in total', { top: '#8fd35a', bottom: '#1f4a24', alpha: 0.22 }),
]);

export const DEFAULT_LOOKS = Object.freeze({ bucket: 'bkt_oak', rope: 'rp_hemp', well: 'wl_dusk' });

const BY_ID = Object.freeze(Object.fromEntries(COSMETICS.map((x) => [x.id, x])));
export function cosmeticById(id) { return typeof id === 'string' && BY_ID[id] ? BY_ID[id] : null; }
export function cosmeticsOf(kind) { return COSMETICS.filter((x) => x.kind === kind); }

// Small bonuses for finding many relics on the Relic Wall. Tiny on purpose.
// kind: gold = all Gold in a Drop (adds to the multiplier), luck = better gems rise a bit more often.
export const WALL_BONUSES = Object.freeze([
  Object.freeze({ at: 10, kind: 'gold', pct: 0.01, text: '+1% Gold' }),
  Object.freeze({ at: 20, kind: 'luck', pct: 0.01, text: '+1% better gems' }),
  Object.freeze({ at: 36, kind: 'gold', pct: 0.02, text: '+2% Gold' }),
]);
export const WALL_TOTAL = 36;

// Short plain hints for relics nobody has found yet (by Biome). Max 40 characters.
export const WALL_HINTS = Object.freeze({
  clay: 'Hides in the Clay Biome',
  quartz: 'Hides in the Quartz Biome',
  amber: 'Hides in the Amber Biome',
  magma: 'Hides in the Magma Biome',
  void: 'Hides in the Void Biome',
  abyss: 'Hides in the Abyss Biome',
});
