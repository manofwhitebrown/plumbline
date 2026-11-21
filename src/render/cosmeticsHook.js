// COSMETICS HOOK [HOOK-3]: the ONE place where equipped Looks reach the pictures.
// Colour tints and gradients only. No textures, no new canvases. Nothing is allocated per frame:
// gradients are built once (when the Look or the size changes) and every draw is a few fills.
// The Drop renderer calls well / rope / bucket. The Home scene calls homeWell / homeLive.
// The picker calls paintPreview once per choice (not per frame).
// Quality: the full-screen well wash is skipped on low quality; the small bucket and rope tints stay.
// The rope tint fades out as Strain rises, so the warning colours of the rope are never hidden.
import { bus } from '../core/bus.js';
import { equipped } from '../meta/cosmetics.js';
import { cosmeticById, DEFAULT_LOOKS } from '../data/cosmetics.js';

const NONE = Object.freeze({ alpha: 0, tint: '#000000', rim: '#ffeeb8', top: '#000000', bottom: '#000000' });
const ROPE_POINTS = 22; // same count as rope.js

const st = {
  bucket: NONE, rope: NONE, well: NONE, low: false, on: true,
  wellGrad: null, wellFor: null, wellH: 0,     // Drop well wash (linear), rebuilt when look or height changes
  homeGrad: null, homeFor: null, homeKey: -1,  // Home glow (radial)
  pt: { x: 0, y: 0 },
};

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Read what is worn (meta). Called at start, on every change, and by tests.
export function refresh() {
  try { st.bucket = equipped('bucket').look || NONE; } catch (e) { st.bucket = NONE; }
  try { st.rope = equipped('rope').look || NONE; } catch (e) { st.rope = NONE; }
  try { st.well = equipped('well').look || NONE; } catch (e) { st.well = NONE; }
  st.wellGrad = null; st.homeGrad = null; st.wellFor = null; st.homeFor = null;
}
// Tests and the preview can set looks directly: { bucket, rope, well } of look objects (or null).
export function setLooks(l) {
  const o = l && typeof l === 'object' ? l : {};
  st.bucket = o.bucket || NONE; st.rope = o.rope || NONE; st.well = o.well || NONE;
  st.wellGrad = null; st.homeGrad = null; st.wellFor = null; st.homeFor = null;
}
export function setLow(low) { st.low = !!low; }
export function setEnabled(on) { st.on = !!on; }
export function state() { return { bucket: st.bucket, rope: st.rope, well: st.well, low: st.low, on: st.on }; }

try { bus.on('cosmetics:changed', refresh); bus.on('meta:collapsed', refresh); } catch (e) { /* no bus: looks just stay as they are */ }
refresh();

// ---------- Drop ----------

// Soft colour wash over the well walls, before the items are drawn. w, h = column size.
export function well(ctx, w, h) {
  const lk = st.well;
  if (!st.on || st.low || !ctx || !(lk.alpha > 0)) return;
  if (st.wellFor !== lk || st.wellH !== h || !st.wellGrad) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, lk.top); g.addColorStop(1, lk.bottom);
    st.wellGrad = g; st.wellFor = lk; st.wellH = h;
  }
  ctx.globalAlpha = lk.alpha; ctx.fillStyle = st.wellGrad; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
}

// A coloured line over the rope. `rope` is the Drop rope (needs sample(u, out)). strain01 fades it out.
export function rope(ctx, ropeObj, strain01) {
  const lk = st.rope;
  if (!st.on || !ctx || !ropeObj || typeof ropeObj.sample !== 'function' || !(lk.alpha > 0)) return;
  const fade = 1 - clamp01((num(strain01, 0) - 0.3) / 0.5);
  if (fade <= 0.02) return;
  const p = st.pt;
  ctx.beginPath();
  for (let i = 0; i <= ROPE_POINTS; i++) {
    if (!ropeObj.sample(i / ROPE_POINTS, p)) return;
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = lk.tint;
  ctx.globalAlpha = lk.alpha * fade; ctx.stroke(); ctx.globalAlpha = 1;
}

// A tint on the wooden frame of the bucket (never on the Part tiles) and a glow on the rim.
// Follows the same sway as bucket.draw: offY and tilt come from the bucket.
export function bucket(ctx, L, t, offY, tilt) {
  const lk = st.bucket;
  if (!st.on || !ctx || !L || !(lk.alpha > 0)) return;
  const w = L.bucketW, bh = L.bucketH, x = L.cx - w / 2, y = L.top, taper = 8;
  ctx.save();
  ctx.translate(L.cx, L.top + bh * 0.2 + num(offY, 0)); ctx.rotate(Math.sin(t / 900) * 0.012 + num(tilt, 0)); ctx.translate(-L.cx, -(L.top + bh * 0.2));
  ctx.beginPath();
  ctx.moveTo(x, y + 6); ctx.lineTo(x + w, y + 6); ctx.lineTo(x + w - taper, y + bh); ctx.lineTo(x + taper, y + bh); ctx.closePath();
  ctx.rect(x + L.pad - 4, y + L.rim + 2, w - L.pad * 2 + 8, L.tile * L.rows + L.pad * 2 - 8); // the tile plate stays clear
  ctx.globalAlpha = lk.alpha; ctx.fillStyle = lk.tint; ctx.fill('evenodd');
  ctx.globalAlpha = Math.min(0.7, lk.alpha * 1.6); ctx.fillStyle = lk.rim; ctx.fillRect(x - 4, y, w + 8, 4);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------- Home ----------

// A glow rising out of the well mouth in the Look's colours. L = the Home layout.
export function homeWell(ctx, L) {
  const lk = st.well;
  if (!st.on || !ctx || !L || !(lk.alpha > 0)) return;
  const key = L.wellCx * 7 + L.wellCy * 13 + L.wellRx * 31;
  const cy = L.wellCy - L.wellRy * 0.6, r = L.wellRx * 1.7;
  if (st.homeFor !== lk || st.homeKey !== key || !st.homeGrad) {
    const g = ctx.createRadialGradient(L.wellCx, cy, 2, L.wellCx, cy, r);
    g.addColorStop(0, lk.top); g.addColorStop(0.55, lk.bottom); g.addColorStop(1, 'rgba(0,0,0,0)');
    st.homeGrad = g; st.homeFor = lk; st.homeKey = key;
  }
  ctx.globalAlpha = Math.min(0.55, lk.alpha * 2.2); ctx.fillStyle = st.homeGrad;
  ctx.fillRect(L.wellCx - r, cy - r, r * 2, r * 2); ctx.globalAlpha = 1;
}

// The live rope and bucket at Home. sw = the sideways swing the scene already computed. Same shapes as drawWinchLive.
export function homeLive(ctx, L, sw) {
  if (!st.on || !ctx || !L) return;
  const rl = st.rope, bl = st.bucket;
  const bw = L.bucketW, bh = bw * 1.1, bx = L.wellCx + num(sw, 0), by = L.bucketY;
  if (rl.alpha > 0) {
    ctx.lineCap = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = rl.tint; ctx.globalAlpha = Math.min(0.8, rl.alpha * 1.6);
    ctx.beginPath(); ctx.moveTo(L.wellCx, L.drumY + L.drumR); ctx.lineTo(bx, by + bh * 0.1); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
  if (bl.alpha > 0) {
    ctx.globalAlpha = bl.alpha; ctx.fillStyle = bl.tint;
    ctx.fillRect(bx - bw / 2 + bw * 0.14, by + bh * 0.31, bw * 0.72, bh * 0.58);
    ctx.globalAlpha = Math.min(0.7, bl.alpha * 1.6); ctx.fillStyle = bl.rim; ctx.fillRect(bx - bw / 2 + bw * 0.12, by + bh * 0.28, bw * 0.76, Math.max(1.5, bh * 0.07));
    ctx.globalAlpha = 1;
  }
}

// ---------- Picker preview ----------

// A small still picture of the three Looks together (bucket on a rope in a well). Draws once per choice.
// looks = { bucket, rope, well } as Look objects from src/data/cosmetics.js (or null for the plain one).
export function paintPreview(ctx, w, h, looks) {
  if (!ctx) return;
  const pick = (k) => { const c = looks && looks[k] ? looks[k] : cosmeticById(DEFAULT_LOOKS[k]); return (c && c.look) || NONE; };
  const wl = pick('well'), rl = pick('rope'), bl = pick('bucket');
  ctx.save();
  let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1d14'); g.addColorStop(1, '#0b0710');
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (wl.alpha > 0) {
    g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, wl.top); g.addColorStop(1, wl.bottom);
    ctx.globalAlpha = Math.min(0.9, wl.alpha * 3); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
  const cx = w / 2, bw = Math.min(w * 0.34, 70), bh = bw * 0.9, top = h * 0.42;
  ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#a8803e';
  ctx.beginPath(); ctx.moveTo(cx, -4); ctx.lineTo(cx, top); ctx.stroke();
  ctx.strokeStyle = '#e8c984'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - 1.2, -4); ctx.lineTo(cx - 1.2, top); ctx.stroke();
  if (rl.alpha > 0) { ctx.globalAlpha = Math.min(0.85, rl.alpha * 1.8); ctx.strokeStyle = rl.tint; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, -4); ctx.lineTo(cx, top); ctx.stroke(); ctx.globalAlpha = 1; }
  const x = cx - bw / 2;
  g = ctx.createLinearGradient(x, 0, x + bw, 0); g.addColorStop(0, '#5a3318'); g.addColorStop(0.5, '#94602f'); g.addColorStop(1, '#4a2a14');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, top + 4); ctx.lineTo(x + bw, top + 4); ctx.lineTo(x + bw - 6, top + bh); ctx.lineTo(x + 6, top + bh); ctx.closePath(); ctx.fill();
  if (bl.alpha > 0) { ctx.globalAlpha = Math.min(0.9, bl.alpha * 1.8); ctx.fillStyle = bl.tint; ctx.fill(); ctx.globalAlpha = 1; }
  for (const ry of [top + bh * 0.28, top + bh * 0.82]) { ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 1, ry - 3, bw - 2, 6); }
  ctx.fillStyle = bl.alpha > 0 ? bl.rim : '#ffeeb8'; ctx.fillRect(x - 3, top, bw + 6, 8);
  ctx.restore();
}
