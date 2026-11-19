// Builds the whole audio engine on any AudioContext (real or offline). index.js uses it for the game;
// the lab and the offline measurements use it too, so what we measure is what the player hears.
import { createSynth, detectQuality } from './synth.js';
import { createVoices } from './voices.js';
import { createSfx } from './sfx.js';
import { createUiSounds } from './ui-sounds.js';
import { createMusic } from './music.js';
import { createHeartbeat } from './heartbeat.js';
import { createEvents } from './events.js';

const clamp01 = (x) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

// opts: { quality, clock (for offline), state: shared { strain01, combo, depth, biome } }
export function createEngine(ctx, opts = {}) {
  const state = opts.state || { strain01: 0, combo: 0, depth: 0, biome: 'clay' };
  const synth = createSynth(ctx, { quality: opts.quality || detectQuality(), clock: opts.clock });
  const voices = createVoices(synth);
  const sfx = createSfx(synth, voices, { biome: () => state.biome });
  const music = createMusic(synth, voices, { seed: opts.seed });
  const heartbeat = createHeartbeat(synth, voices);

  const endRun = (ms) => {
    state.strain01 = 0;
    state.combo = 0;
    heartbeat.reset();
    music.setMode('results');
    music.setMood(0, ms);
  };
  const hooks = {
    strain: (v) => {
      state.strain01 = clamp01(v);
    },
    biome: (id) => {
      if (typeof id === 'string') state.biome = id;
      music.setBiome(id);
    },
    runStart: (seed) => {
      music.setSeed(seed);
      music.setScreen('drop');
    },
    intensity: (o) => {
      if (Number.isFinite(o.combo)) state.combo = Math.max(0, o.combo);
      if (Number.isFinite(o.depth)) state.depth = Math.max(0, o.depth);
    },
    snap: () => {
      music.onSnap();
      endRun(1.2);
    },
    haul: () => {
      music.onHaul();
      endRun(2.5);
    },
  };

  // Runs a few times a second: starts new music notes and the heartbeat.
  function tick(t) {
    const now = Number.isFinite(t) ? t : synth.now();
    music.setIntensity({ strain: state.strain01, combo: state.combo, depth: state.depth });
    music.update(now);
    heartbeat.update(now, state.strain01);
  }

  return { ctx, synth, voices, sfx, music, heartbeat, state, hooks, tick, ui: createUiSounds(synth, voices), handle: createEvents(synth, sfx, hooks) };
}
