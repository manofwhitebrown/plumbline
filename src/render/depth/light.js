// Light state: gem pulses on the walls, lantern flicker, slow breathing exposure.
// A fixed pool of pulses (no growth). Drawing happens in walls.js on the layer.
import { LIGHT } from './constants.js';
import { fin, clamp, clamp01 } from './math.js';

export function createLight() {
  const pulses = [];
  for (let i = 0; i < LIGHT.pulseSlots; i++) pulses.push({ live: false, t: 0, side: -1, y: 0, tier: 1 });
  let reduce = false, time = 0, bucketY = 240, laneCount = 4;
  const L = {
    pulses, flicker: 1, exposure: 0.04, live: 0,
    setReduceMotion(v) { reduce = !!v; if (reduce) L.clear(); },
    setBucket(y, lanes) { bucketY = clamp(fin(y, bucketY), 0, 4000); laneCount = lanes > 0 ? lanes : laneCount; },
    clear() { for (const p of pulses) p.live = false; L.live = 0; },
    push(ev) {
      if (reduce || !ev || ev.t !== 'COLLECT') return;
      const slot = pulses.find((p) => !p.live) || pulses.reduce((a, b) => (a.t > b.t ? a : b)); // reuse the oldest one
      slot.live = true; slot.t = 0; slot.tier = clamp(Math.floor(fin(ev.item && ev.item.tier, 1)), 1, 6);
      slot.side = fin(ev.lane) < laneCount / 2 ? -1 : 1; slot.y = bucketY;
    },
    update(dtMs, timeMs) {
      const dt = clamp(fin(dtMs), 0, 250); time = fin(timeMs, time + dt);
      let live = 0;
      for (const p of pulses) { if (!p.live) continue; p.t += dt; if (p.t > LIGHT.pulseAttackMs + LIGHT.pulseDecayMs * 4) p.live = false; else live++; }
      L.live = live;
      if (reduce) { L.flicker = 1; L.exposure = 0.04; return; }
      L.flicker = 1 + LIGHT.flicker * (0.55 * Math.sin(time * 0.0131) + 0.45 * Math.sin(time * 0.0317 + 1.7));
      L.exposure = 0.04 + LIGHT.breathAmp * Math.sin(time * 0.001 * 2 * Math.PI * LIGHT.breathHz);
    },
    // 0..1 strength of a pulse right now
    env(p) { const a = LIGHT.pulseAttackMs; return p.t < a ? p.t / a : Math.exp(-(p.t - a) / LIGHT.pulseDecayMs); },
  };
  return L;
}
