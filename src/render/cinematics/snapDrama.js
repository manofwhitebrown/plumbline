// cinematics/snapDrama.js: freeze 80 ms, the rope whips, colour drains, 600 ms slow motion with falling fibres, a heavy thud,
// then Results enters calmly. The whole moment is 1100 ms. It never uses red and never shakes more than a 2 px nudge.
// "Slow motion" here is the overlay's own clock (the run is already over): after the freeze it runs at 0.35x for 600 ms.
import { once, ease, seg, glow, rgba, TOKENS } from './common.js';

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
  let lastT = 0, emitted = 0;
  return {
    id: 'snapDrama', durationMs: SNAP_MS,
    update(t, p) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2;
      const c = slowClock(t), dt = Math.max(0, t - lastT); lastT = t;
      const frozen = t < FREEZE_MS;
      if (frozen) { fire('snap'); ctx.fillStyle = 'rgba(238,242,255,0.10)'; ctx.fillRect(0, 0, w, h); layer.setTint(0.1); return; }
      // colour drains over about 500 ms of real time and stays muted into Results
      layer.setTint(0.1 + 0.4 * seg(t, FREEZE_MS, 500, ease.inOut));
      // rope whip: a decaying travelling wave from the top
      const whip = seg(c, 0, 220, ease.out), decay = 1 - seg(c, 40, 260);
      ctx.strokeStyle = rgba(TOKENS.goldSoft, 0.8 * (1 - seg(c, 160, 160))); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const y = (i / 20) * h * 0.55 * whip; const x = cx + Math.sin(i * 0.9 - c * 0.04) * 26 * decay * (i / 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // falling fibres, slow (they live on the slowed clock)
      if (emitted < 36 && t < 420) { for (let i = 0; i < 3; i++) { layer.pool.emit(cx + (layer.pool.rnd() - 0.5) * 30, h * 0.12 + layer.pool.rnd() * h * 0.2, (layer.pool.rnd() - 0.5) * 24, 10 + layer.pool.rnd() * 20, 1400, 1.4, TOKENS.goldSoft, 18, 2); emitted++; } }
      layer.pool.update(dt * (t < FREEZE_MS + SLOW_MS ? SLOW_RATE : 0.6));
      layer.pool.draw(ctx);
      // the thud: a low dim pulse (no flash) at 380 ms plus a tiny 2 px settle of the glow
      if (t >= 380) { fire('thud'); const th = 1 - seg(t, 380, 260); glow(ctx, cx, h * 0.72, w * 0.7, TOKENS.shard, 0.08 * th); }
      // calm hand-off: soft dark wash so Results enters over quiet
      ctx.fillStyle = 'rgba(2,1,8,' + (0.5 * seg(p, 0.7, 0.3)) + ')'; ctx.fillRect(0, 0, w, h);
    },
    finish() { layer.clear(); go(); },
  };
}
