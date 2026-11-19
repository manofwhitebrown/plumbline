// Foreground silhouettes: big dark shapes painted once into small sprites (hanging roots, stalactites, crystal clusters, pipes, ladders, planks).
// Every sprite is drawn for the LEFT edge: it grows from x = 0 toward the right. The right edge uses a mirrored draw.
import { makePrng } from '../art/prng.js';
import { hexToRgb, mix, rgbToCss } from '../art/color.js';

export const SIL_W = 96, SIL_H = 340;
export const SIL_KINDS = ['root', 'stalactite', 'crystal', 'pipe', 'ladder', 'plank'];

const INK = [4, 3, 10];
function bodyColor(pal) { return rgbToCss(mix(INK, hexToRgb(pal.bottom), 0.22), 0.96); }
function rimColor(pal, a) { return rgbToCss(hexToRgb(pal.glow), a); }

function taper(g, pts, w0, w1, color) { // a curved strand that gets thinner: many short segments
  g.strokeStyle = color; g.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    g.lineWidth = w0 + (w1 - w0) * t;
    g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
  }
}
function bez(p0, c, p1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
  }
  return out;
}

function paintRoot(g, w, h, pal, r) {
  const body = bodyColor(pal), rim = rimColor(pal, 0.22);
  const n = 3 + r.int(0, 1);
  for (let s = 0; s < n; s++) {
    const y0 = r.range(-10, 50), x1 = r.range(18, w - 12), y1 = r.range(h * 0.55, h * 0.97);
    const pts = bez([-8, y0], [r.range(8, 60), r.range(h * 0.2, h * 0.5)], [x1, y1], 14);
    const wd = r.range(9, 15);
    taper(g, pts.map((p) => [p[0] + 1.4, p[1]]), wd, 1.2, rim);
    taper(g, pts, wd, 1.2, body);
    for (let k = 0; k < 4; k++) { // side hairs
      const a = pts[r.int(3, 11)], b = [a[0] + r.range(8, 26), a[1] + r.range(14, 40)];
      taper(g, bez(a, [a[0] + r.range(0, 14), a[1] + 8], b, 5), 2.2, 0.6, body);
    }
  }
}
function paintStalactite(g, w, h, pal, r) {
  const body = bodyColor(pal), rim = rimColor(pal, 0.3);
  const n = 2 + r.int(0, 1);
  for (let s = 0; s < n; s++) {
    const bw = r.range(26, 44), top = r.range(-6, 40), len = r.range(h * 0.28, h * 0.62), tx = r.range(12, w - 14);
    const bx0 = -6, bx1 = bw;
    g.beginPath(); g.moveTo(bx0, top);
    const steps = 6;
    for (let i = 1; i <= steps; i++) { const t = i / steps; g.lineTo(bx0 + (tx - bx0) * t + r.range(-3, 3), top + len * t * t * 0.5 + len * 0.5 * t + r.range(-2, 2)); }
    g.lineTo(tx, top + len);
    for (let i = steps; i >= 1; i--) { const t = i / steps; g.lineTo(bx1 + (tx - bx1) * t + r.range(-3, 3), top + len * t * t * 0.5 + len * 0.5 * t + r.range(-2, 2)); }
    g.lineTo(bx1, top); g.closePath();
    g.fillStyle = body; g.fill();
    g.strokeStyle = rim; g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx1, top); g.lineTo(tx + 1, top + len); g.stroke();
  }
}
function paintCrystal(g, w, h, pal, r) {
  const body = bodyColor(pal), rim = rimColor(pal, 0.34), face = rimColor(pal, 0.10);
  const n = 5 + r.int(0, 2), baseY = h - 6;
  for (let s = 0; s < n; s++) {
    const ang = -Math.PI / 2 + r.range(-0.62, 0.9), len = r.range(70, h * 0.62), wd = r.range(13, 28);
    const bx = r.range(-4, 38), ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const P = (a, b) => [bx + ux * a + nx * b, baseY + uy * a + ny * b];
    const pts = [P(0, -wd / 2), P(0, wd / 2), P(len * 0.78, wd / 2), P(len, 0), P(len * 0.78, -wd / 2)];
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath();
    g.fillStyle = body; g.fill();
    g.fillStyle = face; g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); g.lineTo(P(len * 0.78, 0)[0], P(len * 0.78, 0)[1]); g.closePath(); g.fill();
    g.strokeStyle = rim; g.lineWidth = 1.3; g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke();
  }
}
function paintPipe(g, w, h, pal, r) {
  const body = bodyColor(pal), rim = rimColor(pal, 0.26), pw = r.range(15, 21), x0 = r.range(2, 14), endY = h * r.range(0.62, 0.8);
  g.fillStyle = body; g.fillRect(x0 - pw / 2, -4, pw, endY + 4);
  g.fillStyle = rim; g.fillRect(x0 + pw / 2 - 2, -4, 2, endY + 4);
  for (let y = r.range(30, 70); y < endY - 20; y += r.range(60, 90)) { // flanges
    g.fillStyle = body; g.fillRect(x0 - pw / 2 - 5, y, pw + 10, 9);
    g.fillStyle = rim; g.fillRect(x0 + pw / 2 + 3, y, 2, 9);
    g.fillStyle = 'rgba(255,255,255,0.10)'; for (let k = 0; k < 3; k++) g.fillRect(x0 - pw / 2 - 2 + k * (pw / 2), y + 3, 2, 2);
  }
  // elbow to the right, ending in a cap
  const rad = pw * 1.1, ex = x0 + pw / 2 + rad;
  g.strokeStyle = body; g.lineWidth = pw; g.lineCap = 'butt';
  g.beginPath(); g.moveTo(x0, endY); g.arc(ex, endY, rad + pw / 2 - pw / 2, Math.PI, Math.PI * 0.5, true); g.stroke();
  g.fillStyle = body; g.fillRect(ex, endY + rad - pw / 2 + 0.5, r.range(18, w - ex - 6), pw);
  g.fillRect(ex + 14, endY + rad - pw / 2 - 4, 9, pw + 8);
}
function paintLadder(g, w, h, pal, r) {
  const body = bodyColor(pal), rim = rimColor(pal, 0.22), lean = r.range(-0.05, 0.05), gap = r.range(26, 34), x0 = r.range(0, 10), len = h * r.range(0.8, 0.96);
  g.save(); g.translate(x0, 0); g.rotate(lean);
  for (const rail of [0, gap]) { g.fillStyle = rim; g.fillRect(rail + 1.5, -6, 5, len); g.fillStyle = body; g.fillRect(rail, -6, 5, len); }
  for (let y = 18, i = 0; y < len - 10; y += r.range(24, 30), i++) {
    if (r() < 0.2) continue; // missing rung
    g.fillStyle = body; g.fillRect(-2, y, gap + 9, 4.5);
    g.fillStyle = rim; g.fillRect(gap + 4, y, 2, 4.5);
  }
  g.restore();
}
function paintPlank(g, w, h, pal, r) {
  const body = bodyColor(pal), rim = rimColor(pal, 0.2), n = 3;
  for (let s = 0; s < n; s++) {
    const len = r.range(130, 230), wd = r.range(16, 25), ang = r.range(0.75, 2.2), sx = r.range(-4, 22), sy = r.range(h * 0.1, h * 0.65);
    g.save(); g.translate(sx, sy); g.rotate(ang);
    g.beginPath(); g.moveTo(0, -wd / 2);
    g.lineTo(len, -wd / 2 + r.range(-2, 2));
    g.lineTo(len + r.range(-14, 4), -wd / 6); g.lineTo(len - r.range(8, 22), wd / 6); g.lineTo(len + r.range(-10, 2), wd / 2); // broken end
    g.lineTo(0, wd / 2); g.closePath(); g.fillStyle = body; g.fill();
    g.fillStyle = rim; g.fillRect(2, wd / 2 - 2, len * 0.9, 1.6);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(8, -2, 2.4, 2.4); g.fillRect(len * 0.55, 1, 2.4, 2.4);
    g.restore();
  }
}

const PAINT = { root: paintRoot, stalactite: paintStalactite, crystal: paintCrystal, pipe: paintPipe, ladder: paintLadder, plank: paintPlank };

export function paintSilhouette(g, kind, pal, seed) {
  const r = makePrng(seed);
  const f = PAINT[kind] || paintRoot;
  f(g, SIL_W, SIL_H, pal, r);
}
