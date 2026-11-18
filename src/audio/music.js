// Generative ambient music. One layer per biome: a slow drone plus sparse notes.
// All notes come from the same five-note set as the collects, so crossfades never clash.
import { midiToHz, BASE_NOTE } from './scale.js';

const LOOKAHEAD = 0.35;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Small players for each kind of sparse sound. Offsets are semitones from C3.
const PLAYERS = {
  pluck(s, bus, g) {
    s.tone({ freq: midiToHz(BASE_NOTE + pick(g.pool)), type: g.type, vol: g.vol, dur: g.dur, lp: g.lp, bus, music: true, delay: 0.02 });
  },
  pad(s, bus, g) {
    const chord = pick(g.chords);
    for (let i = 0; i < chord.length; i++) {
      s.tone({ freq: midiToHz(BASE_NOTE + chord[i]), vol: g.vol, attack: g.attack, dur: g.dur, detune: rand(-8, 8), bus, music: true });
    }
  },
  ember(s, bus, g) {
    s.noise({ filter: 'bandpass', freq: rand(2500, 6000), q: 4, dur: 0.05, vol: g.vol, bus, music: true });
  },
  pulse(s, bus, g) {
    const f = midiToHz(BASE_NOTE + g.off);
    s.tone({ freq: f, slideTo: f * 0.8, vol: g.vol, attack: 0.05, dur: g.dur, bus, music: true });
  },
};

const VOID = {
  drones: [28], dType: 'sine', dLp: 300, dVol: 0.05, rumble: 0,
  gens: [
    { fn: 'pulse', every: [3, 6], off: -8, vol: 0.12, dur: 1.6 },
    { fn: 'pad', every: [4, 8], chords: [[28, 31], [31, 33], [24, 28]], vol: 0.02, attack: 2, dur: 6 },
  ],
};

const BIOMES = {
  clay: {
    drones: [36, 43], dType: 'triangle', dLp: 420, dVol: 0.07, rumble: 0,
    gens: [{ fn: 'pluck', every: [2.2, 5], pool: [12, 14, 16, 19, 21], type: 'triangle', vol: 0.07, dur: 1.1, lp: 1800 }],
  },
  quartz: {
    drones: [38], dType: 'sine', dLp: 600, dVol: 0.05, rumble: 0,
    gens: [
      { fn: 'pad', every: [5, 9], chords: [[0, 7, 16], [2, 9, 16], [4, 12, 19], [7, 14, 21]], vol: 0.045, attack: 2.8, dur: 8 },
      { fn: 'pluck', every: [4, 9], pool: [24, 26, 28, 31, 33], type: 'sine', vol: 0.04, dur: 1.4 },
    ],
  },
  amber: {
    drones: [33, 40], dType: 'sine', dLp: 500, dVol: 0.06, rumble: 0,
    gens: [
      { fn: 'pad', every: [6, 10], chords: [[-3, 4, 12], [-5, 2, 9], [-3, 7, 12]], vol: 0.045, attack: 3, dur: 9 },
      { fn: 'pluck', every: [3, 7], pool: [12, 16, 19, 21, 24], type: 'triangle', vol: 0.06, dur: 1.2, lp: 1400 },
    ],
  },
  magma: {
    drones: [33], dType: 'sine', dLp: 260, dVol: 0.07, rumble: 0.12,
    gens: [
      { fn: 'ember', every: [0.4, 2.5], vol: 0.03 },
      { fn: 'pad', every: [8, 12], chords: [[-15, -8]], vol: 0.05, attack: 3, dur: 10 },
    ],
  },
  void: VOID,
  abyss: { ...VOID, drones: [26, 33] },
};

export function createMusic(synth) {
  const ctx = synth.ctx;
  const mood = ctx.createGain();
  mood.gain.value = 0.6;
  mood.connect(synth.buses.music);

  const layers = {};
  let current = null;
  let moodTarget = 0.6;

  function makeLayer(id) {
    const cfg = BIOMES[id];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(mood);
    const nodes = [];
    const t = synth.now();
    for (let i = 0; i < cfg.drones.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = cfg.dType;
      osc.frequency.setValueAtTime(midiToHz(cfg.drones[i]), t);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(cfg.dLp, t);
      const g = ctx.createGain();
      g.gain.value = cfg.dVol;
      // A very slow wobble so the drone breathes.
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.05 + i * 0.03, t);
      lfoGain.gain.value = cfg.dVol * 0.35;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(lp);
      lp.connect(g);
      g.connect(gain);
      osc.start(t);
      lfo.start(t);
      nodes.push(osc, lfo);
    }
    if (cfg.rumble) {
      const src = ctx.createBufferSource();
      src.buffer = synth.noiseBuffer();
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(140, t);
      const g = ctx.createGain();
      g.gain.value = cfg.rumble;
      src.connect(lp);
      lp.connect(g);
      g.connect(gain);
      src.start(t);
      nodes.push(src);
    }
    return { gain, nodes, stopAt: null, next: [] };
  }

  function stopLayer(L) {
    for (let i = 0; i < L.nodes.length; i++) {
      try {
        L.nodes[i].stop();
      } catch (e) {
        // Already stopped.
      }
    }
    try {
      L.gain.disconnect();
    } catch (e) {
      // Already gone.
    }
  }

  function setBiome(id) {
    if (!BIOMES[id]) return;
    if (id === current && layers[id]) return;
    const t = synth.now();
    const old = layers[current];
    if (old) {
      old.gain.gain.setTargetAtTime(0, t, 1.0);
      old.stopAt = t + 6;
    }
    current = id;
    if (!layers[id]) layers[id] = makeLayer(id);
    layers[id].stopAt = null;
    layers[id].gain.gain.setTargetAtTime(1, t, 1.2);
  }

  // level 0 pauses the music. Small numbers make it softer.
  function setMood(level, seconds) {
    const v = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0.6;
    moodTarget = v;
    const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 1.2;
    mood.gain.setTargetAtTime(v, synth.now(), s / 3);
  }

  // Called a few times per second. Starts new notes a little ahead of time.
  function update(t) {
    for (const id in layers) {
      const L = layers[id];
      if (id !== current && L.stopAt !== null && t > L.stopAt) {
        stopLayer(L);
        delete layers[id];
      }
    }
    if (moodTarget <= 0.001 || !current || !layers[current]) return;
    const L = layers[current];
    const gens = BIOMES[current].gens;
    for (let i = 0; i < gens.length; i++) {
      const g = gens[i];
      if (L.next[i] === undefined) L.next[i] = t + rand(0.2, g.every[0]);
      if (t + LOOKAHEAD >= L.next[i]) {
        PLAYERS[g.fn](synth, L.gain, g);
        L.next[i] = Math.max(t, L.next[i]) + rand(g.every[0], g.every[1]);
      }
    }
  }

  return { setBiome, setMood, update, current: () => current, layerCount: () => Object.keys(layers).length };
}

export const MUSIC_BIOMES = Object.keys(BIOMES);
