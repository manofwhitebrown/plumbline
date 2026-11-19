// Shared vector pieces for wall details: cracks, crystals, resin, drips, stars.
// Every piece is drawn three times shifted by the tile height (wrapY) so the tile joins top to bottom.
import { rgbToCss, lighten, darken, mix } from './color.js';
import { softGlow, roundedPoly } from './shapes.js';

// Runs fn(g) at y, y-h and y+h so shapes that cross the top or bottom edge wrap around.
export function wrapY(g, h, fn) {
  for (const dy of [0, -h, h]) { g.save(); g.translate(0, dy); fn(g); g.restore(); }
}

// Random-walk cracks. Returns an array of point lists [x0,y0,x1,y1,...]. Some branch.
export function makeCracks(rng, w, h, count, seg = 14) {
  const out = [];
  for (let k = 0; k < count; k++) {
    let x = rng() * w, y = rng() * h, a = Math.PI / 2 + (rng() - 0.5) * 1.2;
    const pts = [x, y], n = 5 + Math.floor(rng() * 5);
    for (let s = 0; s < n; s++) {
      a += (rng() - 0.5) * 1.1; x += Math.cos(a) * seg * (0.6 + rng()); y += Math.sin(a) * seg * (0.6 + rng());
      pts.push(x, y);
      if (s > 1 && rng() < 0.3) { // a short branch
        const b = [x, y]; let bx = x, by = y, ba = a + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.6);
        for (let t = 0; t < 2 + Math.floor(rng() * 2); t++) { bx += Math.cos(ba) * seg * 0.7; by += Math.sin(ba) * seg * 0.7; b.push(bx, by); ba += (rng() - 0.5) * 0.8; }
        out.push(b);
      }
    }
    out.push(pts);
  }
  return out;
}
export function tracePts(g, pts) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
}
// Strokes cracks in layers (wide soft glow, colour line, hot core).
export function strokeGlowCracks(g, cracks, rgb, alpha, widthScale = 1) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  const hot = lighten(rgb, 0.65);
  for (const pts of cracks) {
    tracePts(g, pts); g.lineWidth = 7 * widthScale; g.strokeStyle = rgbToCss(rgb, 0.12 * alpha); g.stroke();
    g.lineWidth = 2.6 * widthScale; g.strokeStyle = rgbToCss(rgb, 0.55 * alpha); g.stroke();
    g.lineWidth = 1 * widthScale; g.strokeStyle = rgbToCss(hot, 0.9 * alpha); g.stroke();
  }
}
// A dark fissure under the glow so cracks look cut into the stone.
export function strokeFissures(g, cracks, alpha, widthScale = 1) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const pts of cracks) { tracePts(g, pts); g.lineWidth = 3.4 * widthScale; g.strokeStyle = `rgba(2,1,8,${0.55 * alpha})`; g.stroke(); }
}

// Faceted crystal cluster growing from (x,y). base = [r,g,b]. size in px. Lit from the top-left.
export function crystalCluster(g, x, y, size, rng, base, alpha = 1) {
  const n = 3 + Math.floor(rng() * 3);
  const lit = lighten(base, 0.22), shade = darken(base, 0.45), mid = base;
  const order = []; for (let i = 0; i < n; i++) order.push(i);
  for (const i of order) {
    const t = n === 1 ? 0.5 : i / (n - 1), tilt = (t - 0.5) * 0.9 + (rng() - 0.5) * 0.15;
    const L = size * (0.55 + rng() * 0.5) * (1 - Math.abs(t - 0.5) * 0.5), wd = size * (0.13 + rng() * 0.06);
    const bx = x + (t - 0.5) * size * 0.6, by = y;
    const sx = Math.sin(tilt), cx = Math.cos(tilt);
    const px = (u, v) => [bx + u * cx + v * sx, by + v * cx - u * sx]; // rotate (u across, v up as negative)
    const bl = px(-wd, 0), br = px(wd, 0), tl = px(-wd, -L * 0.72), tr = px(wd, -L * 0.72), tip = px(0, -L), mt = px(0, -L * 0.72);
    g.globalAlpha = alpha;
    g.fillStyle = rgbToCss(lit); // left face (lit)
    g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(px(0, 0)[0], px(0, 0)[1]); g.lineTo(mt[0], mt[1]); g.lineTo(tl[0], tl[1]); g.closePath(); g.fill();
    g.fillStyle = rgbToCss(shade); // right face (shaded)
    g.beginPath(); g.moveTo(px(0, 0)[0], px(0, 0)[1]); g.lineTo(br[0], br[1]); g.lineTo(tr[0], tr[1]); g.lineTo(mt[0], mt[1]); g.closePath(); g.fill();
    g.fillStyle = rgbToCss(mix(mid, lit, 0.6)); // tip facets
    g.beginPath(); g.moveTo(tl[0], tl[1]); g.lineTo(mt[0], mt[1]); g.lineTo(tip[0], tip[1]); g.closePath(); g.fill();
    g.fillStyle = rgbToCss(darken(mid, 0.25));
    g.beginPath(); g.moveTo(mt[0], mt[1]); g.lineTo(tr[0], tr[1]); g.lineTo(tip[0], tip[1]); g.closePath(); g.fill();
    g.strokeStyle = rgbToCss(lighten(base, 0.55), 0.9); g.lineWidth = 0.9; // rim light on the lit edge
    g.beginPath(); g.moveTo(bl[0], bl[1]); g.lineTo(tl[0], tl[1]); g.lineTo(tip[0], tip[1]); g.stroke();
    g.globalAlpha = 1;
  }
}

// Fossil resin pocket: dark rim, glowing honey body, a dark fossil inside, a highlight arc.
export function resinPocket(g, x, y, rx, ry, rng, glow = true) {
  g.save(); g.translate(x, y); g.rotate((rng() - 0.5) * 0.6);
  // irregular blob outline (not a perfect ellipse) so it reads as resin trapped in rock
  const pts = []; for (let i = 0; i < 9; i++) { const t = (i / 9) * 6.2832, k = 0.82 + rng() * 0.3; pts.push(Math.cos(t) * rx * k, Math.sin(t) * ry * k); }
  roundedPoly(g, pts.map((v) => v * 1.22), rx * 0.7); g.fillStyle = 'rgba(24,10,2,0.85)'; g.fill();
  const gr = g.createRadialGradient(-rx * 0.25, -ry * 0.3, 0, 0, 0, rx * 1.1);
  gr.addColorStop(0, 'rgb(236,184,98)'); gr.addColorStop(0.5, 'rgb(190,112,34)'); gr.addColorStop(1, 'rgb(96,44,8)');
  roundedPoly(g, pts, rx * 0.7); g.fillStyle = gr; g.fill();
  if (rng() < 0.6) { // a tiny fossil leaf or insect
    g.fillStyle = 'rgba(60,24,4,0.75)'; g.beginPath(); g.ellipse(rx * 0.1, ry * 0.1, rx * 0.4, ry * 0.14, 0.5, 0, 6.2832); g.fill();
    g.strokeStyle = 'rgba(60,24,4,0.7)'; g.lineWidth = 0.8;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(rx * (0.05 + i * 0.12), ry * 0.1); g.lineTo(rx * (0.05 + i * 0.12) - 2, ry * 0.45); g.stroke(); }
  }
  g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 1.1; g.lineCap = 'round';
  g.beginPath(); g.ellipse(0, 0, rx * 0.66, ry * 0.66, 0, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
  g.restore();
}
// Soft glow halo for a pocket (drawn in the glow pass).
export function pocketHalo(g, x, y, r, alpha) { softGlow(g, x, y, r, [255, 170, 60], alpha); }

// Honey drip hanging from (x,y): tapered strand and a drop.
export function honeyDrip(g, x, y, len) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(30,14,2,0.7)'; g.lineWidth = 4.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + len); g.stroke();
  g.strokeStyle = 'rgb(214,120,28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + len); g.stroke();
  g.strokeStyle = 'rgb(255,214,120)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 0.8, y + 1); g.lineTo(x - 0.8, y + len - 1); g.stroke();
  g.fillStyle = 'rgb(255,190,80)'; g.beginPath(); g.ellipse(x, y + len + 2, 2.6, 3.4, 0, 0, 6.2832); g.fill();
  g.fillStyle = 'rgba(255,250,220,0.9)'; g.beginPath(); g.arc(x - 0.9, y + len + 1, 0.9, 0, 6.2832); g.fill();
  g.restore();
}

// Star: a dot with a tiny cross when big enough.
export function star(g, x, y, r, rgb, alpha) {
  softGlow(g, x, y, r * 4, rgb, alpha * 0.35);
  g.fillStyle = rgbToCss(lighten(rgb, 0.7), alpha); g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  if (r > 1.1) { g.strokeStyle = rgbToCss(lighten(rgb, 0.6), alpha * 0.7); g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - r * 3, y); g.lineTo(x + r * 3, y); g.moveTo(x, y - r * 3); g.lineTo(x, y + r * 3); g.stroke(); }
}
