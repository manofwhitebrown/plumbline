// The strain heartbeat. It starts at 75% strain and gets faster and louder up to 100%.

export function createHeartbeat(synth) {
  let next = 0;

  return {
    // Called a few times per second with the current time and strain from 0 to 1.
    update(t, strain01) {
      const s = Number.isFinite(strain01) ? strain01 : 0;
      if (s < 0.75) {
        next = 0;
        return;
      }
      const k = Math.min(1, (s - 0.75) / 0.25);
      if (next === 0 || t - next > 1) next = t;
      if (t < next - 0.05) return;
      const vol = 0.15 + 0.35 * k;
      const interval = 1.0 - 0.6 * k;
      // Lub... dub.
      synth.tone({ freq: 60, slideTo: 42, vol, dur: 0.14 });
      synth.tone({ freq: 110, slideTo: 70, vol: vol * 0.4, dur: 0.1 });
      synth.tone({ freq: 52, slideTo: 38, vol: vol * 0.7, dur: 0.12, delay: 0.16 });
      next = Math.max(t, next) + interval;
    },
    reset() {
      next = 0;
    },
  };
}
