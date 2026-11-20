// cinematics/snapDrama.js: freeze 80 ms, the rope whips, colour drains, 600 ms slow motion with falling fibres, a heavy thud,
// then Results enters calmly. The whole moment is 1100 ms. It never uses red and never shakes more than a 2 px nudge.
// "Slow motion" here is the overlay's own clock (the run is already over): after the freeze it runs at 0.35x for 600 ms.
import { once, ease, seg, glow, TOKENS } from './common.js';

export const SNAP_MS = 1100, FREEZE_MS = 80, SLOW_MS = 600, SLOW_RATE = 0.35;

// Maps real elapsed ms to the overlay's slowed clock ms.
export function slowClock(t) {
  if (t <= FREEZE_MS) return 0;
  const k = t - FREEZE_MS;
  if (k <= SLOW_MS) return k * SLOW_RATE;
  return SLOW_MS * SLOW_RATE + (k - SLOW_MS);
}

export function makeSnapDrama(layer, opts) {
  const o = opts || {};
  const go = once(o.onGo);
  const cue = typeof o.cue === 'function' ? o.cue : () => {};
  const cued = {}; const fire = (k) => { if (!cued[k]) { cued[k] = 1; cue(k); } };
  return {
    id: 'snapDrama', durationMs: SNAP_MS,
    update(t, p) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2;
      const frozen = t < FREEZE_MS;
      if (frozen) { fire('snap'); ctx.fillStyle = 'rgba(238,242,255,0.10)'; ctx.fillRect(0, 0, w, h); layer.setTint(0.1); return; }
      // colour drains over about 500 ms of real time and stays muted into Results
      layer.setTint(0.1 + 0.4 * seg(t, FREEZE_MS, 500, ease.inOut));
      // [INTEGRATE-1] The rope whip line and the falling fibres were a second copy of the renderer's own snap (rope.snap() and the
      // fibre bursts in effects.js SNAP), so they are gone: this overlay keeps the freeze veil, the colour drain, the thud and the wash.
      // the thud: a low dim pulse (no flash) at 380 ms plus a tiny 2 px settle of the glow
      if (t >= 380) { fire('thud'); const th = 1 - seg(t, 380, 260); glow(ctx, cx, h * 0.72, w * 0.7, TOKENS.shard, 0.08 * th); }
      // calm hand-off: soft dark wash so Results enters over quiet
      ctx.fillStyle = 'rgba(2,1,8,' + (0.5 * seg(p, 0.7, 0.3)) + ')'; ctx.fillRect(0, 0, w, h);
    },
    finish() { layer.clear(); go(); },
  };
}
