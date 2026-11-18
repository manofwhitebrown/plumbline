// Small interface sounds: taps, buying, opening panels, rewards.
import { midiToHz } from './scale.js';

export function createUiSounds(synth) {
  const S = synth;
  const lastAt = {};

  const sounds = {
    tap() {
      S.tone({ freq: 880, vol: 0.09, dur: 0.07, attack: 0.004 });
    },
    buy() {
      S.tone({ freq: 1175, vol: 0.1, dur: 0.12 });
      S.tone({ freq: 1760, vol: 0.09, dur: 0.25, delay: 0.07 });
    },
    deny() {
      S.tone({ freq: 150, type: 'triangle', vol: 0.12, dur: 0.12 });
      S.tone({ freq: 120, type: 'triangle', vol: 0.12, dur: 0.14, delay: 0.1 });
    },
    open() {
      S.noise({ filter: 'bandpass', freq: 400, freqTo: 1400, dur: 0.15, vol: 0.05 });
      S.tone({ freq: 660, vol: 0.05, dur: 0.1, delay: 0.04 });
    },
    close() {
      S.noise({ filter: 'bandpass', freq: 1400, freqTo: 400, dur: 0.15, vol: 0.05 });
      S.tone({ freq: 520, vol: 0.05, dur: 0.1 });
    },
    claim() {
      const notes = [76, 79, 84];
      for (let i = 0; i < 3; i++) S.tone({ freq: midiToHz(notes[i]), vol: 0.1, dur: 0.4, delay: i * 0.08 });
    },
    place() {
      S.tone({ freq: 220, slideTo: 160, type: 'triangle', vol: 0.14, dur: 0.09 });
      S.noise({ filter: 'lowpass', freq: 700, dur: 0.06, vol: 0.05 });
    },
    remove() {
      S.tone({ freq: 160, slideTo: 230, type: 'triangle', vol: 0.1, dur: 0.09 });
    },
    achievement() {
      S.tone({ freq: midiToHz(79), vol: 0.12, dur: 0.5 });
      S.tone({ freq: midiToHz(86), vol: 0.12, dur: 0.9, delay: 0.12 });
      S.tone({ freq: midiToHz(98), vol: 0.04, dur: 0.6, delay: 0.2 });
    },
    daily() {
      for (let i = 0; i < 3; i++) S.tone({ freq: midiToHz(84 + i * 2), vol: 0.09, dur: 0.18, delay: i * 0.07 });
      S.tone({ freq: midiToHz(79), vol: 0.1, dur: 0.8, delay: 0.25 });
    },
  };

  return {
    names: Object.keys(sounds),
    has: (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(sounds, name),
    // Ignores a repeat of the same sound within 30 ms, so spam taps stay clean.
    play(name) {
      if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(sounds, name)) return false;
      const t = S.now();
      if (lastAt[name] !== undefined && t - lastAt[name] < 0.03) return false;
      lastAt[name] = t;
      sounds[name]();
      return true;
    },
  };
}
