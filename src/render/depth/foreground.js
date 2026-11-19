// Foreground silhouettes. Their place is a pure function of the well depth (no timers, no pools, no drift),
// so scrolling back up on a haul reverses them exactly, and nothing can leak. Edges only: a silhouette never
// goes past the free margin beside the lanes, and it dims over the HUD bands.
import { FG, STYLE, BIOME_ORDER, CAM } from './constants.js';
import { SIL_W, SIL_H } from './silhouettes.js';
import { fin, clamp, clamp01, smoothstep, hash01, biomeIndexAt, shaftGeom } from './math.js';

const FGMAX = (W) => clamp(W * FG.topIntrudeK, 40, FG.topIntrudeMax);

const SLOT_LO = 1.1, SLOT_HI = 6.2;

// Where slot k of a side sits in world depth (m).
export function slotDepth(side, k) {
  return (k + 0.15 + 0.7 * hash01(k, side + 7)) * FG.spacingM + side * FG.spacingM * 0.5;
}
// Which sprite (index into the biome's list, 2 variants per kind) a slot uses.
export function slotSprite(side, k, biomeIdx) {
  const list = STYLE[BIOME_ORDER[biomeIdx]].sil;
  const kind = Math.floor(hash01(k, side * 3 + 1) * list.length) % list.length;
  return kind * 2 + (hash01(k, side * 5 + 2) > 0.5 ? 1 : 0);
}
// How far a silhouette may reach in from the screen edge, given the free margin beside the lanes.
export function freeIntrusion(margin) { return clamp(fin(margin) - FG.guardPx, FG.minIntrude, FG.maxIntrude); }

// Fills `out` for a silhouette at world depth z when the camera is at depth d. Returns false when it is off screen.
// Safety: silhouettes are drawn big, then a mask clears everything over the lane band below the bucket top (see fgMaskAlpha).
export function fgPlace(out, z, d, g, margin, velM, blurOn) {
  const dz = z - d;
  if (!(dz >= SLOT_LO && dz <= SLOT_HI)) return false;
  const s = clamp((FG.scaleRef * FG.dzRefF) / dz, 0.3, 1.8);
  const yc = g.yv - FG.K / dz;
  const dyPerS = (FG.K / (dz * dz)) * Math.abs(fin(velM));
  const blur = blurOn ? 1 + clamp(dyPerS / 1400, 0, 0.8) : 1;
  const wd = SIL_W * s, hd = SIL_H * s * blur;
  const intr = FGMAX(g.W) * (0.55 + 0.45 * clamp01((s - 0.3) / 1.0));
  out.x = intr - wd;                 // left-edge draw position (the sprite's right end is at `intr`)
  out.y = yc - hd / 2; out.w = wd; out.h = hd; out.intrude = intr; out.blur = blur;
  let a = 1 - smoothstep(4.6, 6.2, dz);
  const hudTop = smoothstep(FG.hudTop - 20, FG.hudTop + 160, yc), hudBot = 1 - smoothstep(g.H - FG.hudBottom - 160, g.H - FG.hudBottom + 20, yc);
  a *= FG.hudAlpha + (1 - FG.hudAlpha) * Math.min(hudTop, hudBot);
  out.alpha = a / (1 + 0.5 * (blur - 1));
  return true;
}

// How much of a silhouette is erased at (x, y): 1 over the lane band from just above the bucket down, 0 at the edges and high up.
// freeEdge = how far in from each screen edge a silhouette may reach beside the lanes; laneTop = top of the bucket.
export function fgMaskAlpha(x, y, W, freeEdge, laneTop) {
  const xe = Math.min(x, W - x);
  const hy = smoothstep(laneTop - FG.maskFeatherY, laneTop - 8, y);
  const hx = smoothstep(Math.max(0, freeEdge - FG.maskFeatherX), freeEdge, xe);
  return hy * hx;
}

export function createForeground(env) {
  const mk = env && env.mk;
  const pl = { x: 0, y: 0, w: 0, h: 0, intrude: 0, blur: 1, alpha: 0 };
  let drawn = 0, W = 0, H = 0, layer = null, lg = null, mask = null, maskKey = '';
  function ensure(w, h, margin, laneTop) {
    const iw = Math.max(1, Math.round(w)), ih = Math.max(1, Math.round(h));
    if (!layer || W !== iw || H !== ih) {
      W = iw; H = ih; maskKey = ''; mask = null;
      layer = mk ? mk(iw, ih) : null; lg = layer ? layer.getContext('2d') : null;
    }
    const key = Math.round(margin) + ':' + Math.round(laneTop);
    if (lg && key !== maskKey) {
      maskKey = key; mask = null;
      const m = mk(iw, ih), mg = m && m.getContext('2d');
      if (mg && mg.createImageData) {
        const img = mg.createImageData(iw, ih), dd = img.data, free = Math.max(4, freeIntrusion(margin));
        for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const a = fgMaskAlpha(x + 0.5, y + 0.5, iw, free, laneTop); if (a > 0.002) { const o = (y * iw + x) * 4; dd[o + 3] = a * 255; dd[o] = 0; dd[o + 1] = 0; dd[o + 2] = 0; } }
        mg.putImageData(img, 0, 0); mask = m;
      }
    }
    return !!(lg && mask);
  }
  return {
    get drawn() { return drawn; },
    get layer() { return layer; },
    // cam: { dx, dy } from the depth camera. blurOn false on medium.
    draw(ctx, assets, d, w, h, margin, laneTop, velM, cam, blurOn, forcedBiome) {
      drawn = 0;
      const g = shaftGeom(w, h);
      // first work out who is on screen (no drawing yet)
      let any = false;
      for (let side = 0; side < 2 && !any; side++) {
        const kLo = Math.floor((d + SLOT_LO - side * FG.spacingM * 0.5) / FG.spacingM) - 1, kHi = Math.ceil((d + SLOT_HI - side * FG.spacingM * 0.5) / FG.spacingM);
        for (let k = kLo; k <= kHi; k++) { const z = slotDepth(side, k), dz = z - d; if (dz >= SLOT_LO && dz <= SLOT_HI) { any = true; break; } }
      }
      if (!any || !ensure(w, h, margin, laneTop)) return 0;
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.clearRect(0, 0, W, H);
      for (let side = 0; side < 2; side++) {
        const kLo = Math.floor((d + SLOT_LO - side * FG.spacingM * 0.5) / FG.spacingM) - 1, kHi = Math.ceil((d + SLOT_HI - side * FG.spacingM * 0.5) / FG.spacingM);
        for (let k = kLo; k <= kHi; k++) {
          const z = slotDepth(side, k);
          const bi = forcedBiome >= 0 ? forcedBiome : biomeIndexAt(z);
          const sils = assets.sils(bi); if (!sils) continue;
          const spr = sils[slotSprite(side, k, bi)]; if (!spr || !spr.canvas) continue;
          if (!fgPlace(pl, z, d, g, margin, velM, blurOn)) continue;
          if (pl.alpha < 0.01) continue;
          lg.globalAlpha = pl.alpha;
          if (side === 0) lg.drawImage(spr.canvas, pl.x, pl.y, pl.w, pl.h);
          else { lg.save(); lg.translate(W, 0); lg.scale(-1, 1); lg.drawImage(spr.canvas, pl.x, pl.y, pl.w, pl.h); lg.restore(); }
          drawn++;
        }
      }
      lg.globalAlpha = 1; lg.globalCompositeOperation = 'destination-out'; lg.drawImage(mask, 0, 0); lg.globalCompositeOperation = 'source-over';
      if (drawn) {
        const mul = CAM.fgSwayMul, dx = clamp(cam.dx * mul, -CAM.shakePx, CAM.shakePx), dy = clamp(cam.dy * mul, -CAM.shakePx, CAM.shakePx);
        ctx.drawImage(layer, dx, dy, W, H);
      }
      return drawn;
    },
    destroy() { layer = null; lg = null; mask = null; },
  };
}
