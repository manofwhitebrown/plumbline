// Lighting: a cool cone from the well mouth that fades with depth, a warm lantern glow on the bucket,
// a soft bloom where gems arrive, and danger polish (flicker + warmer glow) driven by the anticipation cue.
import { biomePalette, BIOME_IDS, clamp, clamp01, fin, smoothstep, makeCanvas, rgba } from './util.js';

const SPRITE = 128;

export function createLighting(getFactory) {
  let w = 360, h = 640, dpr = 1;
  const sprites = {};     // biome id -> offscreen radial glow (built once)
  let ember = null;       // warm danger glow sprite
  let cone = null, coneCtx = null;

  function glow(color) {
    const c = makeCanvas(getFactory(), SPRITE, SPRITE);
    const g = c && c.getContext && c.getContext('2d');
    if (!g || !g.createRadialGradient) return null;
    const r = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    r.addColorStop(0, rgba(color, 0.85)); r.addColorStop(0.35, rgba(color, 0.3)); r.addColorStop(1, rgba(color, 0));
    g.fillStyle = r; g.fillRect(0, 0, SPRITE, SPRITE);
    return c;
  }
  function spriteFor(id) {
    if (sprites[id] === undefined) sprites[id] = glow(biomePalette(id).glow);
    return sprites[id];
  }
  const api = {
    resize(nw, nh, nd) { w = nw; h = nh; dpr = nd; cone = null; },
    // opts: { cone, bloom, flicker } booleans from quality / reduce motion. cues: from feel/cues.js.
    drawCone(ctx, state, o) {
      if (!o.cone) return;
      const depthFade = 1 - 0.8 * smoothstep(0, 900, state.depth); // light from the top fades but never fully
      let a = 0.16 * depthFade;
      if (o.flicker) a *= 1 - 0.15 * o.cues.danger * (0.5 + 0.5 * Math.sin(state.time * 0.031) * Math.sin(state.time * 0.0113 + 1.7));
      if (a < 0.004) return;
      if (!cone || coneCtx !== ctx) {
        coneCtx = ctx;
        cone = ctx.createLinearGradient(0, 0, 0, h);
        cone.addColorStop(0, 'rgba(220,235,255,1)'); cone.addColorStop(0.6, 'rgba(160,190,255,0.35)'); cone.addColorStop(1, 'rgba(120,150,255,0)');
      }
      const cx = w / 2, topHalf = w * 0.1;
      ctx.globalAlpha = a; ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(cx - topHalf, -24); ctx.lineTo(cx + topHalf, -24); ctx.lineTo(cx + w * 0.55, h + 24); ctx.lineTo(cx - w * 0.55, h + 24); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    },
    // Lantern glow follows the bucket. Additive, so it brightens and never covers.
    drawLantern(ctx, state, o) {
      const s = spriteFor(state.biomeId);
      const bx = fin(state.bucket && state.bucket.x, w / 2), by = fin(state.bucket && state.bucket.y, h * 0.5);
      const pulse = o.flicker ? 1 + 0.05 * Math.sin(state.time * 0.004) + 0.04 * Math.sin(state.time * 0.0173) : 1;
      const r = Math.min(w, h) * 0.55 * pulse;
      ctx.globalCompositeOperation = 'lighter';
      if (s) { ctx.globalAlpha = 0.34; ctx.drawImage(s, bx - r, by - r, r * 2, r * 2); }
      else { ctx.globalAlpha = 0.12; ctx.fillStyle = biomePalette(state.biomeId).glow; ctx.beginPath(); ctx.arc(bx, by, r * 0.5, 0, 6.2832); ctx.fill(); }
      // bloom where gems arrive (just under the bucket), one soft spot per column
      if (o.bloom && s && state.lanes) {
        const n = Math.min(5, Math.max(0, state.laneCount | 0)), br = Math.max(12, w * 0.09);
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < n; i++) { const lx = fin(state.lanes[i], 0); if (lx > 0) ctx.drawImage(s, lx - br, state.arriveY - br, br * 2, br * 2); }
      }
      // danger: the glow turns warmer, with the anticipation cue
      const d = clamp01(o.cues.danger * 0.6 + o.cues.anticipation * 0.5);
      if (d > 0.02) {
        if (ember === null) ember = glow('#ff7a45');
        if (ember) { ctx.globalAlpha = clamp(d * 0.3 * (1 + 0.25 * o.cues.heartbeat), 0, 0.4); ctx.drawImage(ember, bx - r, by - r, r * 2, r * 2); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
  return api;
}
