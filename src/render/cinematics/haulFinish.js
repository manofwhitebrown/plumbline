// cinematics/haulFinish.js: speed lines whoosh over the renderer's own haul (rope and bucket rise in the world), then onGo shows
// Results (which rises over it). 800 ms. onGo runs exactly once.
import { once, seg, rgba, TOKENS } from './common.js';

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
      // [INTEGRATE-1] The real rope, the real bucket lifting and the gold streaks are drawn by the renderer (effects.js HAUL).
      // This overlay used to draw a second rope, a second (glyph) bucket and a second golden streak on top of them.
      // It now owns only what is screen-wide: the speed lines, the wash into Results, and the cue.
      fire('haul');
      // speed lines whoosh (quick, ease-out, light)
      const wh = seg(p, 0.15, 0.5), wa = Math.sin(Math.min(1, wh) * Math.PI);
      if (wa > 0.01) { ctx.strokeStyle = rgba(TOKENS.text, 0.42 * wa); ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < LINES; i++) { const x = lineX[i] * w, y0 = (h * (1 - ((wh * lineS[i] * 1.6 + lineX[i]) % 1))); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 40 + 60 * lineS[i]); } ctx.stroke(); fire('whoosh'); }
      // fade to the results: a soft dark wash in the last third, so Results rises over calm dark
      ctx.fillStyle = 'rgba(2,1,8,' + (0.55 * seg(p, 0.6, 0.4)) + ')'; ctx.fillRect(0, 0, w, h);
    },
    finish() { layer.clear(); go(); },
  };
}
