// All canvas colours live here. Mirrors the CONTRACT tokens.
export const TOKENS = {
  ink900: '#070a12', ink800: '#0d1220', ink700: '#141b2e', ink600: '#1d2740',
  line: '#2a3555', text: '#eef2ff', muted: '#8d97b8',
  gold: '#f6c453', goldSoft: '#ffe3a1', ember: '#ff7a45', ok: '#46e3a3',
  danger: '#ff4d5e', shard: '#7fd6ff', core: '#b583ff',
};

export const BIOME_IDS = ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss'];

// top, bottom = gradient. wall = brick base. crack = accent lines. mote = dust. glow = light tint.
export const BIOMES = {
  clay:   { top: '#3a2a22', bottom: '#1b1410', wall: '#4a362b', wallDark: '#2a1e18', crack: '#6b4d3c', mote: '#d9b48f', glow: '#ffd9a0' },
  quartz: { top: '#1c2a4a', bottom: '#0b1020', wall: '#2b3d63', wallDark: '#141d36', crack: '#5d7bb8', mote: '#bcd0ff', glow: '#a9c4ff' },
  amber:  { top: '#4a3213', bottom: '#1a1006', wall: '#6a4a1c', wallDark: '#34240d', crack: '#d99a3a', mote: '#ffd07a', glow: '#ffc56b' },
  magma:  { top: '#4a1a14', bottom: '#14070a', wall: '#5a2318', wallDark: '#2a0f0c', crack: '#ff6a3a', mote: '#ff9a5a', glow: '#ff8a55' },
  void:   { top: '#1a0f33', bottom: '#05030d', wall: '#2a1a4f', wallDark: '#0f0820', crack: '#8a5bff', mote: '#c9a8ff', glow: '#b583ff' },
  abyss:  { top: '#12081f', bottom: '#020108', wall: '#1d1033', wallDark: '#08040f', crack: '#ff4d9a', mote: '#ff9ad0', glow: '#d06bff' },
};

export function biomePalette(id) {
  return BIOMES[id] || BIOMES.clay;
}

// Gem tiers 1..6. Tier 6 is the animated prism (colours come from prismColor).
export const TIER_COLORS = [
  null,
  { base: '#9fb4ff', light: '#e3eaff', dark: '#5a72c9' },
  { base: '#46e3a3', light: '#c4ffe6', dark: '#1f9a6c' },
  { base: '#ffb454', light: '#ffe4b8', dark: '#c97a1a' },
  { base: '#ff5470', light: '#ffc0cb', dark: '#b01f3c' },
  { base: '#b583ff', light: '#ecdcff', dark: '#6d3fc2' },
  { base: '#ffffff', light: '#ffffff', dark: '#9aa6ff' },
];
export function tierColors(tier) {
  const t = Math.max(1, Math.min(6, Math.floor(Number(tier)) || 1));
  return TIER_COLORS[t];
}

// Prism steps: a ring of rainbow colours (pre-built so the frame makes no strings).
export const PRISM_STEPS = 24;
export const PRISM = [];
for (let i = 0; i < PRISM_STEPS; i++) {
  const h = Math.round((i / PRISM_STEPS) * 360);
  PRISM.push({ base: `hsl(${h},90%,64%)`, light: `hsl(${h},100%,88%)`, dark: `hsl(${(h + 40) % 360},70%,42%)` });
}
export function prismColor(timeMs, phase = 0) {
  const i = Math.floor(((timeMs / 60) + phase * PRISM_STEPS) % PRISM_STEPS);
  return PRISM[(i + PRISM_STEPS) % PRISM_STEPS];
}

// Rope tint from strain 0..1: gold -> amber -> red (32 steps, built once).
export const ROPE_STEPS = 32;
export const ROPE_TINTS = [];
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mixRgb(a, b, t) { return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`; }
(function buildRope() {
  const gold = hex('#d9b26a'), amber = hex('#e08a2e'), red = hex('#ff4d5e');
  for (let i = 0; i < ROPE_STEPS; i++) {
    const s = i / (ROPE_STEPS - 1);
    ROPE_TINTS.push(s < 0.5 ? mixRgb(gold, amber, s / 0.5) : mixRgb(amber, red, (s - 0.5) / 0.5));
  }
})();
export function ropeTint(strain01) {
  const s = Number.isFinite(strain01) ? Math.max(0, Math.min(1, strain01)) : 0;
  return ROPE_TINTS[Math.round(s * (ROPE_STEPS - 1))];
}

export const HAZARD_COLORS = {
  rock: { base: '#7b7f8c', dark: '#3d404b', light: '#b9bdca' },
  bat: { base: '#5b3d7a', dark: '#2a1a3d', light: '#9c78c8' },
  root: { base: '#7a5a34', dark: '#3b2a15', light: '#b08a54' },
  steam: { base: '#e8eef8', dark: '#9aa6b8', light: '#ffffff' },
  void: { base: '#6a2cff', dark: '#14052e', light: '#c9a8ff' },
};
export function hazardColors(h) { return HAZARD_COLORS[h] || HAZARD_COLORS.rock; }
