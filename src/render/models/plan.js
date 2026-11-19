// Decides how many frames and what pixel size each model gets, so memory and time stay inside the budget.
import { DEFS } from './defs.js';

export const MAX_ATLAS_BYTES = 12 * 1024 * 1024;
export const BYTES_PER_PX = 4;

// quality 'high' = full frame counts, 2x supersampling. 'low' = half the frames, 75% size, 1x supersampling.
// size = item pixel size (css px * dpr). bucketSize = { w, h } in pixels, optional.
export function planBake(keys, size, quality = 'high', bucketSize = null, maxBytes = MAX_ATLAS_BYTES) {
  const low = quality === 'low';
  const px = Math.max(16, Math.round(size * (low ? 0.75 : 1)));
  const plan = [];
  for (const key of keys) {
    const d = DEFS[key]; if (!d) continue;
    let w = px, h = px;
    if (d.size === 'bucket') { if (!bucketSize) continue; w = Math.round(bucketSize.w * (low ? 0.75 : 1)); h = Math.round(bucketSize.h * (low ? 0.75 : 1)); }
    plan.push({ key, w, h, frames: low ? Math.max(1, Math.ceil(d.frames / 2)) : d.frames, ss: low ? 1 : (d.ss || 2) });
  }
  const cost = () => plan.reduce((s, p) => s + p.frames * (p.w + 4) * (p.h + 4) * BYTES_PER_PX, 0);
  // too big? cut frames of turntable models (never below 8), then shrink sprites
  for (let guard = 0; guard < 40 && cost() > maxBytes; guard++) {
    let changed = false;
    for (const p of plan) if (p.frames > 8) { p.frames = Math.max(8, p.frames - 2); changed = true; }
    if (!changed) for (const p of plan) { p.w = Math.max(16, Math.floor(p.w * 0.9)); p.h = Math.max(16, Math.floor(p.h * 0.9)); changed = true; }
  }
  return { plan, bytes: cost() };
}

// How much time a slice may use: a quarter of a 60 fps frame by default, never zero.
export function sliceBudgetMs(lastFrameMs, base = 5) {
  if (!Number.isFinite(lastFrameMs)) return base;
  if (lastFrameMs > 24) return 1.5;   // game already struggling: bake gently
  if (lastFrameMs > 18) return 3;
  return base;
}
