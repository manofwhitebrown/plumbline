// The wall layer. Everything is painted into one offscreen layer (walls, far wall, ribs, door rings, shade, fog, light),
// then blitted once with the depth camera's roll, zoom and shake. No allocation per frame.
import { hexToRgb, mix, rgbToCss } from '../art/color.js';
import { biomePalette } from '../palette.js';
import { BIOME_ORDER, BIOME_EDGES, STYLE, GEOM, OV, TEX_W, TEX_H, SLICE_PX, LAYER_SCALE, LIGHT, CAM, BLEND_M } from './constants.js';
import { makeSliceTable, buildSliceTable, sliceStart, sliceDepth, shaftGeom, wallWidth, rowOf, biomeIndexAt, blendAt, fin, clamp, clamp01, smoothstep } from './math.js';
import { buildMask } from './assets.js';

const INK = [2, 1, 8];
const RIB_SPACING = 20, FAR_PX = 12;

export function createWalls(env) {
  const { mk, assets, light } = env;
  const prof = typeof env.prof === 'function' ? env.prof : null; // [PERF-2] dev only: prof(stageName, layerCtx) lets dev/perf-lab.js time each stage (null in the game)
  const table = makeSliceTable();
  let W = 360, H = 640, dpr = 1, level = 'high', ls = 1, layer = null, g = null, geo = shaftGeom(W, H), mask = null, maskKey = '', dirty = true;
  const backG = [], fogG = [], edgeCss = [];
  let slicesDrawn = 0, maxW = 60;

  function palCss(i) {
    const p = biomePalette(BIOME_ORDER[i]);
    edgeCss[i] = rgbToCss(mix(hexToRgb(p.wallDark), INK, 0.35));
    const top = mix(hexToRgb(p.top), INK, 0.0), bot = mix(hexToRgb(p.bottom), hexToRgb(p.top), 0.55);
    const b = g.createLinearGradient(0, -OV, 0, H + OV); b.addColorStop(0, rgbToCss(top)); b.addColorStop(1, rgbToCss(bot)); backG[i] = b;
    const fogC = mix(hexToRgb(STYLE[BIOME_ORDER[i]].fog), hexToRgb(p.glow), 0.06);
    const f = g.createLinearGradient(0, -OV, 0, H + OV);
    f.addColorStop(0, rgbToCss(fogC, 0)); f.addColorStop(0.3, rgbToCss(fogC, 0.08)); f.addColorStop(0.7, rgbToCss(fogC, 0.28)); f.addColorStop(1, rgbToCss(fogC, LIGHT.fogMax));
    fogG[i] = f;
  }

  const S = {
    get slices() { return table.n; }, get drawn() { return slicesDrawn; }, get ls() { return ls; }, get ready() { return !!g; },
    setSize(w, h, d) { W = Math.max(1, fin(w, W)); H = Math.max(1, fin(h, H)); dpr = clamp(fin(d, 1) || 1, 1, 3); dirty = true; },
    setLevel(l) { if (l !== level) { level = l; dirty = true; } },
    // Builds the layer, the slice table and the gradients. Called lazily so a resize costs nothing until the next frame.
    rebuild(margin) {
      if (!dirty && layer) return !!g;
      dirty = false; maskKey = ''; mask = null; backG.length = 0; fogG.length = 0; edgeCss.length = 0;
      ls = level === 'high' ? Math.min(dpr, LAYER_SCALE.high) : Math.min(dpr, LAYER_SCALE.medium);
      layer = mk(Math.round((W + OV * 2) * ls), Math.round((H + OV * 2) * ls));
      g = layer ? layer.getContext('2d') : null;
      geo = shaftGeom(W, H); maxW = Math.ceil(wallWidth(H * 1.05, geo)) + 14;
      buildSliceTable(table, W, H, SLICE_PX[level] || SLICE_PX.high);
      return !!g;
    },
    ensureMask(margin) {
      const key = Math.round(margin) + ':' + W + ':' + H + ':' + ls;
      if (key === maskKey && mask) return;
      maskKey = key;
      mask = buildMask(mk, W, H, ls, margin, (y) => wallWidth(y, geo));
    },
    // Paints the whole layer for camera depth d. frame: { forced (biome index or -1), time, bucketY, danger, depthFade }
    render(d, frame) {
      if (!g) return false;
      const bi0 = frame.forced >= 0 ? frame.forced : biomeIndexAt(d), tb = frame.forced >= 0 ? 0 : blendAt(d), bi1 = Math.min(BIOME_ORDER.length - 1, bi0 + 1);
      const useB = tb > 0.003 && bi1 !== bi0 && assets.ready(bi1);
      g.setTransform(ls, 0, 0, ls, OV * ls, OV * ls);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (prof) prof('start', g);
      if (!backG[bi0]) palCss(bi0); if (useB && !backG[bi1]) palCss(bi1);
      // 1. backdrop, with flat dark strips under the overscan on both sides
      g.fillStyle = backG[bi0]; g.fillRect(-OV, -OV, W + OV * 2, H + OV * 2);
      if (useB) { g.globalAlpha = tb; g.fillStyle = backG[bi1]; g.fillRect(-OV, -OV, W + OV * 2, H + OV * 2); g.globalAlpha = 1; }
      g.fillStyle = edgeCss[bi0]; g.fillRect(-OV, -OV, OV, H + OV * 2); g.fillRect(W, -OV, OV, H + OV * 2);
      if (prof) prof('backdrop', g);
      // 2. far wall: the back of the shaft, slow (parallax 0.2), very dark, only a hint
      const tex0 = assets.tex(bi0);
      if (tex0 && level === 'high') {
        const c2 = tex0.L[2], per = (TEX_H / 4) * 2.4, y0 = -((d * FAR_PX) % per) - per;
        g.globalAlpha = 0.16;
        for (let y = y0; y < H + OV; y += per) g.drawImage(c2, 0, 0, c2.width, TEX_H / 4, W * 0.08, y, W * 0.84, per + 1);
        g.globalAlpha = 1;
      }
      if (prof) prof('far wall', g);
      // 3. wall slices (the mode-7 part)
      let n = 0;
      const forcedOnly = frame.forced >= 0;
      for (let side = 0; side < 2; side++) {
        const off = side ? TEX_H * 0.5 : 0;
        for (let i = 0; i < table.n; i++) {
          const z = sliceDepth(table, i, d);
          let b = forcedOnly ? bi0 : biomeIndexAt(z), t = 0;
          if (!forcedOnly && b < BIOME_EDGES.length) t = smoothstep(BIOME_EDGES[b] - BLEND_M, BIOME_EDGES[b], z);
          let tx = assets.tex(b);
          if (!tx) { // not built yet: use the nearest biome that is
            tx = assets.tex(bi0) || assets.tex(bi1); if (!tx) continue; t = 0;
          }
          const u0 = sliceStart(table, i, d, off), m = table.mip[i], k = 1 / (1 << m);
          const wI = table.wI[i], y = table.y[i], hh = table.h[i] + 0.6;
          let sw = table.srcW[i] * k; const sh0 = table.srcH[i] * k, sy = u0 * k;
          const c = (side ? tx.R : tx.L)[m], cw = TEX_W >> m;
          if (sw > cw) sw = cw;
          const sx = side ? cw - sw : 0, dx = side ? W - wI : 0;
          g.drawImage(c, sx, sy, sw, Math.min(sh0, c.height - sy), dx, y, wI, hh); n++;
          if (t > 0.02) {
            const nx = assets.tex(b + 1);
            if (nx) { g.globalAlpha = t; g.drawImage((side ? nx.R : nx.L)[m], sx, sy, sw, Math.min(sh0, c.height - sy), dx, y, wI, hh); g.globalAlpha = 1; n++; }
          }
        }
      }
      slicesDrawn = n;
      if (prof) prof('slices', g);
      // 4. ribs and door rings (they cut across the walls and the shaft; centre is see-through in the sprite)
      this.rings(d, bi0, forcedOnly);
      if (prof) prof('rings', g);
      // 5. shade mask (inner wall edge, HUD dim)
      if (mask) { // only the two wall strips carry any ink, so only those are drawn
        const sw = maxW + OV, srcW = Math.min(mask.width, Math.round(sw * ls)), dH = H + OV * 2;
        g.drawImage(mask, 0, 0, srcW, mask.height, -OV, -OV, srcW / ls, dH);
        g.drawImage(mask, mask.width - srcW, 0, srcW, mask.height, W + OV - srcW / ls, -OV, srcW / ls, dH);
      }
      if (prof) prof('mask', g);
      // 6. fog: thicker toward the vanishing row, tinted per biome
      const breath = 1 + (light.exposure - 0.04) * 3; // slow breathing: fog density and lantern strength move a few percent
      g.globalAlpha = clamp(breath, 0.85, 1); g.fillStyle = fogG[bi0]; g.fillRect(-OV, H * 0.2, W + OV * 2, H * 0.8 + OV);
      if (useB) { g.globalAlpha = tb * clamp(breath, 0.85, 1); g.fillStyle = fogG[bi1]; g.fillRect(-OV, H * 0.2, W + OV * 2, H * 0.8 + OV); g.globalAlpha = 1; }
      if (prof) prof('fog', g);
      // 7. light: lantern lobes on the near walls, warmer with danger, pulses on collects
      this.lights(bi0, bi1, useB ? tb : 0, frame);
      if (prof) prof('lights', g);
      return true;
    },
    rings(d, bi0, forcedOnly) {
      // ribs every RIB_SPACING m, skipped near an edge, and a thick door ring at each biome edge
      const lo = d - 9.5, hi = d + 28;
      for (let e = 0; e < BIOME_EDGES.length && !forcedOnly; e++) {
        const z = BIOME_EDGES[e];
        if (z < lo || z > hi) continue;
        const bi = e + 1, ring = assets.ring(bi) || assets.ring(e);
        if (ring) this.ring(ring, z - d + GEOM.dRef, 1.3, 0.95);
      }
      const k0 = Math.ceil(lo / RIB_SPACING), k1 = Math.floor(hi / RIB_SPACING);
      for (let k = k0; k <= k1; k++) {
        const z = k * RIB_SPACING;
        let near = false; for (let e = 0; e < BIOME_EDGES.length; e++) if (Math.abs(z - BIOME_EDGES[e]) < 4) near = true;
        if (near && !forcedOnly) continue;
        const bi = forcedOnly ? bi0 : biomeIndexAt(z), ring = assets.ring(bi); if (ring) this.ring(ring, z - d + GEOM.dRef, 0.4, 0.6);
      }
    },
    ring(sprite, dz, thick, alpha) {
      const yTop = rowOf(dz - thick / 2, geo), yBot = rowOf(dz + thick / 2, geo);
      if (yBot < -OV || yTop > H + OV) return;
      const h = Math.max(2, yBot - yTop);
      const far = 1 - smoothstep(8, 22, dz);   // fades into the haze when it is far
      g.globalAlpha = clamp01(alpha * far); g.drawImage(sprite, -OV * 0, yTop, W, h); g.globalAlpha = 1;
    },
    lights(bi0, bi1, tb, frame) {
      const lobe0 = assets.lobe(bi0), lobe1 = tb > 0 ? assets.lobe(bi1) : null, by = clamp(fin(frame.bucketY, H * 0.38), 0, H);
      const wI = wallWidth(by, geo), lw = wI * 2.4 + 60, lh = Math.min(H * 0.55, 330);
      g.globalCompositeOperation = 'lighter';
      const a = LIGHT.lobeAlpha * light.flicker;
      for (let side = 0; side < 2; side++) {
        const cx = side ? W - wI * 0.35 : wI * 0.35;
        if (lobe0) { g.globalAlpha = a * (1 - tb); g.drawImage(lobe0, cx - lw / 2, by - lh / 2, lw, lh); }
        if (lobe1) { g.globalAlpha = a * tb; g.drawImage(lobe1, cx - lw / 2, by - lh / 2, lw, lh); }
        const dg = frame.danger;
        if (dg > 0.02) { const em = assets.pulse(3); if (em) { g.globalAlpha = 0.16 * dg; g.drawImage(em, cx - lw / 2, by - lh / 2, lw, lh); } }
      }
      if (lobe0) { g.globalAlpha = 0.09 * (1 - tb) * light.flicker; g.drawImage(lobe0, W / 2 - W * 0.5, H * 1.02 - H * 0.2, W, H * 0.4); } // far end of the shaft: a faint haze
      for (const p of light.pulses) {
        if (!p.live) continue;
        const sp = assets.pulse(p.tier); if (!sp) continue;
        const e = light.env(p), sz = wI * 2.2 + 70;
        for (let side = 0; side < 2; side++) {
          const near = (side === 0) === (p.side < 0), cx = side ? W - wI * 0.35 : wI * 0.35;
          g.globalAlpha = clamp01(LIGHT.pulseAlpha * e * (near ? 1 : 0.3));
          g.drawImage(sp, cx - sz / 2, p.y - sz * 0.8, sz, sz * 1.6);
        }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    },
    // simple = medium quality: shift only (whole pixels), no roll or zoom. A rotated, smoothed blit is one cheap quad on a GPU canvas
    // but the slowest single call on a software canvas, so the lower tier skips it.
    blit(ctx, cam, alpha, simple) {
      if (!layer) return;
      const px = W / 2, py = geo.yRef;
      ctx.save();
      if (simple) ctx.translate(Math.round(cam.dx), Math.round(cam.dy));
      else {
        ctx.translate(px + cam.dx, py + cam.dy);
        if (Math.abs(cam.roll) > 0.02) ctx.rotate((cam.roll * Math.PI) / 180);
        if (cam.zoom !== 1) ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-px, -py);
      }
      ctx.imageSmoothingEnabled = !simple;
      ctx.globalAlpha = alpha;
      ctx.drawImage(layer, -OV, -OV, W + OV * 2, H + OV * 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    },
    destroy() { layer = null; g = null; mask = null; backG.length = 0; fogG.length = 0; },
    get table() { return table; },
  };
  return S;
}
