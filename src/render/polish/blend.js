// Biome blend: over the last 15 m before an edge the next biome's gradient fades in. Never a colour jump.
import { blendInfo, biomePalette, fin, clamp01 } from './util.js';

export function createBlend() {
  let grads = null, gctx = null, gh = 0;
  const api = {
    resize() { grads = null; },
    // Draws the next biome's gradient with alpha t (max 0.9, so the well's own cross-fade finishes the job).
    draw(ctx, state, w, h) {
      const info = blendInfo(state.biomeId, state.depth);
      if (!info.to || info.t <= 0.002) return 0;
      if (!grads || gctx !== ctx || gh !== h) { grads = {}; gctx = ctx; gh = h; }
      let g = grads[info.to];
      if (!g) {
        const p = biomePalette(info.to);
        g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, p.top); g.addColorStop(1, p.bottom);
        grads[info.to] = g;
      }
      const a = clamp01(info.t) * 0.9;
      ctx.globalAlpha = a; ctx.fillStyle = g;
      ctx.fillRect(-24, -24, w + 48, h + 48);
      ctx.globalAlpha = 1;
      return a;
    },
  };
  return api;
}
