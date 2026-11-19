// Part icons, drawn with paths. x, y = top-left of the square. Same look at any size.
// state: 'idle' | 'firing' | 'locked' | 'selected'
import { glyphsA } from './glyphsA.js';
import { glyphsB } from './glyphsB.js';
import { makeSprite, makeCanvas } from './canvasUtil.js';
import { warn } from './safe.js';
import { paintHeroIcon, FAMILIES } from './art/iconStyle.js'; // [GFX-1] hero look

const GLYPHS = Object.assign({}, glyphsA, glyphsB);
// plate colours by family
const FAMILY = {
  collector: { a: '#7a5a22', b: '#3a2a10', metal: ['#ffe3a1', '#d9a441'], accent: '#e8444f' },
  processor: { a: '#2a5a7a', b: '#10263a', metal: ['#e3f4ff', '#6fb8e8'], accent: '#7fd6ff' },
  defense:   { a: '#1f6a50', b: '#0c2a22', metal: ['#d6ffee', '#46c89a'], accent: '#46e3a3' },
  engine:    { a: '#7a3a1c', b: '#2e140a', metal: ['#ffd9bd', '#ff8a4a'], accent: '#ffb454' },
  special:   { a: '#4a2f80', b: '#1a1033', metal: ['#efe0ff', '#a679ff'], accent: '#d9b8ff' },
  unknown:   { a: '#3a4466', b: '#1a2038', metal: ['#e0e6f8', '#8d97b8'], accent: '#b8c2e0' },
};
const FAMILY_OF = {
  hook: 'collector', magnet: 'collector', net: 'collector', vacuum: 'collector',
  polisher: 'processor', multiplier: 'processor', smelter: 'processor', splitter: 'processor', amplifier: 'processor', gilder: 'processor', prism: 'processor',
  plate: 'defense', shield: 'defense', oilcan: 'defense', cooler: 'defense', spikeguard: 'defense', sparerope: 'defense',
  drill: 'engine', anchor: 'engine', metronome: 'engine', battery: 'engine',
  lantern: 'special', compass: 'special', jackpotchest: 'special', echo: 'special', fuse: 'special',
};
export const PART_KEYS = Object.keys(FAMILY_OF);

// "oil_can", "Oil Can", "oilcan" all become "oilcan".
export function normalizeId(id) { return typeof id === 'string' ? id.toLowerCase().replace(/[^a-z]/g, '') : ''; }
export function hasGlyph(id) { return !!GLYPHS[normalizeId(id)]; }

function rrPath(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

function drawUnit(g, key, state) {
  const fam = FAMILY[FAMILY_OF[key] || 'unknown'];
  const locked = state === 'locked';
  // plate
  const plate = g.createLinearGradient(-1, -1, 1, 1);
  plate.addColorStop(0, locked ? '#3a4058' : fam.a); plate.addColorStop(1, locked ? '#161a28' : fam.b);
  rrPath(g, -0.92, -0.92, 1.84, 1.84, 0.34); g.fillStyle = plate; g.fill();
  // inner glow and rim
  const glow = g.createRadialGradient(0, -0.3, 0.1, 0, 0, 1.1);
  glow.addColorStop(0, state === 'firing' ? 'rgba(255,240,200,0.55)' : 'rgba(255,255,255,0.16)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  rrPath(g, -0.92, -0.92, 1.84, 1.84, 0.34); g.fillStyle = glow; g.fill();
  g.lineWidth = state === 'firing' ? 0.1 : 0.06;
  g.strokeStyle = state === 'firing' ? '#fff3c4' : state === 'selected' ? '#f6c453' : 'rgba(255,255,255,0.22)';
  rrPath(g, -0.92, -0.92, 1.84, 1.84, 0.34); g.stroke();
  // glyph
  const metal = g.createLinearGradient(-0.6, -0.6, 0.6, 0.6);
  metal.addColorStop(0, fam.metal[0]); metal.addColorStop(1, fam.metal[1]);
  const k = { metal, light: fam.metal[0], dark: fam.b, accent: fam.accent };
  g.save(); g.scale(0.98, 0.98);
  if (locked) g.globalAlpha = 0.35;
  const painter = GLYPHS[key];
  if (painter) painter(g, k);
  else { // neutral placeholder: a question-mark-free ring and dot
    g.beginPath(); g.arc(0, 0, 0.42, 0, 6.2832); g.lineWidth = 0.12; g.strokeStyle = k.light; g.stroke();
    g.beginPath(); g.arc(0, 0, 0.1, 0, 6.2832); g.fillStyle = k.light; g.fill();
  }
  g.restore();
  if (locked) { // small padlock
    g.fillStyle = '#c9d2ee'; rrPath(g, -0.2, 0.0, 0.4, 0.34, 0.07); g.fill();
    g.beginPath(); g.arc(0, 0, 0.14, Math.PI, 0); g.lineWidth = 0.07; g.strokeStyle = '#c9d2ee'; g.stroke();
  }
  if (state === 'selected') {
    g.lineWidth = 0.07; g.strokeStyle = 'rgba(246,196,83,0.55)'; rrPath(g, -1.0, -1.0, 2.0, 2.0, 0.4); g.stroke();
  }
}

function flatDraw(ctx, partId, x, y, size, state) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2); ctx.scale(size / 2, size / 2);
  drawUnit(ctx, normalizeId(partId), state || 'idle');
  ctx.restore();
}

export function draw(ctx, partId, x, y, size, state) {
  try {
    if (!ctx || !(size > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (typeof ctx.drawImage === 'function') { // hero look from a cached sprite, at the pixel ratio of this canvas
      let scale = 1;
      try { const tr = ctx.getTransform && ctx.getTransform(); if (tr && Number.isFinite(tr.a)) scale = Math.hypot(tr.a, tr.b); } catch (e) { scale = 1; }
      const spr = getSprite(partId, size, Math.max(1, Math.min(3, Math.round(scale))), state || 'idle');
      if (spr) { ctx.drawImage(spr, x, y, size, size); return; }
    }
    flatDraw(ctx, partId, x, y, size, state);
  } catch (e) { warn('partIcon.draw', e && e.message); try { ctx.restore(); } catch (e2) { /* ignore */ } }
}

// Paints one sprite: the hero icon, or the flat drawing when there is no scratch canvas.
function paintSprite(g, partId, size, dpr, state) {
  const key = normalizeId(partId);
  const fam = FAMILIES[FAMILY_OF[key] || 'unknown'];
  const glyph = GLYPHS[key] || ((c, k) => { c.beginPath(); c.arc(0, 0, 0.42, 0, 6.2832); c.lineWidth = 0.12; c.strokeStyle = k.light; c.stroke(); });
  if (!paintHeroIcon(g, size, dpr, glyph, fam, state)) flatDraw(g, partId, 0, 0, size, state);
}

// Sprite cache: one small canvas per part, size and state. Used by the bucket for speed.
const cache = new Map();
export function getSprite(partId, size, dpr = 1, state = 'idle') {
  const key = normalizeId(partId) + '|' + Math.round(size) + '|' + dpr + '|' + state;
  let s = cache.get(key);
  if (s === undefined) {
    if (cache.size > 400) cache.clear();
    s = makeSprite(size, size, dpr, (g) => paintSprite(g, partId, size, dpr, state));
    cache.set(key, s);
  }
  return s;
}
export function clearSprites() { cache.clear(); }

// PNG data URL for DOM <img>. OffscreenCanvas has no toDataURL, so a normal canvas is used when there is a document.
const urlCache = new Map();
export function toDataURL(partId, size) {
  try {
    const px = Math.max(8, Math.min(512, Math.round(Number(size)) || 48));
    const key = normalizeId(partId) + '|' + px;
    const hit = urlCache.get(key); if (hit) return hit;
    let c = null;
    if (typeof document !== 'undefined' && document && typeof document.createElement === 'function') {
      try { c = document.createElement('canvas'); c.width = px; c.height = px; } catch (e) { c = null; }
    }
    if (!c) c = makeCanvas(px, px);
    if (!c) return '';
    const g = c.getContext('2d');
    if (!g) return '';
    paintSprite(g, partId, px, 1, 'idle'); // [GFX-1] same hero look in DOM images
    if (typeof c.toDataURL !== 'function') return '';
    const url = c.toDataURL('image/png');
    if (url) { if (urlCache.size > 200) urlCache.clear(); urlCache.set(key, url); }
    return url;
  } catch (e) { warn('partIcon.toDataURL', e && e.message); return ''; }
}
export default { draw, toDataURL, getSprite };
