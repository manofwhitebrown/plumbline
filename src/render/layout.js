// Where everything sits on the canvas. One object, rewritten in place (no allocations).
import { clamp } from './safe.js';

export const HUD_TOP = 88;      // px kept free at the top for the HUD
export const HUD_BOTTOM = 120;  // px kept free at the bottom for Haul Up
export const MAX_COL = 480;     // the game is a column, never wider than this
export const RISE_BEATS = 2; // how many beats an item takes to rise to the bucket

export function createLayout() {
  return { w: 360, h: 640, dpr: 1, cols: 4, rows: 3, cx: 180, tile: 56, pad: 12, rim: 16, bucketW: 0, bucketH: 0,
    top: 0, cellX0: 0, cellY0: 0, rigBottom: 0, itemSize: 40, spawnY: 700, arriveY: 400, ropeTop: -20, attachY: 0, safeTop: HUD_TOP, safeBottom: 520,
    laneX: new Float32Array(5) };
}

// w is the column width (the renderer passes min(canvas width, 480)).
export function computeLayout(L, w, h, dpr, cols, rows) {
  L.w = w; L.h = h; L.dpr = dpr;
  L.cols = cols === 5 ? 5 : 4; L.rows = rows === 4 ? 4 : 3;
  L.cx = w / 2;
  const small = h < 520; // sideways phone: tighter frame
  L.pad = small ? 8 : 12; L.rim = small ? 12 : 16;
  L.safeTop = HUD_TOP; L.safeBottom = Math.max(HUD_TOP + 40, h - HUD_BOTTOM);
  const availH = L.safeBottom - L.safeTop;
  const maxW = Math.min(w * 0.9, 460);
  const byW = Math.floor((maxW - L.pad * 2) / L.cols);
  // Height budget: the bucket plus the gem that arrives just below it must sit between the HUD zones.
  let tile = clamp(Math.min(byW, 64), 22, 64);
  for (let guard = 0; guard < 60; guard++) {
    const item = Math.round(Math.max(tile * 0.74, w * 0.06));
    const need = L.rim + L.pad * 2 + tile * L.rows + item * 0.85 - L.pad;
    if (need <= availH || tile <= 22) break;
    tile--;
  }
  L.tile = tile;
  L.bucketW = L.tile * L.cols + L.pad * 2;
  L.bucketH = L.tile * L.rows + L.pad * 2 + L.rim;
  L.itemSize = Math.round(Math.max(L.tile * 0.74, w * 0.06));
  const below = L.itemSize * 0.85 - L.pad; // room the arriving gem needs under the rig
  const lowest = L.safeBottom - L.bucketH - Math.max(0, below);
  const slack = Math.max(0, lowest - L.safeTop);
  const want = Math.round(h * 0.38 - L.bucketH / 2);
  L.top = Math.round(clamp(want, L.safeTop + Math.min(14, slack / 2), Math.max(L.safeTop, lowest)));
  L.cellX0 = Math.round(L.cx - (L.tile * L.cols) / 2);
  L.cellY0 = L.top + L.rim + L.pad;
  L.rigBottom = L.cellY0 + L.tile * L.rows;
  L.spawnY = h + L.itemSize;
  L.arriveY = L.rigBottom + L.itemSize * 0.35;
  L.attachY = L.top - 2;
  for (let i = 0; i < 5; i++) L.laneX[i] = L.cellX0 + (i + 0.5) * L.tile;
  return L;
}
export function tileCx(L, c) { return L.cellX0 + (c + 0.5) * L.tile; }
export function tileCy(L, r) { return L.cellY0 + (r + 0.5) * L.tile; }
