// Where everything sits on the canvas. One object, rewritten in place (no allocations).
import { clamp } from './safe.js';

export const HUD_TOP = 88;
export const HUD_BOTTOM = 120;
export const RISE_BEATS = 2; // how many beats an item takes to rise to the bucket

export function createLayout() {
  return { w: 360, h: 640, dpr: 1, cols: 4, rows: 3, cx: 180, tile: 56, pad: 12, rim: 16, bucketW: 0, bucketH: 0,
    top: 0, cellX0: 0, cellY0: 0, rigBottom: 0, itemSize: 40, spawnY: 700, arriveY: 400, ropeTop: -20, attachY: 0, laneX: new Float32Array(5) };
}

export function computeLayout(L, w, h, dpr, cols, rows) {
  L.w = w; L.h = h; L.dpr = dpr;
  L.cols = cols === 5 ? 5 : 4; L.rows = rows === 4 ? 4 : 3;
  L.cx = w / 2;
  L.pad = 12; L.rim = 16;
  const maxW = Math.min(w * 0.9, 460);
  L.tile = clamp(Math.floor((maxW - L.pad * 2) / L.cols), 30, 64);
  L.bucketW = L.tile * L.cols + L.pad * 2;
  L.bucketH = L.tile * L.rows + L.pad * 2 + L.rim;
  const center = Math.max(h * 0.38, HUD_TOP + 14 + L.bucketH / 2);
  L.top = Math.round(center - L.bucketH / 2);
  L.cellX0 = Math.round(L.cx - (L.tile * L.cols) / 2);
  L.cellY0 = L.top + L.rim + L.pad;
  L.rigBottom = L.cellY0 + L.tile * L.rows;
  L.itemSize = Math.round(Math.max(L.tile * 0.74, w * 0.06));
  L.spawnY = h + L.itemSize;
  L.arriveY = L.rigBottom + L.itemSize * 0.35;
  L.attachY = L.top - 2;
  for (let i = 0; i < 5; i++) L.laneX[i] = L.cellX0 + (i + 0.5) * L.tile;
  return L;
}
export function tileCx(L, c) { return L.cellX0 + (c + 0.5) * L.tile; }
export function tileCy(L, r) { return L.cellY0 + (r + 0.5) * L.tile; }
