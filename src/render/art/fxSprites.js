// Pre-rendered soft effect sprites (GFX-1 part 8): spark, ember, dust, glint (4-point star), coin glint,
// shockwave ring and confetti shard. Each is painted once per colour, then only blitted with drawImage.
// No canvas? Everything returns false/null and the caller keeps its flat fallback. Never throws.
import { makeSprite } from '../canvasUtil.js';
import { lighten } from './color.js';

export const FX_KINDS = ['spark', 'ember', 'dust', 'glint', 'coin', 'ring', 'confetti'];
export const BASE = 48;            // css px of every sprite
const MAX_ENTRIES = { high: 72, low: 28 };
const WHITE = '#ffffff';

// '#rrggbb', '#rgb' or 'rgba(r,g,b,a)' -> [r,g,b]; anything else -> white.
export function toRgb(c) {
  if (typeof c !== 'string') return [255, 255, 255];
  if (c[0] === '#') {
    let h = c.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h.slice(0, 6), 16);
    return h.length >= 6 && Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 255, 255];
  }
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
  return m ? [Math.min(255, +m[1]), Math.min(255, +m[2]), Math.min(255, +m[3])] : [255, 255, 255];
}
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function radial(g, s, stops) {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  for (const [t, col] of stops) r.addColorStop(t, col);
  g.fillStyle = r; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, 6.2832); g.fill();
}
function star(g, s, long, waist, fill) {
  const c = s / 2;
  g.fillStyle = fill; g.beginPath();
  g.moveTo(c, c - long); g.lineTo(c + waist, c - waist); g.lineTo(c + long, c); g.lineTo(c + waist, c + waist);
  g.lineTo(c, c + long); g.lineTo(c - waist, c + waist); g.lineTo(c - long, c); g.lineTo(c - waist, c - waist); g.closePath(); g.fill();
}

// Painters: (graphics, size, rgb)
export const PAINTERS = {
  spark(g, s, c) { radial(g, s, [[0, css([255, 250, 235])], [0.22, css(lighten(c, 0.35), 0.95)], [0.55, css(c, 0.35)], [1, css(c, 0)]]); },
  ember(g, s, c) { radial(g, s, [[0, css(lighten(c, 0.6))], [0.28, css(c, 0.9)], [0.6, css(c, 0.25)], [1, css(c, 0)]]); },
  dust(g, s, c) { radial(g, s, [[0, css(c, 0.5)], [0.6, css(c, 0.18)], [1, css(c, 0)]]); },
  glint(g, s, c) {
    radial(g, s, [[0, css(c, 0.4)], [1, css(c, 0)]]);
    star(g, s, s * 0.48, s * 0.06, css(lighten(c, 0.7), 0.95)); star(g, s, s * 0.2, s * 0.1, css([255, 252, 240]));
  },
  coin(g, s, c) {
    radial(g, s, [[0, css(c, 0.35)], [1, css(c, 0)]]);
    star(g, s, s * 0.5, s * 0.04, css(lighten(c, 0.65), 0.95));
    g.save(); g.translate(s / 2, s / 2); g.rotate(0.785); g.translate(-s / 2, -s / 2); star(g, s, s * 0.24, s * 0.035, css(lighten(c, 0.5), 0.8)); g.restore();
    g.fillStyle = css([255, 252, 240]); g.beginPath(); g.arc(s / 2, s / 2, s * 0.06, 0, 6.2832); g.fill();
  },
  ring(g, s, c) { radial(g, s, [[0, css(c, 0)], [0.7, css(c, 0)], [0.84, css(c, 0.9)], [0.9, css(lighten(c, 0.5), 0.7)], [1, css(c, 0)]]); },
  confetti(g, s, c) {
    const w = s * 0.5, h = s * 0.26, x = (s - w) / 2, y = (s - h) / 2;
    g.fillStyle = css(c); g.fillRect(x, y, w, h); g.fillStyle = css(lighten(c, 0.45), 0.9); g.fillRect(x, y, w, h * 0.3);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + h * 0.8, w, h * 0.2);
  },
};

// Colours worth building up front so the first burst does not pay for painting.
const WARM = ['#ffe3a1', '#f6c453', '#ff9a4d', '#ff4d5e', '#ffffff'];

export function createFxSprites() {
  let map = new Map(), dpr = 0, low = null, cap = MAX_ENTRIES.high, bytes = 0, off = false;

  function build(kind, color) {
    const draw = PAINTERS[kind]; if (!draw) return null;
    const c = makeSprite(BASE, BASE, dpr, (g, w) => draw(g, w, toRgb(color)));
    if (c) bytes += c.width * c.height * 4;
    return c;
  }
  function free() {
    for (const c of map.values()) { try { c.width = 0; c.height = 0; } catch (e) { /* ignore */ } }
    map = new Map(); bytes = 0;
  }
  const api = {
    get count() { return map.size; },
    get bytes() { return bytes; },
    get ready() { return map.size > 0 && !off; },
    // dprIn: device pixel ratio; lowIn: quality 'low'. Same args twice = no work.
    rebuild(dprIn, lowIn, extraColors) {
      const d = Math.max(1, Math.min(lowIn ? 1.5 : 3, Number(dprIn) || 1)), l = !!lowIn;
      if (!off && d === dpr && l === low && !extraColors) return;
      off = false; free(); dpr = d; low = l; cap = l ? MAX_ENTRIES.low : MAX_ENTRIES.high;
      const colors = l ? WARM.slice(0, 2) : WARM.concat(Array.isArray(extraColors) ? extraColors : []);
      for (const k of FX_KINDS) { const c = build(k, WHITE); if (c) map.set(k + '|' + WHITE, c); } // base white set, always there
      if (map.size === 0) return; // no canvas: nothing else to do
      for (const col of colors) for (const k of ['spark', 'glint', 'ring']) { if (map.size >= cap) break; const key = k + '|' + col; if (!map.has(key)) { const c = build(k, col); if (c) map.set(key, c); } }
    },
    // Find (or lazily make) the sprite for kind+colour. When the cache is full, falls back to the white one.
    get(kind, color) {
      if (off) return null;
      const key = kind + '|' + color; let c = map.get(key);
      if (c) return c;
      if (map.size < cap) { c = build(kind, color); if (c) { map.set(key, c); return c; } }
      return map.get(kind + '|' + WHITE) || null;
    },
    // Blit one sprite centred on x,y. size = on-screen diameter in css px. Returns false if nothing was drawn.
    draw(ctx, kind, color, x, y, size, rot) {
      const c = api.get(kind, color); if (!c || !ctx || !(size > 0)) return false;
      if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(c, -size / 2, -size / 2, size, size); ctx.restore(); }
      else ctx.drawImage(c, x - size / 2, y - size / 2, size, size);
      return true;
    },
    destroy() { free(); off = true; dpr = 0; low = null; },
  };
  return api;
}
