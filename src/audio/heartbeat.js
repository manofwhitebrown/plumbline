// The strain heartbeat and rope creaks.
// From 75% strain a heartbeat starts. Toward 100% it speeds up, gets louder and gets lower.
// Rope creaks begin a little earlier, at 60%.
import { createVoices } from './voices.js';
import { createRng } from './rng.js';

export function createHeartbeat(synth, voices) {
  const V = voices || createVoices(synth);
  const rng = createRng(31337);
  let next = 0;
  let creakNext = 0;

  return {
    // Called a few times per second with the current time and strain from 0 to 1.
    update(t, strain01) {
      const s = Number.isFinite(strain01) ? strain01 : 0;
      if (s < 0.6) {
        next = 0;
        creakNext = 0;
        return;
      }
      const k = Math.min(1, Math.max(0, (s - 0.75) / 0.25));
      if (s >= 0.75) {
        if (next === 0 || t - next > 1) next = t;
        if (t >= next - 0.05) {
          const at = Math.max(t, next);
          const vol = 0.16 + 0.34 * k;
          const f = 64 - 20 * k; // lower as it gets worse
          // Lub... dub.
          V.sub({ freq: f, slideTo: f * 0.68, vol, dur: 0.18, at, key: 'beat', maxKey: 4 });
          V.thud({ freq: 118 - 20 * k, vol: vol * 0.45, dur: 0.1, at, key: 'beat', maxKey: 4 });
          V.sub({ freq: f * 0.85, slideTo: f * 0.6, vol: vol * 0.7, dur: 0.15, at: at + 0.17 - 0.03 * k, key: 'beat', maxKey: 4 });
          next = at + 1.0 - 0.6 * k;
        }
      } else {
        next = 0;
      }
      if (creakNext === 0 || t - creakNext > 8) creakNext = t + rng.range(0.4, 1.6);
      if (t >= creakNext - 0.05) {
        const sev = Math.min(1, (s - 0.6) / 0.4);
        V.creak({ freq: rng.range(300, 620) - 120 * sev, dur: rng.range(0.4, 0.9), vol: 0.04 + 0.1 * sev, at: Math.max(t, creakNext), pan: rng.range(-0.3, 0.3), send: 0.3 });
        creakNext = Math.max(t, creakNext) + rng.range(1.2, 3.2) * (1.2 - 0.6 * sev);
      }
    },
    reset() {
      next = 0;
      creakNext = 0;
    },
  };
}
