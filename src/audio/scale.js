// Pentatonic scale and the combo -> note mapping.
// A pentatonic scale never sounds wrong, so a long chain sounds like a melody.
// Every biome uses the same five notes (C D E G A), so music and collects never clash.

const STEPS = [0, 2, 4, 7, 9];
const BASE_MIDI = 48; // C3

export function midiToHz(midi) {
  const m = Number.isFinite(midi) ? midi : 60;
  return 440 * Math.pow(2, (m - 69) / 12);
}

// Kept for callers that pass a biome. All biomes share one key.
export function rootFor() {
  return BASE_MIDI;
}

// Combo 0, 1, 2... climbs the scale for two octaves, then stays on the top notes.
export function noteForCombo(combo) {
  const c = Number.isFinite(combo) && combo > 0 ? Math.floor(combo) : 0;
  const idx = Math.min(c, STEPS.length * 2 - 1);
  const octave = Math.floor(idx / STEPS.length);
  return midiToHz(BASE_MIDI + 12 + octave * 12 + STEPS[idx % STEPS.length]);
}

export const SCALE_STEPS = STEPS;
export const BASE_NOTE = BASE_MIDI;
