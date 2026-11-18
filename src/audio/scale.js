// Pentatonic scale and the combo -> note mapping.
// A pentatonic scale never sounds wrong, so a long chain sounds like a melody.

// Steps of a major pentatonic scale, in semitones from the root.
const STEPS = [0, 2, 4, 7, 9];

// Root note for each biome (MIDI numbers). Keys sit close together so fades never clash.
const ROOTS = { clay: 48, quartz: 50, amber: 52, magma: 45, void: 47, abyss: 47 };

export function midiToHz(midi) {
  const m = Number.isFinite(midi) ? midi : 60;
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function rootFor(biomeId) {
  return ROOTS[biomeId] !== undefined ? ROOTS[biomeId] : ROOTS.clay;
}

// Combo 0, 1, 2... climbs the scale. After two octaves it stays on the top notes.
export function noteForCombo(combo, biomeId) {
  const c = Number.isFinite(combo) && combo > 0 ? Math.floor(combo) : 0;
  const idx = Math.min(c, STEPS.length * 2 - 1);
  const octave = Math.floor(idx / STEPS.length);
  const midi = rootFor(biomeId) + 12 + octave * 12 + STEPS[idx % STEPS.length];
  return midiToHz(midi);
}

export const SCALE_STEPS = STEPS;
