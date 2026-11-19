// Game sound effects. Every event is a few layered voices from the voice library.
import { midiToHz, midiForCombo, degreeToMidi, keyFor } from './scale.js';
import { createVoices } from './voices.js';
import { createRng, hashString } from './rng.js';

const hz = (m) => midiToHz(m);

// env: { biome: () => id } tells sfx which key the current biome is in.
export function createSfx(synth, voices, env) {
  const S = synth;
  const V = voices || createVoices(S);
  const rng = createRng(9001);
  const keyId = () => (env && typeof env.biome === 'function' ? env.biome() : 'clay');

  // Gems: tier gives the timbre, the combo gives the pitch, lane gives the stereo position.
  function collect(tier, combo, delay, pan) {
    const k = Math.min(6, Math.max(1, Math.floor(Number(tier)) || 1));
    const key = keyId();
    const c = Number.isFinite(combo) && combo > 0 ? combo : 0;
    const f = hz(midiForCombo(c, key));
    const vol = 0.17 + Math.min(0.07, c * 0.004);
    const w = { delay: delay || 0, pan: pan || 0 };
    switch (k) {
      case 1: // glass
        V.glass({ ...w, freq: f, vol, dur: 0.75, send: 0.25 });
        break;
      case 2: // soft bell
        V.bell({ ...w, freq: f, ratio: 2, index: 0.7, modEnd: 0.05, vol, dur: 0.65, send: 0.2 });
        break;
      case 3: // warm plucked string with a low bell under it
        V.pluck({ ...w, freq: f, vol: vol * 1.15, dur: 1.0, bright: 0.4, lp: 3500, send: 0.25 });
        V.bell({ ...w, freq: f * 0.5, ratio: 1, index: 0.3, vol: vol * 0.5, dur: 0.8, send: 0.2 });
        break;
      case 4: // bright chime
        V.bell({ ...w, freq: f * 2, ratio: 3.99, index: 2.2, vol: vol * 0.8, dur: 0.9, send: 0.3 });
        V.bell({ ...w, freq: f, ratio: 2, index: 0.5, vol: vol * 0.5, dur: 0.6, send: 0.2 });
        break;
      case 5: // deep
        V.bell({ ...w, freq: f * 0.5, ratio: 1.5, index: 1.1, vol: vol * 1.2, dur: 1.5, send: 0.35 });
        V.sub({ ...w, freq: Math.max(40, f * 0.25), vol: vol * 0.7, dur: 0.9, attack: 0.02 });
        break;
      default: // shimmer
        V.glass({ ...w, freq: f, vol, dur: 1.1, send: 0.35 });
        V.glass({ ...w, freq: f * 2.003, detune: 8, vol: vol * 0.3, dur: 0.9, delay: w.delay + 0.05, send: 0.4 });
        break;
    }
    // A soft sparkle on top. Skipped for the late notes of a big run so the mix stays clean.
    if (w.delay <= 0.2) V.sparkle({ ...w, delay: w.delay + 0.02, freq: Math.min(9000, f * 4), vol: 0.03 + k * 0.004 });
  }

  // Ore is dull and heavy, not musical.
  function ore(delay, pan) {
    const w = { delay: delay || 0, pan: pan || 0 };
    V.thud({ ...w, freq: 150, vol: 0.18, dur: 0.15 });
    V.tick({ ...w, freq: 1400, vol: 0.05 });
  }

  function relic(delay, pan) {
    const key = keyId();
    const d = delay || 0;
    const w = { pan: pan || 0, send: 0.5 };
    [4, 6, 8].forEach((deg, i) => {
      V.glass({ ...w, freq: hz(degreeToMidi(key, deg, 72)), vol: 0.13 - i * 0.015, dur: 1.3, delay: d + i * 0.09 });
    });
    V.sparkle({ ...w, freq: 5000, vol: 0.04, delay: d + 0.25 });
  }

  const sfx = {
    collect,
    ore,
    relic,
    // A part fired: a tiny mechanical tick, tuned from the part's name.
    tick(partId) {
      const h = hashString(partId);
      const f = hz(degreeToMidi(keyId(), h % 5, 84));
      V.tick({ freq: Math.min(5200, f), vol: 0.045 });
    },
    // Items chained between lanes: a rising whoosh. pan values are -1 to 1.
    whoosh(panFrom, panTo) {
      V.whoosh({ from: 400, to: 3500, dur: 0.3, attack: 0.1, vol: 0.06, pan: panFrom || 0, panTo: Number.isFinite(panTo) ? panTo : undefined });
    },
    miss() {
      V.whoosh({ from: 700, to: 220, dur: 0.14, attack: 0.02, vol: 0.045, q: 0.8 });
    },
    hazardHit() {
      V.thud({ freq: 96, vol: 0.42, dur: 0.3, send: 0.15 });
      V.creak({ freq: 210, glide: 1.3, dur: 0.7, vol: 0.14, delay: 0.04, send: 0.3 });
      S.duck(0.6, 0.3, 0.8);
    },
    hazardAbsorbed() {
      V.clang({ freq: 1250, vol: 0.16, dur: 0.55, send: 0.3 });
      V.tick({ freq: 3200, vol: 0.05, delay: 0.01 });
    },
    // Rope twang, wood crack, deep boom, then a short silence.
    snap() {
      V.pluck({ freq: 196, bright: 0.9, bend: 0.55, vol: 0.3, dur: 0.9, send: 0.3 });
      V.crack({ vol: 0.32, delay: 0.02, send: 0.15 });
      V.boom({ vol: 0.55, delay: 0.05, dur: 2.0, send: 0.35 });
      V.creak({ freq: 140, glide: 1.4, dur: 0.8, vol: 0.12, delay: 0.1, send: 0.3 });
      S.duck(0.03, 2.2, 1.6);
    },
    // Rising whoosh, then a cascade of coins that climbs the scale.
    haul() {
      const key = keyId();
      V.whoosh({ from: 300, to: 3500, dur: 0.7, attack: 0.35, vol: 0.1, send: 0.3 });
      for (let i = 0; i < 9; i++) {
        const f = hz(degreeToMidi(key, 4 + i, 72));
        V.coin({ freq: Math.min(4800, f), vol: 0.12 - i * 0.007, delay: 0.12 + i * 0.058 + rng.next() * 0.02, pan: rng.range(-0.6, 0.6), send: 0.25 });
      }
      S.duck(0.5, 0.6, 1.2);
    },
    // Three-note fanfare on the tonic, third and fifth of the key.
    record() {
      const key = keyId();
      [0, 2, 4].forEach((deg, i) => {
        const f = hz(degreeToMidi(key, deg, 72));
        const dur = i === 2 ? 1.2 : 0.42;
        V.brass({ freq: f, vol: 0.11, dur, hold: dur * 0.3, delay: i * 0.14, send: 0.25 });
        V.bell({ freq: f * 2, ratio: 2, index: 0.5, vol: 0.07, dur: dur * 0.8, delay: i * 0.14, send: 0.3 });
      });
      V.sparkle({ freq: 4200, vol: 0.05, delay: 0.3 });
      S.duck(0.5, 0.8, 1.2);
    },
    // A swell when the biome changes.
    biome() {
      const key = keyFor(keyId());
      V.whoosh({ from: 200, to: 1400, q: 0.8, dur: 1.3, attack: 0.65, vol: 0.09, send: 0.4 });
      V.sub({ freq: hz(36 + key.tonic), vol: 0.2, dur: 1.6, attack: 0.5 });
    },
    // Every 50 m: a soft chime.
    milestone() {
      const key = keyId();
      V.glass({ freq: hz(degreeToMidi(key, 5, 84)), vol: 0.07, dur: 0.9, send: 0.4 });
      V.glass({ freq: hz(degreeToMidi(key, 7, 84)), vol: 0.05, dur: 0.9, delay: 0.09, send: 0.4 });
      S.duck(0.85, 0.2, 0.6);
    },
    // Deep bloom for Collapse.
    collapse() {
      [55, 82.4, 110].forEach((f, i) => V.sub({ freq: f, vol: 0.2 - i * 0.04, dur: 4, attack: 0.9, lp: 900, send: 0.3 }));
      V.texture({ kind: 'rumble', vol: 0.12, dur: 3.5, attack: 1.2 });
      V.whoosh({ from: 300, to: 1500, dur: 3, attack: 1.2, vol: 0.1, send: 0.4 });
      S.duck(0.3, 2.5, 2);
    },
  };
  return sfx;
}
