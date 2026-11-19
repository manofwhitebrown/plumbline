// Pentatonic scales and the combo -> note mapping.
// Every biome has its own key, but all keys are close relatives (they share at least
// three of five notes with C pentatonic), so a crossfade between biomes never clashes.
//   clay C major pent | quartz G major pent | amber F major pent
//   magma A minor pent (same notes as clay) | void and abyss D minor pent
const MAJOR = [0, 2, 4, 7, 9];
const MINOR = [0, 3, 5, 7, 10];
const STEPS = MAJOR;
const BASE_MIDI = 48; // C3

export const BIOME_KEYS = {
  clay: { tonic: 0, steps: MAJOR, mode: 'major' },
  quartz: { tonic: 7, steps: MAJOR, mode: 'major' },
  amber: { tonic: 5, steps: MAJOR, mode: 'major' },
  magma: { tonic: 9, steps: MINOR, mode: 'minor' },
  void: { tonic: 2, steps: MINOR, mode: 'minor' },
  abyss: { tonic: 2, steps: MINOR, mode: 'minor' },
  menu: { tonic: 0, steps: MAJOR, mode: 'major' },
};

export function midiToHz(midi) {
  const m = Number.isFinite(midi) ? midi : 60;
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function keyFor(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(BIOME_KEYS, id) ? BIOME_KEYS[id] : BIOME_KEYS.clay;
}

// Kept for callers that pass a biome. Returns the tonic as a MIDI note near C3.
export function rootFor(id) {
  return BASE_MIDI + keyFor(id).tonic;
}

// The MIDI note of a scale degree. degree 0 is the tonic at `octaveBase` (a MIDI note that is a C).
// Negative and large degrees wrap into other octaves.
export function degreeToMidi(id, degree, octaveBase = 60) {
  const key = keyFor(id);
  const d = Number.isFinite(degree) ? Math.floor(degree) : 0;
  const n = key.steps.length;
  const oct = Math.floor(d / n);
  const idx = ((d % n) + n) % n;
  return octaveBase + key.tonic + key.steps[idx] + oct * 12;
}

// All scale notes (MIDI) between low and high, inclusive.
export function scaleNotes(id, low, high) {
  const key = keyFor(id);
  const out = [];
  for (let base = 0; base <= 120; base += 12) {
    for (const s of key.steps) {
      const m = base + key.tonic + s;
      if (m >= low && m <= high) out.push(m);
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

// Move any note to the nearest note of the biome's scale.
export function snapToScale(id, midi) {
  const key = keyFor(id);
  let best = midi;
  let bestD = 99;
  for (let o = -1; o <= 1; o++) {
    const base = Math.floor(midi / 12) * 12 + o * 12;
    for (const s of key.steps) {
      const m = base + key.tonic + s;
      const d = Math.abs(m - midi);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
  }
  return best;
}

// First note of a key's collect range: the tonic nearest to C4 (MIDI 55 to 66).
function collectBase(id) {
  const t = keyFor(id).tonic;
  return 60 + (((t + 6) % 12) - 6);
}

// Combo 0, 1, 2... climbs the scale for two octaves, then stays on the top notes.
export function noteForCombo(combo, id = 'clay') {
  const c = Number.isFinite(combo) && combo > 0 ? Math.floor(combo) : 0;
  const key = keyFor(id);
  const n = key.steps.length;
  const idx = Math.min(c, n * 2 - 1);
  const octave = Math.floor(idx / n);
  return midiToHz(collectBase(id) + octave * 12 + key.steps[idx % n]);
}

export function midiForCombo(combo, id = 'clay') {
  const c = Number.isFinite(combo) && combo > 0 ? Math.floor(combo) : 0;
  const key = keyFor(id);
  const n = key.steps.length;
  const idx = Math.min(c, n * 2 - 1);
  return collectBase(id) + Math.floor(idx / n) * 12 + key.steps[idx % n];
}

export const SCALE_STEPS = STEPS;
export const BASE_NOTE = BASE_MIDI;
