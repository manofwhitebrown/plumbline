// Generative adaptive music. Five biome keys plus a gentle menu key, all close relatives
// (see scale.js), so crossfades never clash. Nothing is a loop: a seeded random picks chords,
// phrases, rests and timing, so it varies but repeats exactly for the same seed.
//
// Layers: pad bed, sparse melody, low pulse (strain over 50%), rhythm layers that fade in
// with combo and depth, a stinger on biome entry, a resolution on Haul Up, a tense drop on Snap.
import { midiToHz, degreeToMidi } from './scale.js';
import { createRng } from './rng.js';
import { createVoices } from './voices.js';
import { warn } from './safe.js';
import { target } from './param.js';

export const STEP = 0.45; // one eighth note = one game beat
const LOOKAHEAD = 0.4;
// The score is written with small note volumes; this lifts it to a good level (set by offline loudness measurements).
const GAIN = 11;

const ss = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = (x) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

// pad.chords and mel degrees are scale-degree numbers (0 to 4 is one octave of the five-note scale).
// base values are MIDI notes that are a C; the key's tonic is added on top.
const PRESETS = {
  clay: {
    pad: { chords: [[0, 2, 3], [1, 3, 4], [0, 1, 3]], base: 48, lp: 900, vol: 0.05, bars: [2, 3] },
    mel: { voice: 'pluck', base: 60, lo: 0, hi: 9, chance: 0.8, vol: 0.075, dur: 1.3, bright: 0.45 },
    pulse: { base: 36, vol: 0.12 },
  },
  quartz: {
    pad: { chords: [[0, 2, 4], [1, 3, 5], [2, 4, 6]], base: 48, lp: 1800, vol: 0.045, bars: [2, 4] },
    mel: { voice: 'glass', base: 60, lo: 0, hi: 9, chance: 0.6, vol: 0.05, dur: 1.6 },
    pulse: { base: 36, vol: 0.11 },
  },
  amber: {
    pad: { chords: [[0, 2, 3], [1, 3, 4], [0, 2, 4]], base: 48, lp: 700, vol: 0.055, bars: [3, 4] },
    mel: { voice: 'pluck', base: 48, lo: 2, hi: 9, chance: 0.55, vol: 0.07, dur: 1.5, bright: 0.3 },
    pulse: { base: 36, vol: 0.12 },
  },
  magma: {
    pad: { chords: [[0, 2], [1, 3], [0, 3]], base: 36, lp: 500, vol: 0.06, bars: [3, 5] },
    mel: { voice: 'pluck', base: 48, lo: 0, hi: 6, chance: 0.4, vol: 0.06, dur: 1.6, bright: 0.25 },
    pulse: { base: 24, vol: 0.14 },
    ember: { vol: 0.04, every: [2, 3] },
    tex: { kind: 'rumble', vol: 0.05, dur: 10, every: [6, 9], freq: 110 },
  },
  void: {
    pad: { chords: [[0, 2], [1, 3], [0, 3]], base: 36, lp: 380, vol: 0.05, bars: [4, 6] },
    mel: { voice: 'glass', base: 60, lo: 0, hi: 7, chance: 0.3, vol: 0.04, dur: 2.2 },
    pulse: { base: 24, vol: 0.14 },
    tex: { kind: 'wind', vol: 0.04, dur: 9, every: [5, 8], freq: 380 },
  },
  abyss: {
    pad: { chords: [[0, 3], [1, 3], [0, 2]], base: 36, lp: 320, vol: 0.055, bars: [4, 6] },
    mel: { voice: 'glass', base: 48, lo: 0, hi: 7, chance: 0.25, vol: 0.04, dur: 2.6 },
    pulse: { base: 24, vol: 0.15 },
    tex: { kind: 'wind', vol: 0.045, dur: 10, every: [4, 7], freq: 300 },
  },
  menu: {
    pad: { chords: [[0, 2, 3], [1, 3, 4], [0, 3, 4]], base: 48, lp: 1100, vol: 0.04, bars: [3, 4] },
    mel: { voice: 'glass', base: 60, lo: 0, hi: 9, chance: 0.85, vol: 0.05, dur: 1.8 },
    pulse: null,
  },
};

export const MUSIC_BIOMES = ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss'];
const ARP = [0, 2, 3, 4, 5, 4, 3, 2];

export function createMusic(synth, voices, opts = {}) {
  const S = synth;
  const ctx = S.ctx;
  const V = voices || createVoices(S);
  const rng = createRng(opts.seed || 20260101);

  // mood scales the whole score (0 = silent). sting carries one-shots that must outlive a mood fade.
  const mood = ctx.createGain();
  const moodSend = ctx.createGain();
  const sting = ctx.createGain();
  const stingSend = ctx.createGain();
  mood.gain.value = 0.6 * GAIN;
  moodSend.gain.value = 0.6 * GAIN;
  sting.gain.value = GAIN;
  stingSend.gain.value = GAIN;
  mood.connect(S.buses.music);
  sting.connect(S.buses.music);
  try {
    moodSend.connect(S.buses.revMusic);
    stingSend.connect(S.buses.revMusic);
  } catch (e) {
    // No reverb bus: fine.
  }

  const layers = {};
  let current = null; // last biome the game told us about
  let mode = 'menu'; // 'menu' | 'run' | 'results'
  let moodTarget = 0.6;
  let nextTime = 0;
  let step = 0;
  let quietUntil = 0;
  let resultsUntil = 0;
  let lastT = 0;
  let lastDepth01 = -1;
  // Smoothed inputs: strain 0..1, combo count, depth in metres.
  const sm = { strain: 0, combo: 0, depth: 0 };
  const tg = { strain: 0, combo: 0, depth: 0 };
  const activeId = () => (mode === 'menu' ? 'menu' : mode === 'run' ? current : null);

  function ensureLayer(id) {
    if (layers[id]) return layers[id];
    const gain = ctx.createGain();
    const send = ctx.createGain();
    gain.gain.value = 0;
    send.gain.value = 0;
    gain.connect(mood);
    send.connect(moodSend);
    layers[id] = { id, gain, send, stopAt: null, chordAt: -1, queue: [], padQueue: [], motif: null, lastChord: -1, texAt: 0, emberAt: 0, arpIdx: 0 };
    return layers[id];
  }

  function stopLayer(L) {
    for (const n of [L.gain, L.send]) {
      try {
        n.disconnect();
      } catch (e) {
        // Already gone.
      }
    }
  }

  // Fade the active layer in and everything else out.
  function applyActive(t) {
    const a = activeId();
    if (a && PRESETS[a]) ensureLayer(a);
    for (const id in layers) {
      const L = layers[id];
      const on = id === a;
      try {
        target(L.gain.gain, on ? 1 : 0, t, on ? 1.0 : 0.7);
        target(L.send.gain, on ? 1 : 0, t, on ? 1.0 : 0.7);
      } catch (e) {
        warn('layer fade failed', e);
      }
      L.stopAt = on ? null : L.stopAt === null ? t + 8 : L.stopAt;
    }
    S.setSpace(a === 'menu' ? 'menu' : a || current || 'clay');
  }

  function setMode(m) {
    const next = m === 'run' || m === 'results' ? m : 'menu';
    if (next === mode) return;
    mode = next;
    if (mode === 'results') resultsUntil = S.now() + 9;
    applyActive(S.now());
  }

  function setBiome(id) {
    if (!PRESETS[id] || id === 'menu') return;
    const first = current === null;
    const changed = id !== current;
    current = id;
    ensureLayer(id);
    applyActive(S.now());
    if (changed && !first && mode === 'run') stinger(id);
  }

  // level 0 pauses the music. Small numbers make it softer.
  function setMood(level, seconds) {
    const v = Number.isFinite(level) ? clamp01(level) : 0.6;
    moodTarget = v;
    const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 1.2;
    const t = S.now();
    try {
      target(mood.gain, v * GAIN, t, s / 3);
      target(moodSend.gain, v * GAIN, t, s / 3);
    } catch (e) {
      warn('mood failed', e);
    }
  }

  // Which screen is open: 'drop' plays the biome score, 'results' goes quiet, anything else is the menu.
  function setScreen(id) {
    if (id === 'drop') {
      setMode('run');
      setMood(1, 1.2);
    } else if (id === 'results') {
      setMode('results');
      setMood(0, 1.0);
    } else {
      setMode('menu');
      setMood(0.6, 1.5);
    }
  }

  function setSeed(seed) {
    if (Number.isFinite(seed)) rng.reseed(seed);
  }

  // strain 0..1, combo (count), depth (metres). Smoothed inside update().
  function setIntensity(o) {
    if (!o || typeof o !== 'object') return;
    if (Number.isFinite(o.strain)) tg.strain = clamp01(o.strain);
    if (Number.isFinite(o.combo)) tg.combo = Math.max(0, o.combo);
    if (Number.isFinite(o.depth)) tg.depth = Math.max(0, o.depth);
  }

  const ONE = { music: true };
  const shot = (o) => ({ ...ONE, bus: sting, sendBus: stingSend, ...o });

  // A bright arpeggio and a pad swell when a new biome starts.
  function stinger(id, at) {
    const key = PRESETS[id] ? id : 'clay';
    const t0 = Math.max(S.now() + 0.05, at || 0);
    [0, 2, 3, 5].forEach((d, i) => {
      V.glass(shot({ freq: midiToHz(degreeToMidi(key, d, 72)), vol: 0.075 - i * 0.008, dur: 1.8, at: t0 + i * 0.09, send: 0.6, key: 'sting', maxKey: 5 }));
    });
    V.pad(shot({ freq: midiToHz(degreeToMidi(key, 0, 48)), vol: 0.06, dur: 4.2, attack: 0.9, lp: 1500, at: t0, send: 0.5, key: 'sting-pad', maxKey: 2 }));
  }

  // A calm resolution: a falling line that lands on the tonic, with a warm pad.
  function onHaul() {
    const key = current || 'clay';
    const t0 = S.now() + 0.25;
    [4, 3, 2, 0].forEach((d, i) => {
      V.pluck(shot({ freq: midiToHz(degreeToMidi(key, d, 60)), vol: 0.09, dur: 2.2, bright: 0.35, at: t0 + i * 0.26, send: 0.4, key: 'res', maxKey: 5 }));
    });
    [0, 2, 3].forEach((d) => V.pad(shot({ freq: midiToHz(degreeToMidi(key, d, 48)), vol: 0.05, dur: 4.5, attack: 0.7, lp: 1200, at: t0, send: 0.5, key: 'res-pad', maxKey: 3 })));
    V.glass(shot({ freq: midiToHz(degreeToMidi(key, 0, 84)), vol: 0.05, dur: 2.5, at: t0 + 1.0, send: 0.6, key: 'res', maxKey: 5 }));
    quietUntil = t0 + 3;
  }

  // A tense drop: the score cuts out and a low pair of notes falls apart, then silence.
  function onSnap() {
    const t = S.now();
    try {
      for (const id in layers) {
        target(layers[id].gain.gain, 0, t, 0.04);
        target(layers[id].send.gain, 0, t, 0.04);
      }
    } catch (e) {
      warn('snap fade failed', e);
    }
    V.sub(shot({ freq: 96, slideTo: 26, vol: 0.28, dur: 1.8, attack: 0.01, at: t + 0.02, key: 'drop', maxKey: 2 }));
    V.sub(shot({ freq: 96 * 1.0595, slideTo: 24, vol: 0.18, dur: 1.6, attack: 0.01, at: t + 0.02, key: 'drop', maxKey: 2 }));
    quietUntil = t + 2.6;
    nextTime = 0;
  }

  // ---- The score ----
  function newMotif(P) {
    const n = 2 + rng.int(4);
    let deg = P.lo + rng.int(P.hi - P.lo + 1);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ deg, gap: rng.pick([1, 2, 2, 3]) });
      deg = Math.min(P.hi, Math.max(P.lo, deg + rng.pick([-2, -1, -1, 0, 1, 1, 2])));
    }
    return out;
  }

  function mutate(motif, P) {
    const m = motif.map((x) => ({ ...x }));
    const r = rng.next();
    if (r < 0.4) {
      const i = rng.int(m.length);
      m[i].deg = Math.min(P.hi, Math.max(P.lo, m[i].deg + rng.pick([-2, -1, 1, 2])));
    } else if (r < 0.65 && m.length > 2) m.pop();
    else if (r < 0.9) m[rng.int(m.length)].gap = rng.pick([1, 2, 3]);
    else for (const x of m) x.deg = Math.min(P.hi, Math.max(P.lo, x.deg + 2));
    return m;
  }

  function runStep(n, at) {
    const id = activeId();
    const L = id && layers[id];
    const P = PRESETS[id];
    if (!L || !P) return;
    const pos = n % 8;
    const bar = Math.floor(n / 8);
    const low = S.isLow();
    const m = (o) => ({ music: true, bus: L.gain, sendBus: L.send, ...o });

    // Pad bed: a new chord every few bars, picked at random but never the same twice in a row.
    if (n >= L.chordAt) {
      let i = rng.int(P.pad.chords.length);
      if (i === L.lastChord && P.pad.chords.length > 1) i = (i + 1) % P.pad.chords.length;
      L.lastChord = i;
      const bars = P.pad.bars[0] + rng.int(P.pad.bars[1] - P.pad.bars[0] + 1);
      const chord = low ? P.pad.chords[i].slice(0, 2) : P.pad.chords[i];
      // The notes of a chord come in one step apart, like a slow arpeggio, so a chord change is soft.
      chord.forEach((d, j) => L.padQueue.push({ step: n + j, deg: d, len: bars * 8 * STEP + 2 - j * STEP }));
      L.chordAt = n + bars * 8;
    }
    while (L.padQueue.length && L.padQueue[0].step <= n) {
      const p = L.padQueue.shift();
      if (p.step < n) continue;
      V.pad(m({ freq: midiToHz(degreeToMidi(id, p.deg, P.pad.base)), vol: P.pad.vol, dur: p.len, attack: 2.4, lp: P.pad.lp, detune: rng.range(6, 12), at: at + rng.range(0, 0.1), send: 0.4, key: 'mpad', maxKey: 6 }));
    }

    // Textures: slow wind or rumble under the bed.
    if (P.tex && !low && n >= L.texAt) {
      V.texture(m({ ...P.tex, at, send: 0.3, key: 'mtex', maxKey: 1 }));
      L.texAt = n + 8 * (P.tex.every[0] + rng.int(P.tex.every[1] - P.tex.every[0] + 1));
    }
    if (P.ember && n >= L.emberAt) {
      V.dust(m({ vol: P.ember.vol, dur: 1.6, count: 4, at, send: 0.2 }));
      L.emberAt = n + 8 * (P.ember.every[0] + rng.int(P.ember.every[1] - P.ember.every[0] + 1));
    }

    // Melody: a phrase now and then, sometimes a varied replay of the last one, plenty of rests.
    if (pos === 0 && L.queue.length === 0 && rng.chance(P.mel.chance)) {
      const motif = L.motif && rng.chance(0.4) ? mutate(L.motif, P.mel) : newMotif(P.mel);
      L.motif = motif;
      let s = n + rng.int(3);
      for (const x of motif) {
        L.queue.push({ step: s, deg: x.deg });
        s += x.gap;
      }
    }
    while (L.queue.length && L.queue[0].step <= n) {
      const note = L.queue.shift();
      if (note.step < n) continue;
      const f = midiToHz(degreeToMidi(id, note.deg, P.mel.base));
      const o = m({ freq: f, vol: P.mel.vol * rng.range(0.8, 1.1), dur: P.mel.dur, at: at + rng.range(0, 0.03), send: 0.4, pan: rng.range(-0.35, 0.35), key: 'mmel', maxKey: 3 });
      if (P.mel.voice === 'pluck') V.pluck({ ...o, bright: P.mel.bright, lp: 3200 });
      else V.glass(o);
    }

    // Low pulse: enters when strain passes 50% and gets stronger toward the snap.
    const lv = ss((sm.strain - 0.5) / 0.5);
    if (P.pulse && lv > 0.03 && pos % 2 === 0) {
      const strong = pos === 0 || pos === 4;
      if (strong || lv > 0.6) {
        const deg = bar % 4 === 3 && pos === 4 ? 3 : 0;
        const f = midiToHz(degreeToMidi(id, deg, P.pulse.base));
        V.sub(m({ freq: f, slideTo: f * 0.85, vol: P.pulse.vol * lv * (strong ? 1 : 0.55), dur: 0.55, attack: 0.02, at, key: 'mpulse', maxKey: 2 }));
      }
    }

    // Rhythm layers fade in with combo and depth.
    const I = Math.max(clamp01(sm.combo / 10), clamp01(sm.depth / 500) * 0.7);
    const f1 = ss((I - 0.15) / 0.25);
    const f2 = ss((I - 0.4) / 0.25);
    const f3 = ss((I - 0.65) / 0.25);
    if (f1 > 0.02 && (!low || pos % 2 === 0)) {
      S.noise({ filter: 'highpass', freq: 7000, dur: 0.04, attack: 0.003, vol: 0.02 * f1 * (pos % 2 ? 0.6 : 1), at, music: true, bus: L.gain, key: 'mhat', maxKey: 2 });
    }
    if (f2 > 0.02 && (pos === 2 || pos === 6 || (pos === 7 && rng.chance(0.3)))) {
      V.click(m({ freq: 300, drop: 0.6, vol: 0.06 * f2, dur: 0.09, at, key: 'mknock', maxKey: 2 }));
    }
    if (f3 > 0.02 && !low && rng.chance(0.65)) {
      const d = ARP[(L.arpIdx++) % ARP.length];
      V.pluck(m({ freq: midiToHz(degreeToMidi(id, d, 60)), vol: 0.035 * f3, dur: 0.45, bright: 0.6, at, send: 0.3, key: 'marp', maxKey: 3 }));
    }
  }

  // Called a few times per second with the current time. Starts notes a little ahead of time.
  function update(t) {
    try {
      for (const id in layers) {
        const L = layers[id];
        if (id !== activeId() && L.stopAt !== null && t > L.stopAt) {
          stopLayer(L);
          delete layers[id];
        }
      }
      if (mode === 'results' && resultsUntil && t > resultsUntil) setScreen('menu');
      const dt = Math.min(1, Math.max(0, t - lastT));
      lastT = t;
      const k = Math.min(1, dt * 0.9);
      sm.strain += (tg.strain - sm.strain) * k;
      sm.combo += (tg.combo - sm.combo) * k;
      sm.depth += (tg.depth - sm.depth) * k;
      const d01 = clamp01(sm.depth / 600);
      if (Math.abs(d01 - lastDepth01) > 0.02) {
        lastDepth01 = d01;
        S.setSpace(undefined, d01);
      }
      if (moodTarget <= 0.001 || !activeId() || !layers[activeId()]) {
        nextTime = 0;
        return;
      }
      if (t < quietUntil) return;
      if (!nextTime || nextTime < t - 0.5) nextTime = t + 0.1;
      let guard = 0;
      while (nextTime < t + LOOKAHEAD && guard++ < 16) {
        runStep(step, nextTime);
        step++;
        nextTime += STEP;
      }
    } catch (e) {
      warn('music update failed', e);
    }
  }

  // Start with the menu score ready, and a layer for the first biome.
  ensureLayer('menu');
  applyActive(S.now());

  return {
    setBiome,
    setMood,
    setMode,
    setScreen,
    setSeed,
    setIntensity,
    stinger,
    onHaul,
    onSnap,
    update,
    current: () => current,
    mode: () => mode,
    layerCount: () => Object.keys(layers).length,
    state: () => ({ mode, step, strain: sm.strain, combo: sm.combo, depth: sm.depth }),
  };
}
