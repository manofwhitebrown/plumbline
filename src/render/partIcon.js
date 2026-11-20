// Part icons, drawn with paths. x, y = top-left of the square. Same look at any size.
// state: 'idle' | 'firing' | 'locked' | 'selected'
import { glyphsA } from './glyphsA.js';
import { glyphsB } from './glyphsB.js';
import { makeSprite, makeCanvas } from './canvasUtil.js';
import { warn } from './safe.js';
import { FAMILIES, paintTile, paintGlyph, paintFiringGlow } from './art/iconStyle.js'; // [GFX-1] hero icon style

const GLYPHS = Object.assign({}, glyphsA, glyphsB);
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

function drawUnit(g, key, state, sc) {
  const fam = FAMILIES[FAMILY_OF[key] || 'unknown'];
  const locked = state === 'locked';
  paintTile(g, fam, state);
  if (state === 'firing') paintFiringGlow(g, fam);
  g.save(); g.scale(0.98, 0.98);
  if (locked) g.globalAlpha = 0.35;
  const painter = GLYPHS[key] || placeholder;
  paintGlyph(g, painter, locked ? FAMILIES.unknown : fam, locked ? 'locked' : state, sc);
  g.restore();
  if (locked) { // small padlock
    g.fillStyle = '#c9d2ee'; rrPath(g, -0.2, 0.0, 0.4, 0.34, 0.07); g.fill();
    g.beginPath(); g.arc(0, 0, 0.14, Math.PI, 0); g.lineWidth = 0.07; g.strokeStyle = '#c9d2ee'; g.stroke();
  }
  if (state === 'selected') {
    g.lineWidth = 0.07; g.strokeStyle = 'rgba(246,196,83,0.7)'; rrPath(g, -1.0, -1.0, 2.0, 2.0, 0.4); g.stroke();
  }
}
// Neutral placeholder for an unknown part: a ring and a dot.
function placeholder(g, k) {
  g.beginPath(); g.arc(0, 0, 0.42, 0, 6.2832); g.lineWidth = 0.12; g.strokeStyle = k.light; g.stroke();
  g.beginPath(); g.arc(0, 0, 0.1, 0, 6.2832); g.fillStyle = k.light; g.fill();
}

export function draw(ctx, partId, x, y, size, state) {
  try {
    if (!ctx || !(size > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const dev = ctx.getTransform ? ctx.getTransform().a || 1 : 1; // device pixels per css px, so shadows scale with the icon
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2); ctx.scale(size / 2, size / 2);
    drawUnit(ctx, normalizeId(partId), state || 'idle', dev * size / 2);
    ctx.restore();
  } catch (e) { warn('partIcon.draw', e && e.message); try { ctx.restore(); } catch (e2) { /* ignore */ } }
}

// Sprite cache: one small canvas per part, size and state. Used by the bucket for speed.
const cache = new Map();
export function getSprite(partId, size, dpr = 1, state = 'idle') {
  const key = normalizeId(partId) + '|' + Math.round(size) + '|' + dpr + '|' + state;
  let s = cache.get(key);
  if (s === undefined) {
    if (cache.size > 400) cache.clear();
    s = makeSprite(size, size, dpr, (g) => draw(g, partId, 0, 0, size, state));
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
    draw(g, partId, 0, 0, px, 'idle');
    if (typeof c.toDataURL !== 'function') return '';
    const url = c.toDataURL('image/png');
    if (url) { if (urlCache.size > 200) urlCache.clear(); urlCache.set(key, url); }
    return url;
  } catch (e) { warn('partIcon.toDataURL', e && e.message); return ''; }
}
export default { draw, toDataURL, getSprite };
