// Wall detail: roots, crystals, stalactites and glowing veins along both walls, drawn ONCE per size into a
// small offscreen strip and reused. Parallax: the strip scrolls a little slower than the wall.
import { biomePalette, makeCanvas, makeRng, clamp, clamp01, fin, rgba } from './util.js';

const FEATURES = { clay: ['roots'], quartz: ['crystals'], amber: ['veins', 'roots'], magma: ['stalactites', 'veins'], void: ['veins', 'crystals'], abyss: ['roots', 'crystals'] };
const ORDER = ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss'];

function paintSide(g, kinds, m, h, rng, p) {
  for (const k of kinds) {
    if (k === 'roots') {
      const n = Math.max(3, Math.round(h / 110));
      for (let i = 0; i < n; i++) {
        const y0 = rng() * h * 0.85, len = 60 + rng() * 90, reach = m * (0.4 + rng() * 0.5);
        g.strokeStyle = rgba(p.crack, 0.38); g.lineWidth = 1.5 + rng() * 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(reach, y0 + len * 0.3, reach * 0.6, Math.min(h - 2, y0 + len)); g.stroke();
      }
    } else if (k === 'crystals') {
      const n = Math.max(2, Math.round(h / 150));
      for (let i = 0; i < n; i++) {
        const y0 = 20 + rng() * (h - 60);
        for (let j = 0; j < 3; j++) {
          const ang = -0.5 + j * 0.5 + rng() * 0.2, len = m * (0.5 + rng() * 0.5), bw = 4 + rng() * 4;
          const tx = Math.cos(ang) * len, ty = y0 + Math.sin(ang) * len;
          g.fillStyle = rgba(p.crack, 0.34); g.beginPath(); g.moveTo(0, y0 - bw); g.lineTo(tx, ty); g.lineTo(0, y0 + bw); g.closePath(); g.fill();
          g.strokeStyle = rgba(p.mote, 0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(0, y0 - bw); g.lineTo(tx, ty); g.stroke();
        }
      }
    } else if (k === 'stalactites') {
      const n = Math.max(3, Math.round(h / 120));
      for (let i = 0; i < n; i++) {
        const y0 = rng() * (h - 90), wd = 8 + rng() * 10, len = 30 + rng() * 50, off = rng() * m * 0.3;
        g.fillStyle = rgba(p.wallDark, 0.8); g.beginPath(); g.moveTo(0, y0); g.lineTo(off + wd, y0); g.lineTo(off + wd * 0.3, y0 + len); g.lineTo(0, y0 + 4); g.closePath(); g.fill();
      }
    } else if (k === 'veins') {
      const n = Math.max(2, Math.round(h / 200));
      for (let i = 0; i < n; i++) {
        let yy = rng() * (h - 100), xx = 0;
        const path = [[xx, yy]];
        for (let s = 0; s < 6; s++) { xx = Math.max(0, Math.min(m, xx + (rng() - 0.3) * m * 0.5)); yy += 14 + rng() * 18; path.push([xx, Math.min(h - 1, yy)]); }
        for (const [w2, a] of [[5, 0.1], [2, 0.4]]) {
          g.strokeStyle = rgba(p.crack, a); g.lineWidth = w2; g.lineJoin = 'round'; g.beginPath(); g.moveTo(path[0][0], path[0][1]);
          for (let s = 1; s < path.length; s++) g.lineTo(path[s][0], path[s][1]); g.stroke();
        }
      }
    }
  }
}

export function createWallDetail(getFactory) {
  let w = 360, h = 640, dpr = 1, m = 40;
  const strips = {}; // biome -> canvas
  const api = {
    get built() { return Object.keys(strips).filter((k) => strips[k]).length; },
    resize(nw, nh, nd) { w = nw; h = nh; dpr = nd; m = Math.max(16, Math.round(nw * 0.12)); for (const k of Object.keys(strips)) delete strips[k]; },
    release() { for (const k of Object.keys(strips)) delete strips[k]; }, // [PERF-1] strips are not drawn while depth covers the walls; they rebuild on demand
    // Builds one strip, once. Returns true when it did work (so the caller can spread the cost over frames).
    ensure(id) {
      if (!FEATURES[id] || strips[id] !== undefined) return false;
      strips[id] = null;
      const c = makeCanvas(getFactory(), Math.ceil(m * 2 * dpr), Math.ceil(h * dpr));
      const g = c && c.getContext && c.getContext('2d');
      if (!g) return true;
      const p = biomePalette(id);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.save(); paintSide(g, FEATURES[id], m, h, makeRng(ORDER.indexOf(id) * 31 + 5), p); g.restore();
      g.save(); g.translate(m * 2, 0); g.scale(-1, 1); paintSide(g, FEATURES[id], m, h, makeRng(ORDER.indexOf(id) * 31 + 99), p); g.restore();
      strips[id] = c;
      return true;
    },
    // parallax 0..1: how much of the wall's scroll the detail follows (1 = pinned to the wall)
    draw(ctx, id, scrollPx, alpha, parallax) {
      const c = strips[id];
      if (!c || alpha < 0.01) return;
      const off = ((fin(scrollPx) * clamp01(parallax)) % h + h) % h;
      ctx.globalAlpha = clamp01(alpha);
      for (let k = -1; k <= 0; k++) {
        const yy = off + k * h; // tile twice so the wrap is seamless
        ctx.drawImage(c, 0, 0, m * dpr, h * dpr, 0, yy, m, h);
        ctx.drawImage(c, m * dpr, 0, m * dpr, h * dpr, w - m, yy, m, h);
      }
      ctx.globalAlpha = 1;
    },
  };
  return api;
}
