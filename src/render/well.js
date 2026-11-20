// The flat well (the exact fallback under the depth layer): dark back wall, bright side walls, fog.
// [INTEGRATE-1] Cone, hanging decor and dust motes were removed here: polish draws the cone, the wall detail and the ambience
// (one owner each), and the art layers already carry the wall detail.
// Biome change cross-fades over 1.2 s with a soft light sweep.
import { makeSprite, makeCanvas } from './canvasUtil.js';
import { BIOME_IDS, biomePalette } from './palette.js';
import { TILE_H } from './wallTile.js';
import { paintWallLayer, hasGlow, LAYER_SCALE } from './art/wallArt.js'; // [GFX-1] procedural walls
import { clamp01 } from './safe.js';

export const FADE_MS = 1200;
export const PX_PER_M = 44;

export function createWell() {
  let W = 360, H = 640, dpr = 1, low = false, reduce = false;
  const tiles = {}, grads = {}, fogs = {}, idsBuf = ['clay', 'clay'];
  let sweep = null, edge = null, edgeW = 0;
  const st = { from: 'clay', to: 'clay', fade: 1, sweepT: 1 };

  const sideWOf = () => Math.round(Math.max(18, W * 0.07));
  // [GFX-1] one sprite per biome and layer: far / mid / glow are half resolution, near is two thin edge strips.
  function tileFor(id, kind = 'far') {
    const key = id + '|' + kind;
    if (tiles[key] === undefined) {
      const q = low ? 'low' : 'high';
      if (kind === 'near') { const sw = sideWOf() * 2; tiles[key] = makeSprite(sw, TILE_H, dpr, (g) => paintWallLayer(g, sw, TILE_H, id, 'near', q)); }
      else if (kind === 'glow' && !hasGlow(id)) tiles[key] = null;
      else tiles[key] = makeSprite(W, TILE_H, dpr * LAYER_SCALE[kind], (g) => paintWallLayer(g, W, TILE_H, id, kind, q));
    }
    return tiles[key];
  }
  function fogFor(id) {
    if (fogs[id] === undefined) fogs[id] = makeSprite(8, 128, 1, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128), c = biomePalette(id).bottom;
      gr.addColorStop(0, c + '00'); gr.addColorStop(1, c + 'dd'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    });
    return fogs[id];
  }
  // [GFX-1] Layers are built one per frame (queue) so a biome change never causes a long frame.
  const queue = [], queued = {};
  function prebuild(id) {
    if (queued[id]) return; queued[id] = true;
    queue.push([id, 'far'], [id, 'near']); if (!low) queue.push([id, 'mid'], [id, 'glow']);
  }
  function pump() { const j = queue.shift(); if (j) tileFor(j[0], j[1]); }
  const peek = (id, kind) => tiles[id + '|' + kind];
  // Draws a scrolling layer. f0..f1 = slice of the sprite width (0..1); dx, dw = where it lands on screen.
  function layer(ctx, id, kind, alpha, par, scroll, shadeA, f0, f1, dx, dw) {
    const img = peek(id, kind); if (!img || alpha <= 0.01) return;
    const off = ((scroll * par) % TILE_H + TILE_H) % TILE_H, sx = img.width * f0, sw = img.width * (f1 - f0);
    ctx.globalAlpha = alpha;
    for (let y = -off; y < H; y += TILE_H) ctx.drawImage(img, sx, 0, sw, img.height, dx, Math.floor(y), dw, TILE_H + 1);
    ctx.globalAlpha = 1;
    if (shadeA > 0) { ctx.globalAlpha = shadeA * alpha; ctx.fillStyle = '#040308'; ctx.fillRect(dx, 0, dw, H); ctx.globalAlpha = 1; }
  }

  return {
    state: st,
    resize(w, h, d, isLow) { W = w; H = h; dpr = d; low = !!isLow; for (const k of Object.keys(tiles)) delete tiles[k]; queue.length = 0; for (const k of Object.keys(queued)) delete queued[k]; for (const k of Object.keys(grads)) delete grads[k]; edge = null;
      sweep = makeSprite(160, 64, 1, (g) => { const gr = g.createLinearGradient(0, 0, 160, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.5)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 160, 64); }); },
    setLow(v) { v = !!v; if (v !== low) { low = v; for (const k of Object.keys(tiles)) delete tiles[k]; queue.length = 0; for (const k of Object.keys(queued)) delete queued[k]; } },
    setReduceMotion(v) { reduce = !!v; },
    // [PERF-1] The depth layer covers the flat well: free its wall tiles (about 6 MB at dpr 2). They rebuild by themselves if the well draws again.
    release() { for (const k of Object.keys(tiles)) delete tiles[k]; for (const k of Object.keys(fogs)) delete fogs[k]; for (const k of Object.keys(grads)) delete grads[k]; queue.length = 0; for (const k of Object.keys(queued)) delete queued[k]; edge = null; },
    get tileCount() { return Object.keys(tiles).length; },
    setBiome(id, instant) {
      const to = BIOME_IDS.includes(id) ? id : 'clay';
      if (to === st.to) return;
      if (instant) { st.from = st.to = to; st.fade = 1; return; }
      st.from = st.to; st.to = to; st.fade = 0; st.sweepT = 0; prebuild(to); // build before the fade starts
    },
    update(dtMs) { if (st.fade < 1) st.fade = Math.min(1, st.fade + dtMs / FADE_MS); if (st.sweepT < 1) st.sweepT = Math.min(1, st.sweepT + dtMs / FADE_MS); },
    draw(ctx, scrollPx, depth, t, strain01) {
      prebuild(st.to); if (st.fade < 1) prebuild(st.from); pump();
      const fade = reduce ? 1 : st.fade, ids = idsBuf, two = st.fade < 1; // no new array per frame
      idsBuf[0] = two ? st.from : st.to; idsBuf[1] = st.to;
      const sideW = sideWOf();
      for (let n = 0; n < (two ? 2 : 1); n++) {
        const id = ids[n], a = !two ? 1 : n === 0 ? 1 : clamp01(fade);
        if (!grads[id]) { const g = ctx.createLinearGradient(0, 0, 0, H), p = biomePalette(id); g.addColorStop(0, p.top); g.addColorStop(1, p.bottom); grads[id] = g; }
        ctx.globalAlpha = a; ctx.fillStyle = grads[id]; ctx.fillRect(0, -50, W, H + 100); ctx.globalAlpha = 1;
        layer(ctx, id, 'far', a, 0.5, scrollPx, 0.12, 0, 1, 0, W);        // far wall (already dark and soft)
        if (!low) layer(ctx, id, 'mid', a * 0.6, 0.75, scrollPx, 0, 0, 1, 0, W); // mid wall details
        if (!low && peek(id, 'glow')) { // glowing seams, slow pulse (steady with Reduce motion)
          ctx.globalCompositeOperation = 'lighter';
          layer(ctx, id, 'glow', a * (reduce ? 0.5 : 0.42 + 0.18 * Math.sin(t / 1700 + 1)), 0.75, scrollPx, 0, 0, 1, 0, W);
          ctx.globalCompositeOperation = 'source-over';
        }
        layer(ctx, id, 'near', a, 1, scrollPx, 0, 0, 0.5, 0, sideW);      // left near wall
        layer(ctx, id, 'near', a, 1, scrollPx, 0, 0.5, 1, W - sideW, sideW); // right near wall
      }
      // edge shadow on the near walls
      if (!edge || edgeW !== sideW) { edge = ctx.createLinearGradient(0, 0, sideW + 14, 0); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.5)'); edgeW = sideW; }
      const eg = edge;
      ctx.fillStyle = eg; ctx.fillRect(sideW - 2, 0, 16, H);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.fillStyle = eg; ctx.fillRect(sideW - 2, 0, 16, H); ctx.restore();
      if (!low) { const f = fogFor(st.to); if (f) { ctx.globalAlpha = 0.5 + 0.2 * clamp01(depth / 800); ctx.drawImage(f, 0, H * 0.55, W, H * 0.45); ctx.globalAlpha = 1; } }
      if (st.sweepT < 1 && sweep && !reduce) { // soft light sweep across the screen
        const x = -160 + (W + 320) * st.sweepT; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(st.sweepT * Math.PI) * 0.6;
        ctx.drawImage(sweep, x, 0, 160, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    },
  };
}
