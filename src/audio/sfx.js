// Game sound effects, built from synth voices.
import { noteForCombo, midiToHz } from './scale.js';

// How each gem tier sounds: glassy, soft, warm, bright, deep, shimmering.
const TIMBRE = {
  1: { type: 'sine', part: 2.76, pv: 0.3, dur: 0.6, lp: 7000, mul: 1 },
  2: { type: 'triangle', part: 2, pv: 0.12, dur: 0.55, lp: 3500, mul: 1 },
  3: { type: 'sine', part: 0.5, pv: 0.45, dur: 0.8, lp: 2200, mul: 1 },
  4: { type: 'triangle', part: 3, pv: 0.35, dur: 0.5, lp: 9000, mul: 1 },
  5: { type: 'sine', part: 1.5, pv: 0.3, dur: 1.0, lp: 1800, mul: 0.5 },
  6: { type: 'sine', part: 4, pv: 0.25, dur: 1.1, lp: 12000, mul: 1, shimmer: true },
};

export function createSfx(synth) {
  const S = synth;

  function collect(tier, combo, delay) {
    const k = Math.min(6, Math.max(1, Math.floor(Number(tier)) || 1));
    const t = TIMBRE[k];
    const f = noteForCombo(combo) * t.mul;
    const c = Number.isFinite(combo) && combo > 0 ? combo : 0;
    const vol = 0.2 + Math.min(0.1, c * 0.005);
    S.tone({ freq: f, type: t.type, vol, dur: t.dur, lp: t.lp, delay });
    S.tone({ freq: f * t.part, vol: vol * t.pv, dur: t.dur * 0.5, delay });
    if (t.shimmer) {
      S.tone({ freq: f * 2.003, vol: vol * 0.3, dur: 0.9, delay: (delay || 0) + 0.05, detune: 8 });
    }
  }

  // Ore is dull and heavy, not musical.
  function ore(delay) {
    S.noise({ filter: 'bandpass', freq: 1800, dur: 0.06, vol: 0.08, delay });
    S.tone({ freq: 180, type: 'triangle', vol: 0.14, dur: 0.15, delay });
  }

  function relic(delay) {
    S.tone({ freq: midiToHz(79), vol: 0.16, dur: 1.0, delay });
    S.tone({ freq: midiToHz(84), vol: 0.14, dur: 1.2, delay: (delay || 0) + 0.1 });
    S.tone({ freq: midiToHz(84) * 2.76, vol: 0.04, dur: 0.6, delay: (delay || 0) + 0.1 });
  }

  const sfx = {
    collect,
    ore,
    relic,
    tick() {
      S.tone({ freq: 1800, vol: 0.03, dur: 0.04, attack: 0.003 });
    },
    whoosh() {
      S.noise({ filter: 'bandpass', freq: 600, freqTo: 2000, q: 1.5, dur: 0.25, vol: 0.05 });
    },
    miss() {
      S.noise({ filter: 'lowpass', freq: 300, dur: 0.12, vol: 0.06 });
    },
    hazardHit() {
      S.tone({ freq: 90, slideTo: 50, vol: 0.35, dur: 0.25 });
      S.noise({ filter: 'lowpass', freq: 500, dur: 0.2, vol: 0.15 });
    },
    hazardAbsorbed() {
      S.tone({ freq: 700, type: 'triangle', vol: 0.12, dur: 0.2 });
      S.tone({ freq: 1050, vol: 0.06, dur: 0.12 });
    },
    // Rope twang, then a low thud.
    snap() {
      S.tone({ freq: 320, slideTo: 90, type: 'sawtooth', vol: 0.22, dur: 0.6, lp: 1500 });
      S.tone({ freq: 60, slideTo: 35, vol: 0.5, dur: 0.6, delay: 0.03 });
      S.noise({ filter: 'lowpass', freq: 900, dur: 0.25, vol: 0.18 });
      S.duck(0.35, 0.6, 1.5);
    },
    // Rising whoosh, then a cascade of coins.
    haul() {
      S.noise({ filter: 'bandpass', freq: 300, freqTo: 3000, q: 1, dur: 0.7, attack: 0.3, vol: 0.12 });
      for (let i = 0; i < 8; i++) {
        const midi = 72 + [0, 2, 4, 7, 9, 12, 14, 16][i];
        S.tone({ freq: midiToHz(midi), vol: 0.13 - i * 0.008, dur: 0.35, delay: 0.1 + i * 0.06 });
      }
      S.duck(0.5, 0.5, 1.2);
    },
    // Bright fanfare of three notes.
    record() {
      const notes = [72, 76, 79];
      for (let i = 0; i < 3; i++) {
        const dur = i === 2 ? 1.2 : 0.4;
        S.tone({ freq: midiToHz(notes[i]), type: 'triangle', vol: 0.18, dur, delay: i * 0.14 });
        S.tone({ freq: midiToHz(notes[i] + 12), vol: 0.07, dur: dur * 0.7, delay: i * 0.14 });
      }
      S.duck(0.5, 0.8, 1.2);
    },
    biome() {
      S.noise({ filter: 'bandpass', freq: 200, freqTo: 1200, q: 0.8, dur: 1.2, attack: 0.6, vol: 0.1 });
      S.tone({ freq: 130, vol: 0.12, dur: 1.4, attack: 0.6 });
    },
    milestone() {
      S.tone({ freq: midiToHz(84), vol: 0.08, dur: 0.9 });
      S.tone({ freq: midiToHz(88), vol: 0.06, dur: 0.9, delay: 0.08 });
    },
    // Deep bloom for Collapse.
    collapse() {
      const low = [55, 82.4, 110];
      for (let i = 0; i < low.length; i++) {
        S.tone({ freq: low[i], vol: 0.22 - i * 0.04, dur: 4, attack: 0.9, lp: 900 });
      }
      S.noise({ filter: 'lowpass', freq: 300, freqTo: 1500, dur: 3, attack: 1.2, vol: 0.14 });
      S.duck(0.3, 2.5, 2);
    },
  };
  return sfx;
}
