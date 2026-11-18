// The well: dark back wall, bright side walls, hanging decor, light cone, fog, dust motes.
// Biome change cross-fades over 1.2 s with a soft light sweep.
import { makeSprite, makeCanvas } from './canvasUtil.js';
import { BIOME_IDS, biomePalette } from './palette.js';
import { paintWallTile, TILE_H } from './wallTile.js';
import { drawDecor } from './wellDecor.js';
import { hash01 } from './rand.js';
import { clamp01 } from './safe.js';

export const FADE_MS = 1200;
export const PX_PER_M = 44;

export function createWell() {
  let W = 360, H = 640, dpr = 1, low = false, reduce = false;
  const tiles = {}, grads = {}, cones = {}, fogs = {};
  let sweep = null, edge = null, edgeW = 0;
  const st = { from: 'clay', to: 'clay', fade: 1, sweepT: 1 };
  const mx = new Float32Array(36), my = new Float32Array(36), ms = new Float32Array(36);
  for (let i = 0; i < 36; i++) { mx[i] = hash01(i * 3) ; my[i] = hash01(i * 5 + 1); ms[i] = 0.6 + hash01(i * 7 + 2) * 1.6; }

  function tileFor(id) {
    if (tiles[id] === undefined) tiles[id] = makeSprite(W, TILE_H, dpr, (g) => paintWallTile(g, W, biomePalette(id), id));
    return tiles[id];
  }
  function coneFor(id) {
    if (cones[id] === undefined) cones[id] = makeSprite(120, 240, 1, (g) => {
      const c = biomePalette(id).glow, gr = g.createLinearGradient(0, 0, 0, 240);
      gr.addColorStop(0, c + 'cc'); gr.addColorStop(1, c + '00');
      g.fillStyle = gr; g.beginPath(); g.moveTo(40, 0); g.lineTo(80, 0); g.lineTo(120, 240); g.lineTo(0, 240); g.closePath(); g.fill();
    });
    return cones[id];
  }
  function fogFor(id) {
    if (fogs[id] === undefined) fogs[id] = makeSprite(8, 128, 1, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128), c = biomePalette(id).bottom;
      gr.addColorStop(0, c + '00'); gr.addColorStop(1, c + 'dd'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    });
    return fogs[id];
  }
  function layer(ctx, id, alpha, par, scroll, shadeA, x0, wd) {
    const img = tileFor(id); if (!img || alpha <= 0.01) return;
    const off = ((scroll * par) % TILE_H + TILE_H) % TILE_H;
    ctx.globalAlpha = alpha;
    for (let y = -off; y < H; y += TILE_H) ctx.drawImage(img, x0 * dpr, 0, wd * dpr, TILE_H * dpr, x0, Math.floor(y), wd, TILE_H + 1);
    ctx.globalAlpha = 1;
    if (shadeA > 0) { ctx.globalAlpha = shadeA * alpha; ctx.fillStyle = '#040308'; ctx.fillRect(x0, 0, wd, H); ctx.globalAlpha = 1; }
  }

  return {
    state: st,
    resize(w, h, d, isLow) { W = w; H = h; dpr = d; low = !!isLow; for (const k of Object.keys(tiles)) delete tiles[k]; for (const k of Object.keys(grads)) delete grads[k]; edge = null;
      sweep = makeSprite(160, 64, 1, (g) => { const gr = g.createLinearGradient(0, 0, 160, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.5)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 160, 64); }); },
    setLow(v) { low = !!v; },
    setReduceMotion(v) { reduce = !!v; },
    setBiome(id, instant) {
      const to = BIOME_IDS.includes(id) ? id : 'clay';
      if (to === st.to) return;
      if (instant) { st.from = st.to = to; st.fade = 1; return; }
      st.from = st.to; st.to = to; st.fade = 0; st.sweepT = 0; tileFor(to); // build before the fade starts
    },
    update(dtMs) { if (st.fade < 1) st.fade = Math.min(1, st.fade + dtMs / FADE_MS); if (st.sweepT < 1) st.sweepT = Math.min(1, st.sweepT + dtMs / FADE_MS); },
    draw(ctx, scrollPx, depth, t, strain01) {
      const fade = reduce ? (st.fade < 1 ? 1 : 1) : st.fade, ids = st.fade < 1 ? [st.from, st.to] : [st.to];
      const sideW = Math.round(Math.max(18, W * 0.07));
      for (let n = 0; n < ids.length; n++) {
        const id = ids[n], a = ids.length === 1 ? 1 : n === 0 ? 1 : clamp01(fade);
        if (!grads[id]) { const g = ctx.createLinearGradient(0, 0, 0, H), p = biomePalette(id); g.addColorStop(0, p.top); g.addColorStop(1, p.bottom); grads[id] = g; }
        ctx.globalAlpha = a; ctx.fillStyle = grads[id]; ctx.fillRect(0, -50, W, H + 100); ctx.globalAlpha = 1;
        layer(ctx, id, a * 0.55, 0.5, scrollPx, 0.5, 0, W);              // far wall, dark
        if (!low) { const cone = coneFor(id); if (cone) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * Math.max(0.05, 0.3 - depth / 1800); ctx.drawImage(cone, W * 0.1, 0, W * 0.8, H * 0.85); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; } }
        layer(ctx, id, a, 1, scrollPx, 0, 0, sideW);                      // left near wall
        layer(ctx, id, a, 1, scrollPx, 0, W - sideW, sideW);              // right near wall
        drawDecor(ctx, id, W, H, scrollPx * 1.25, sideW, a, t);
      }
      // edge shadow on the near walls
      if (!edge || edgeW !== sideW) { edge = ctx.createLinearGradient(0, 0, sideW + 14, 0); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.5)'); edgeW = sideW; }
      const eg = edge;
      ctx.fillStyle = eg; ctx.fillRect(sideW - 2, 0, 16, H);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.fillStyle = eg; ctx.fillRect(sideW - 2, 0, 16, H); ctx.restore();
      // dust motes (front layer)
      const pal = biomePalette(st.to), count = low ? 12 : 36;
      ctx.fillStyle = pal.mote;
      for (let i = 0; i < count; i++) {
        const y = (((my[i] * H - scrollPx * 1.6 * ms[i] * 0.5) % H) + H) % H, x = mx[i] * W + Math.sin(t / 1500 + i) * 8;
        ctx.globalAlpha = 0.18 + 0.2 * ms[i] / 2.2; ctx.fillRect(x, y, ms[i], ms[i]);
      }
      ctx.globalAlpha = 1;
      if (!low) { const f = fogFor(st.to); if (f) { ctx.globalAlpha = 0.5 + 0.2 * clamp01(depth / 800); ctx.drawImage(f, 0, H * 0.55, W, H * 0.45); ctx.globalAlpha = 1; } }
      if (st.sweepT < 1 && sweep && !reduce) { // soft light sweep across the screen
        const x = -160 + (W + 320) * st.sweepT; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(st.sweepT * Math.PI) * 0.6;
        ctx.drawImage(sweep, x, 0, 160, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    },
  };
}
