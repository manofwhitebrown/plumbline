// The hero bucket: curved wooden staves with grain (fbm stretched along the wood), brass hoops with bevel and rivets,
// a brass rim, and a small brass-and-glass lantern. Painted once into a sprite (see bucket.js).
import { fbm } from './noise.js';
import { makeCanvas } from '../canvasUtil.js';
import { roundRectPath } from './shapes.js';
import { hash2 } from './prng.js';

const WOOD_DARK = [58, 32, 14], WOOD_LIGHT = [170, 108, 56];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Traces the bucket body: slightly tapered, sides bulge outward a little (staves curve).
function bodyPath(g, x, y, w, h, taper) {
  g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + w, y + 6);
  g.quadraticCurveTo(x + w - taper * 0.2 + 5, y + h * 0.55, x + w - taper, y + h);
  g.lineTo(x + taper, y + h);
  g.quadraticCurveTo(x + taper * 0.2 - 5, y + h * 0.55, x, y + 6); g.closePath();
}

// Wood texture at half resolution, then smoothed up. Grain runs along the staves (stretched fbm).
function paintWood(g, x, y, w, h) {
  const f = 2, lw = Math.ceil(w / f), lh = Math.ceil(h / f), c = makeCanvas(lw, lh), cg = c && c.getContext && c.getContext('2d');
  if (!cg || !cg.createImageData) { g.fillStyle = '#6a3f1e'; g.fillRect(x, y, w, h); return; }
  const n = Math.max(3, Math.round(w / 14)), img = cg.createImageData(lw, lh), d = img.data;
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
    const px = i * f, sf = (px / w) * n, id = Math.min(n - 1, Math.floor(sf)), u = sf - id;
    const grain = fbm(px * 0.5 + id * 9.1, j * f * 0.045, 11, 3); // long streaks
    const ring = 0.5 + 0.5 * Math.sin(grain * 26 + id);          // growth lines
    const cyl = 0.35 + 0.65 * Math.sin(Math.min(1, Math.max(0, u)) * Math.PI); // each stave is round: bright in the middle
    let t = 0.12 + cyl * 0.5 + (grain - 0.5) * 0.55 + (ring - 0.5) * 0.07 + (hash2(id, 3, 5) - 0.5) * 0.14;
    if (u < 0.05 || u > 0.95) t *= 0.35; // dark seam between staves
    t = Math.max(0, Math.min(1, t));
    const col = mixc(WOOD_DARK, WOOD_LIGHT, t), p = (j * lw + i) * 4;
    d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
  }
  cg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, lw, lh, x, y, w, h);
  c.width = 1; c.height = 1;
}

function hoop(g, x, ry, w) { // brass band with bevel and rivets
  const gr = g.createLinearGradient(0, ry - 5, 0, ry + 5);
  gr.addColorStop(0, '#fff0bd'); gr.addColorStop(0.3, '#e6b24a'); gr.addColorStop(0.7, '#b57d26'); gr.addColorStop(1, '#6a4614');
  g.fillStyle = gr; g.fillRect(x + 1, ry - 5, w - 2, 10);
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 1, ry - 5, w - 2, 1.2); // top bevel
  g.fillStyle = 'rgba(30,16,2,0.6)'; g.fillRect(x + 1, ry + 4, w - 2, 1.2);      // bottom bevel
  const step = 26; for (let rx = x + step / 2; rx < x + w - 6; rx += step) {
    g.fillStyle = 'rgba(30,16,2,0.55)'; g.beginPath(); g.arc(rx + 0.6, ry + 0.8, 2, 0, 6.2832); g.fill();
    g.fillStyle = '#d9a441'; g.beginPath(); g.arc(rx, ry, 1.9, 0, 6.2832); g.fill();
    g.fillStyle = '#fff3c8'; g.beginPath(); g.arc(rx - 0.6, ry - 0.7, 0.7, 0, 6.2832); g.fill();
  }
}

// L = layout (bucketW, bucketH, pad, rim, tile, rows). The sprite is (bucketW + 24) x (bucketH + 24).
export function paintBucketBody(g, L) {
  try {
    const x = 12, y = 12, w = L.bucketW, h = L.bucketH, taper = 8;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 16; g.shadowOffsetY = 6; bodyPath(g, x, y, w, h, taper); g.fillStyle = '#2a1608'; g.fill(); g.restore();
    g.save(); bodyPath(g, x, y, w, h, taper); g.clip();
    paintWood(g, x - 6, y, w + 12, h);
    const sh = g.createLinearGradient(x, 0, x + w, 0); // round the whole bucket
    sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(0.22, 'rgba(0,0,0,0)'); sh.addColorStop(0.78, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = sh; g.fillRect(x, y, w, h);
    const lit = g.createLinearGradient(0, y, 0, y + h); lit.addColorStop(0, 'rgba(255,220,160,0.14)'); lit.addColorStop(0.5, 'rgba(0,0,0,0)'); lit.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = lit; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(10,8,14,0.62)'; const px = x + L.pad - 4, pw = w - L.pad * 2 + 8; // dark plate behind the rig tiles
    roundRectPath(g, px, y + L.rim + 2, pw, L.tile * L.rows + L.pad * 2 - 8, 12); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2; g.stroke(); // inner shadow edge of the plate
    g.strokeStyle = 'rgba(255,220,160,0.12)'; g.lineWidth = 1; roundRectPath(g, px + 1.5, y + L.rim + 3.5, pw - 3, L.tile * L.rows + L.pad * 2 - 11, 11); g.stroke();
    g.restore();
    hoop(g, x, y + 22, w); hoop(g, x + taper * 0.3, y + h - 12, w - taper * 0.6);
    const rg = g.createLinearGradient(0, y, 0, y + 15); // brass rim
    rg.addColorStop(0, '#fff3c4'); rg.addColorStop(0.35, '#e6b24a'); rg.addColorStop(0.75, '#a8741f'); rg.addColorStop(1, '#6a4614');
    roundRectPath(g, x - 4, y, w + 8, 15, 7); g.fillStyle = rg; g.fill();
    g.strokeStyle = 'rgba(30,16,2,0.55)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 6, y + 2, w - 12, 1.6);
    g.fillStyle = 'rgba(30,16,2,0.35)'; g.fillRect(x + 4, y + 11, w - 8, 1.4);
  } catch (e) { /* keep a partial bucket */ }
}

// Brass lantern with a glowing glass body. Sprite is 20 x 30 css px; the flame light is added by the game.
export function paintLantern(g) {
  try {
    g.lineCap = 'round'; g.strokeStyle = '#b8862e'; g.lineWidth = 1.6; g.beginPath(); g.arc(10, 4, 3.2, Math.PI, 0); g.stroke(); // ring
    const cap = g.createLinearGradient(0, 6, 0, 11); cap.addColorStop(0, '#ffe3a1'); cap.addColorStop(1, '#8a5e1c');
    g.fillStyle = cap; g.beginPath(); g.moveTo(10, 5); g.lineTo(16, 11); g.lineTo(4, 11); g.closePath(); g.fill();
    const glass = g.createLinearGradient(0, 11, 0, 25); glass.addColorStop(0, '#fff2b8'); glass.addColorStop(0.5, '#ffc45a'); glass.addColorStop(1, '#e8802a');
    roundRectPath(g, 4.5, 11, 11, 14, 2.5); g.fillStyle = glass; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(10, 18.5, 2.2, 3.8, 0, 0, 6.2832); g.fill(); // flame
    g.strokeStyle = 'rgba(70,36,6,0.75)'; g.lineWidth = 0.9; for (const bx of [7.5, 12.5]) { g.beginPath(); g.moveTo(bx, 11); g.lineTo(bx, 25); g.stroke(); } // cage bars
    const base = g.createLinearGradient(0, 25, 0, 28); base.addColorStop(0, '#d9a441'); base.addColorStop(1, '#6a4614');
    g.fillStyle = base; roundRectPath(g, 3.5, 25, 13, 3.2, 1.2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(5.5, 12); g.lineTo(5.5, 24); g.stroke(); // glass rim light
  } catch (e) { /* keep partial lantern */ }
}
