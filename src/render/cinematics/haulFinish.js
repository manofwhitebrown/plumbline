// cinematics/haulFinish.js: the rope winds, the bucket is hauled up with a golden streak, speed lines whoosh,
// then onGo shows Results (which rises over it). 900 ms. onGo runs exactly once.
import { once, ease, seg, glow, rgba, bucketGlyph, TOKENS } from './common.js';

export const HAUL_MS = 800;
const LINES = 22;

export function makeHaulFinish(layer, opts) {
  const o = opts || {};
  const go = once(o.onGo);
  const cue = typeof o.cue === 'function' ? o.cue : () => {};
  const cued = {}; const fire = (k) => { if (!cued[k]) { cued[k] = 1; cue(k); } };
  const r = layer.pool.rnd;
  const lineX = [], lineS = [];
  for (let i = 0; i < LINES; i++) { lineX.push(r()); lineS.push(0.5 + r()); }
  return {
    id: 'haulFinish', durationMs: HAUL_MS,
    update(t, p) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2;
      const rise = seg(p, 0.05, 0.52, ease.in), by = h * 0.62 - rise * h * 0.75;
      // rope winds: tick marks slide up along the rope
      ctx.strokeStyle = rgba(TOKENS.goldSoft, 0.7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, by - 14); ctx.stroke();
      for (let i = 0; i < 12; i++) { const y = ((i * 46 - t * 0.9) % (h * 0.9) + h * 0.9) % (h * 0.9); if (y < by - 20) { ctx.fillStyle = rgba(TOKENS.goldSoft, 0.5); ctx.fillRect(cx - 3, y, 6, 2); } }
      // golden streak under the bucket
      const sa = seg(p, 0.1, 0.2) * (1 - seg(p, 0.65, 0.3));
      const g = ctx.createLinearGradient(0, by, 0, by + h * 0.5); g.addColorStop(0, rgba(TOKENS.gold, 0.55 * sa)); g.addColorStop(1, rgba(TOKENS.gold, 0));
      ctx.fillStyle = g; ctx.fillRect(cx - 10, by, 20, h * 0.5);
      glow(ctx, cx, by, 90, TOKENS.goldSoft, 0.35 * sa);
      bucketGlyph(ctx, cx, by, 34, 1); fire('haul');
      // speed lines whoosh (quick, ease-out, light)
      const wh = seg(p, 0.15, 0.5), wa = Math.sin(Math.min(1, wh) * Math.PI);
      if (wa > 0.01) { ctx.strokeStyle = rgba(TOKENS.text, 0.42 * wa); ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < LINES; i++) { const x = lineX[i] * w, y0 = (h * (1 - ((wh * lineS[i] * 1.6 + lineX[i]) % 1))); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 40 + 60 * lineS[i]); } ctx.stroke(); fire('whoosh'); }
      // fade to the results: a soft dark wash in the last third, so Results rises over calm dark
      ctx.fillStyle = 'rgba(2,1,8,' + (0.55 * seg(p, 0.6, 0.4)) + ')'; ctx.fillRect(0, 0, w, h);
    },
    finish() { layer.clear(); go(); },
  };
}
