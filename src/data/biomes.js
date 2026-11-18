// The six biomes of the well. All the feel-numbers live here so they are easy to tune.
// tierWeights = chances for gem tiers 1..6 (bigger number = more common).
// hazardWeights = which hazards can show up and how often, compared with each other.
// hazardStrain = how much rope strain one hit of that hazard costs.

const SIX_ZEROS = [0, 0, 0, 0, 0, 0];

const BASE = [
  {
    // Friendly start: mostly tier 1, a rare tier 2, a few rocks. Warm and calm.
    id: 'clay', name: 'Clay', from: 0, to: 100, goldFactor: 1,
    tierWeights: [88, 12, 0, 0, 0, 0],
    mix: { empty: 30, gem: 40, ore: 22, hazard: 8 },
    hazardWeights: { rock: 1 },
    hazardStrain: { rock: 3 },
    relicChance: 0,
    ambience: 'clay_warm',
    palette: { top: '#3a2a22', bottom: '#1b1410', accent: '#d9a06b' },
  },
  {
    // Cold blue. Tier 1 to 3. Bats appear and zig-zag between lanes.
    id: 'quartz', name: 'Quartz', from: 100, to: 250, goldFactor: 1.5,
    tierWeights: [50, 35, 15, 0, 0, 0],
    mix: { empty: 25, gem: 38, ore: 20, hazard: 17 },
    hazardWeights: { rock: 3, bat: 2 },
    hazardStrain: { rock: 3, bat: 4 },
    relicChance: 0,
    ambience: 'quartz_cold',
    palette: { top: '#1c2a4a', bottom: '#0b1020', accent: '#7fa8ff' },
  },
  {
    // Honey orange. Tier 2 to 4. Roots cost more strain. First relics.
    id: 'amber', name: 'Amber', from: 250, to: 450, goldFactor: 2.2,
    tierWeights: [0, 40, 40, 20, 0, 0],
    mix: { empty: 22, gem: 36, ore: 20, hazard: 22 },
    hazardWeights: { bat: 2, root: 3 },
    hazardStrain: { bat: 4, root: 6 },
    relicChance: 0.02,
    ambience: 'amber_warm',
    palette: { top: '#4a3213', bottom: '#1a1006', accent: '#ffb454' },
  },
  {
    // Deep red. Tier 3 to 5. Steam hits several lanes at once. Richer relics.
    id: 'magma', name: 'Magma', from: 450, to: 700, goldFactor: 3.2,
    tierWeights: [0, 0, 45, 35, 20, 0],
    mix: { empty: 20, gem: 34, ore: 18, hazard: 28 },
    hazardWeights: { root: 2, steam: 3 },
    hazardStrain: { root: 6, steam: 5 },
    relicChance: 0.04,
    ambience: 'magma_deep',
    palette: { top: '#4a1a14', bottom: '#14070a', accent: '#ff7a45' },
  },
  {
    // Violet black. Tier 4 to 6 (prism gems). Void hazards drain the combo.
    id: 'void', name: 'Void', from: 700, to: 1000, goldFactor: 4.5,
    tierWeights: [0, 0, 0, 40, 35, 25],
    mix: { empty: 18, gem: 34, ore: 16, hazard: 32 },
    hazardWeights: { steam: 2, void: 3 },
    hazardStrain: { steam: 5, void: 4 },
    relicChance: 0.06,
    ambience: 'void_hush',
    palette: { top: '#1a0f33', bottom: '#05030d', accent: '#b583ff' },
  },
  {
    // Endless. Every extra 100 m pushes the odds up and the rope strain faster.
    id: 'abyss', name: 'Abyss', from: 1000, to: Infinity, goldFactor: 6,
    tierWeights: [0, 0, 0, 20, 35, 45],
    mix: { empty: 15, gem: 32, ore: 14, hazard: 39 },
    hazardWeights: { rock: 1, bat: 1, root: 1, steam: 1, void: 1 },
    hazardStrain: { rock: 3, bat: 4, root: 6, steam: 5, void: 4 },
    relicChance: 0.08,
    ambience: 'abyss_endless',
    palette: { top: '#120a24', bottom: '#020106', accent: '#e6d2ff' },
  },
];

export const ABYSS_LEVEL_CAP = 200; // after this many 100 m steps, the numbers stop growing
const ABYSS_STEP_M = 100;
const ABYSS_SHIFT = 0.1;        // each level moves 10% of the odds up one tier
const ABYSS_STRAIN_GROWTH = 0.05; // each level adds 5% to hazard strain

// Move some of each tier's weight up to the next tier. Total stays the same.
export function shiftTiersUp(weights, fraction) {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const out = SIX_ZEROS.slice();
  for (let i = 0; i < 6; i++) {
    const w = Number(weights[i]) || 0;
    const moved = i < 5 ? w * f : 0;
    out[i] += w - moved;
    if (i < 5) out[i + 1] += moved;
  }
  return out;
}

function freezeDef(def) {
  Object.freeze(def.tierWeights); Object.freeze(def.mix);
  Object.freeze(def.hazardWeights); Object.freeze(def.hazardStrain);
  Object.freeze(def.palette);
  return Object.freeze(def);
}

function makeDef(base, level) {
  const def = {
    ...base, level, index: BASE.indexOf(base),
    tierWeights: base.tierWeights.slice(),
    mix: { ...base.mix },
    hazardWeights: { ...base.hazardWeights },
    hazardStrain: { ...base.hazardStrain },
    palette: { ...base.palette },
    strainFactor: 1,
  };
  if (base.id === 'abyss' && level > 0) {
    for (let i = 0; i < level; i++) def.tierWeights = shiftTiersUp(def.tierWeights, ABYSS_SHIFT);
    def.strainFactor = 1 + level * ABYSS_STRAIN_GROWTH;
    for (const k of Object.keys(def.hazardStrain)) def.hazardStrain[k] *= def.strainFactor;
    def.goldFactor = base.goldFactor * (1 + level * 0.1);
  }
  return freezeDef(def);
}

// Build once, reuse forever (no new objects while the game runs).
const DEFS = BASE.map((b) => makeDef(b, 0));
const ABYSS_DEFS = [DEFS[5]];
for (let l = 1; l <= ABYSS_LEVEL_CAP; l++) ABYSS_DEFS.push(makeDef(BASE[5], l));

export const BIOME_IDS = Object.freeze(BASE.map((b) => b.id));

// Make any input into a safe, non-negative depth in metres.
export function safeDepth(depth) {
  const d = Number(depth);
  if (!Number.isFinite(d) || d < 0) return 0;
  return d;
}

export function abyssLevel(depth) {
  const d = safeDepth(depth);
  if (d < 1000) return 0;
  return Math.min(ABYSS_LEVEL_CAP, Math.floor((d - 1000) / ABYSS_STEP_M));
}

// The biome for any depth. Bad numbers give clay.
export function byDepth(depth) {
  const d = safeDepth(depth);
  for (let i = 0; i < 5; i++) if (d < DEFS[i].to) return DEFS[i];
  return ABYSS_DEFS[abyssLevel(d)];
}

// Find a biome by id (level only matters for the abyss). Unknown id gives clay.
export function byId(id, level = 0) {
  if (id === 'abyss') return ABYSS_DEFS[Math.min(ABYSS_LEVEL_CAP, Math.max(0, Math.floor(Number(level) || 0)))];
  return DEFS.find((d) => d.id === id) || DEFS[0];
}

// Metres until the biome changes (in the abyss: until the next 100 m step).
export function nextBiomeIn(depth) {
  const d = safeDepth(depth);
  if (d < 1000) return Math.max(0, byDepth(d).to - d);
  return ABYSS_STEP_M - ((d - 1000) % ABYSS_STEP_M);
}

export const biomes = { byDepth, byId, nextBiomeIn, list: () => DEFS, ids: BIOME_IDS };
export default biomes;
