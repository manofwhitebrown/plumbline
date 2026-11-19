// Interface sounds. One soft family: warm low-index FM bells, tiny woodblock clicks and a touch of air.
// Never harsh, and each one is over in about a quarter of a second.
import { degreeToMidi, midiToHz } from './scale.js';
import { createVoices } from './voices.js';

const clamp01 = (x) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

export function createUiSounds(synth, voices) {
  const S = synth;
  const V = voices || createVoices(S);
  const lastAt = {};
  const ub = (o) => V.bell({ ratio: 2, index: 0.5, modEnd: 0.05, key: 'ui', maxKey: 6, ...o });

  // Each sound gets an optional argument (slider position, toggle state, charge progress).
  const sounds = {
    tap() {
      ub({ freq: 880, vol: 0.1, dur: 0.1 });
    },
    buy() {
      ub({ freq: 1175, vol: 0.1, dur: 0.16 });
      ub({ freq: 1760, vol: 0.09, dur: 0.22, delay: 0.07, send: 0.2 });
      S.duck(0.75, 0.15, 0.5);
    },
    deny() {
      V.click({ freq: 190, drop: 0.8, vol: 0.12, dur: 0.12 });
      V.click({ freq: 142, drop: 0.8, vol: 0.12, dur: 0.14, delay: 0.1 });
    },
    open() {
      V.whoosh({ from: 500, to: 1800, q: 0.9, dur: 0.14, attack: 0.05, vol: 0.045 });
      ub({ freq: 660, vol: 0.06, dur: 0.12, delay: 0.04 });
    },
    close() {
      V.whoosh({ from: 1800, to: 500, q: 0.9, dur: 0.14, attack: 0.03, vol: 0.045 });
      ub({ freq: 520, vol: 0.06, dur: 0.12 });
    },
    claim() {
      [659, 784, 1047].forEach((f, i) => ub({ freq: f, vol: 0.09, dur: 0.28, delay: i * 0.06, send: 0.2 }));
      V.sparkle({ freq: 3100, vol: 0.03, delay: 0.1 });
      S.duck(0.7, 0.2, 0.6);
    },
    place() {
      V.click({ freq: 230, drop: 0.65, vol: 0.14, dur: 0.1 });
      S.noise({ filter: 'lowpass', freq: 700, dur: 0.06, vol: 0.04 });
    },
    remove() {
      V.click({ freq: 160, drop: 1.45, vol: 0.1, dur: 0.1 });
    },
    achievement() {
      ub({ freq: 784, vol: 0.11, dur: 0.3, send: 0.25 });
      ub({ freq: 1175, vol: 0.11, dur: 0.38, delay: 0.1, send: 0.25 });
      ub({ freq: 1568, vol: 0.07, dur: 0.34, delay: 0.17, send: 0.3 });
      V.sparkle({ freq: 3900, vol: 0.035, delay: 0.2 });
      S.duck(0.6, 0.3, 0.8);
    },
    daily() {
      for (let i = 0; i < 3; i++) ub({ freq: midiToHz(84 + i * 2), vol: 0.08, dur: 0.15, delay: i * 0.06 });
      ub({ freq: midiToHz(79), vol: 0.1, dur: 0.4, delay: 0.19, send: 0.3 });
      S.duck(0.65, 0.3, 0.8);
    },
    tab() {
      V.click({ freq: 760, drop: 0.85, vol: 0.08, dur: 0.06 });
      ub({ freq: 1320, vol: 0.04, dur: 0.07, delay: 0.01 });
    },
    // arg true = switched on (rises), false = off (falls)
    toggle(on) {
      const up = on !== false;
      ub({ freq: up ? 700 : 1050, vol: 0.08, dur: 0.1 });
      ub({ freq: up ? 1050 : 700, vol: 0.08, dur: 0.12, delay: 0.06 });
    },
    // arg 0 to 1: the slider position sets the pitch
    slider(v) {
      ub({ freq: 500 + clamp01(v) * 700, vol: 0.05, dur: 0.05 });
    },
    // arg 0 to 1: a hold-button charging up climbs the scale
    charge(p) {
      const pr = clamp01(p);
      ub({ freq: midiToHz(degreeToMidi('clay', Math.floor(pr * 9), 72)), vol: 0.05 + 0.05 * pr, dur: 0.08 });
    },
  };

  return {
    names: Object.keys(sounds),
    has: (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(sounds, name),
    // Ignores a repeat of the same sound within 30 ms, so spam taps stay clean.
    play(name, arg) {
      if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(sounds, name)) return false;
      const t = S.now();
      if (lastAt[name] !== undefined && t - lastAt[name] < 0.03) return false;
      lastAt[name] = t;
      sounds[name](arg);
      return true;
    },
  };
}
