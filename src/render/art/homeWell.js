// Front layer, part 2: the stone well (cobbles, lit rim, deep shaft), wooden winch frame, lantern housing.
// Plus the few live pieces drawn each frame: drum planks, crank, rope and the cached bucket sprite.
import { makePrng } from './prng.js';
const TAU = 6.2832, PI = Math.PI;
const TONES = [[140, 124, 106], [116, 102, 90], [166, 146, 120]];
const rgb = (t, k) => `rgb(${Math.min(255, t[0] * k) | 0},${Math.min(255, t[1] * k) | 0},${Math.min(255, t[2] * k) | 0})`;
const lightK = (x, L) => 0.52 + 0.55 * Math.max(0, 1 - Math.abs(x - L.lanternX) / (L.wellRx * 2.3));

function quad(g, cx, cy, rx, ry, a0, a1, y0, y1, col) {
  const x0 = cx + rx * Math.cos(a0), x1 = cx + rx * Math.cos(a1), s0 = cy + ry * Math.sin(a0), s1 = cy + ry * Math.sin(a1);
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 2.2; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x0, s0 + y0); g.lineTo(x1, s1 + y0); g.lineTo(x1, s1 + y1); g.lineTo(x0, s0 + y1); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,224,170,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 1, s0 + y0 + 0.6); g.lineTo(x1 - 1, s1 + y0 + 0.6); g.stroke();
}
export function paintWell(g, L) {
  const rnd = makePrng(53), cx = L.wellCx, cy = L.wellCy, rx = L.wellRx, ry = L.wellRy, wh = ry * 1.45, WX = rx * 1.08, WY = ry * 1.1, IX = rx * 0.86, IY = ry * 0.84;
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(cx + 4, cy + wh + 2, WX * 1.2, WY * 0.85, 0, 0, TAU); g.fill(); // ground shadow
  g.save(); g.beginPath(); g.moveTo(cx - WX, cy); g.lineTo(cx - WX, cy + wh); g.ellipse(cx, cy + wh, WX, WY, 0, PI, 0, true); g.lineTo(cx + WX, cy); g.ellipse(cx, cy, WX, WY, 0, 0, PI, false); g.closePath();
  g.fillStyle = '#1e1612'; g.fill(); g.clip();
  const rows = 3, rh = wh / rows;
  for (let r = 0; r < rows; r++) {
    const n = 15 + r, step = PI / n, off = (r % 2) * step * 0.5;
    for (let i = -1; i <= n; i++) {
      const a0 = i * step + off + 0.012, a1 = a0 + step * (0.86 + rnd() * 0.1), mid = (a0 + a1) / 2;
      if (a1 < 0 || a0 > PI) continue;
      const x = cx + WX * Math.cos(mid), k = lightK(x, L) * (0.7 + 0.3 * Math.sin(Math.max(0, Math.min(PI, mid)))) * (1 - r * 0.1) * (0.88 + rnd() * 0.22);
      quad(g, cx, cy, WX, WY, a0, a1, r * rh + 1.4 + rnd(), (r + 1) * rh - 1.4 - rnd(), rgb(TONES[(rnd() * 3) | 0], k));
    }
  }
  const sh = g.createLinearGradient(0, cy, 0, cy + wh + WY); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.6, 'rgba(0,0,0,0.12)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = sh; g.fillRect(cx - WX, cy, WX * 2, wh + WY + 2);
  for (let i = 0; i < 14; i++) { const a = rnd() * PI, x = cx + WX * Math.cos(a), y = cy + WY * Math.sin(a) + wh * (0.55 + rnd() * 0.45); g.fillStyle = 'rgba(88,128,60,0.55)'; g.beginPath(); g.ellipse(x, y, 3 + rnd() * 5, 1.4 + rnd() * 2, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(214,178,122,0.16)'; g.beginPath(); g.ellipse(x + 6, y + 3, 6 + rnd() * 6, 1.6, 0, 0, TAU); g.fill(); }
  g.restore();
  // top rim: stones between the outer and inner ellipse, back stones dimmer
  const N = 38, st = TAU / N;
  for (let i = 0; i < N; i++) {
    const a0 = i * st + 0.02, a1 = a0 + st - 0.04, mid = (a0 + a1) / 2, sn = Math.sin(mid), x = cx + rx * Math.cos(mid), k = lightK(x, L) * (sn > 0 ? 1.12 : 0.95) * (0.88 + rnd() * 0.24), c = rgb(TONES[(rnd() * 3) | 0], k);
    g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx + WX * Math.cos(a0), cy - 1 + WY * Math.sin(a0)); g.lineTo(cx + WX * Math.cos(a1), cy - 1 + WY * Math.sin(a1)); g.lineTo(cx + IX * Math.cos(a1), cy + IY * Math.sin(a1)); g.lineTo(cx + IX * Math.cos(a0), cy + IY * Math.sin(a0)); g.closePath(); g.fill(); g.stroke();
    if (sn > 0) { g.strokeStyle = 'rgba(255,226,176,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + WX * Math.cos(a0), cy - 0.4 + WY * Math.sin(a0)); g.lineTo(cx + WX * Math.cos(a1), cy - 0.4 + WY * Math.sin(a1)); g.stroke(); }
  }
  // the shaft: lit back wall fading to black, faint warm glow far below
  g.save(); g.beginPath(); g.ellipse(cx, cy, IX, IY, 0, 0, TAU); g.clip();
  const sg = g.createLinearGradient(0, cy - IY, 0, cy + IY); sg.addColorStop(0, '#5a4535'); sg.addColorStop(0.18, '#241a18'); sg.addColorStop(0.5, '#05040a'); sg.addColorStop(1, '#010103'); g.fillStyle = sg; g.fillRect(cx - IX, cy - IY, IX * 2, IY * 2);
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.2; for (let j = 1; j <= 3; j++) { g.beginPath(); g.ellipse(cx, cy + IY * 0.1 * j - IY * 0.05, IX * (1 - 0.03 * j), IY * 0.96, 0, PI, TAU); g.stroke(); }
  const gl = g.createRadialGradient(cx, cy + IY * 0.25, 0, cx, cy + IY * 0.25, IX * 0.55); gl.addColorStop(0, 'rgba(150,100,48,0.2)'); gl.addColorStop(1, 'rgba(150,100,48,0)'); g.fillStyle = gl; g.fillRect(cx - IX, cy - IY, IX * 2, IY * 2);
  g.restore();
  g.strokeStyle = 'rgba(255,214,150,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, IX, IY, 0, PI * 1.08, PI * 1.92); g.stroke(); // lit inner rim
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2.6; g.beginPath(); g.ellipse(cx, cy, IX, IY, 0, 0.1, PI - 0.1); g.stroke();
}
function wood(g, x, y, w, h, vertical) { const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#6a4428'); gr.addColorStop(0.35, '#4a2f1c'); gr.addColorStop(1, '#2a1a10'); g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 1; i < 3; i++) { if (vertical) g.fillRect(x + w * i / 3, y, 0.7, h); else g.fillRect(x, y + h * i / 3, w, 0.7); } }
export function paintWinch(g, L) {
  const cx = L.wellCx, px = L.post, top = L.beamY, base = L.wellCy + L.wellRy * 0.65, u = L.u;
  g.strokeStyle = '#3a2416'; g.lineWidth = 3.4; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * px, base - 6); g.lineTo(cx + sx * (px - 22 * u), top + 4); g.stroke(); } // braces
  for (const sx of [-1, 1]) { const x = cx + sx * px; wood(g, x - 4.5, top - 4, 9, base - top + 4, true); g.fillStyle = 'rgba(255,200,130,0.28)'; g.fillRect(x - 4.5 + (sx > 0 ? 0 : 7.8), top, 1.2, base - top); g.fillStyle = '#d9b26a'; g.fillRect(x - 5.4, top + 5, 10.8, 2.2); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, base + 1, 8, 2.4, 0, 0, TAU); g.fill(); }
  wood(g, cx - px - 9, top - 7, px * 2 + 18, 10, false); g.fillStyle = 'rgba(255,200,130,0.3)'; g.fillRect(cx - px - 9, top - 7, px * 2 + 18, 1.6); g.fillStyle = '#d9b26a'; g.fillRect(cx - px - 9, top - 7, 3, 10); g.fillRect(cx + px + 6, top - 7, 3, 10);
  // drum (rope coiled in the middle), the planks are drawn live so it turns
  const dy = L.drumY, r = L.drumR, dl = px - 7, dg = g.createLinearGradient(0, dy - r, 0, dy + r); dg.addColorStop(0, '#8a5c34'); dg.addColorStop(0.45, '#5a3a22'); dg.addColorStop(1, '#2a1a10'); g.fillStyle = dg; g.fillRect(cx - dl, dy - r, dl * 2, r * 2);
  g.fillStyle = '#b89457'; g.fillRect(cx - dl * 0.5, dy - r - 0.6, dl, r * 2 + 1.2); g.fillStyle = 'rgba(60,38,18,0.55)'; for (let x = cx - dl * 0.5 + 2; x < cx + dl * 0.5; x += 3.2) g.fillRect(x, dy - r - 0.6, 0.9, r * 2 + 1.2);
  g.fillStyle = 'rgba(255,240,200,0.28)'; g.fillRect(cx - dl * 0.5, dy - r * 0.6, dl, 1.6);
  // lantern: iron arm off the right post, short chain, glass case (flame is drawn live)
  const lx = L.lanternX, ly = L.lanternY; g.strokeStyle = '#2a2018'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx + px, top + 6); g.lineTo(lx, top + 4); g.lineTo(lx, ly - 8); g.stroke();
  g.fillStyle = '#3a2c1c'; g.fillRect(lx - 5, ly - 8, 10, 2.4); g.fillRect(lx - 5, ly + 7, 10, 2.4); g.fillStyle = 'rgba(255,214,140,0.9)'; g.fillRect(lx - 3.6, ly - 5.6, 7.2, 12.6); g.fillStyle = 'rgba(120,70,20,0.35)'; g.fillRect(lx - 0.5, ly - 5.6, 1, 12.6);
}
// Bucket with wooden staves and two metal bands, painted once (about 36x40).
export function paintBucket(g, w, h) {
  const cx = w / 2, bg = g.createLinearGradient(4, 0, w - 4, 0); bg.addColorStop(0, '#2c1a10'); bg.addColorStop(0.5, '#8a5a30'); bg.addColorStop(1, '#4a2b18');
  g.strokeStyle = '#c9b27a'; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, 10, 11, PI * 1.08, PI * 1.92); g.stroke();
  g.fillStyle = bg; g.beginPath(); g.moveTo(5, 12); g.lineTo(w - 5, 12); g.lineTo(w - 8, h - 3); g.quadraticCurveTo(cx, h + 1, 8, h - 3); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(5 + i * (w - 10) / 5, 13); g.lineTo(8 + i * (w - 16) / 5, h - 3); g.stroke(); }
  for (const [y, wd] of [[16, 0], [h - 10, 3]]) { const gg = g.createLinearGradient(0, 0, w, 0); gg.addColorStop(0, '#5a6470'); gg.addColorStop(0.5, '#c6d0da'); gg.addColorStop(1, '#6a7480'); g.fillStyle = gg; g.fillRect(5 + wd, y, w - 10 - wd * 2, 3.6); }
  g.fillStyle = '#d9b26a'; g.beginPath(); g.arc(cx, 8, 2.6, 0, TAU); g.fill(); g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(cx, 12, (w - 10) / 2, 2.6, 0, 0, TAU); g.fill(); g.strokeStyle = '#c6d0da'; g.lineWidth = 1; g.stroke();
}
// Live winch pieces. ang: crank angle, sw: bucket sway in px, bucket: cached sprite. No allocation.
export function drawWinchLive(g, L, ang, sw, bucket) {
  const cx = L.wellCx, dy = L.drumY, r = L.drumR, dl = L.post - 7;
  g.strokeStyle = 'rgba(25,14,8,0.6)'; g.lineWidth = 1; g.beginPath();
  for (let k = 0; k < 4; k++) { const a = ang + k * PI / 2; if (Math.cos(a) > 0.05) { const y = dy + Math.sin(a) * r * 0.92; g.moveTo(cx - dl, y); g.lineTo(cx - dl * 0.5, y); g.moveTo(cx + dl * 0.5, y); g.lineTo(cx + dl, y); } }
  g.stroke();
  const kx = L.crankX, ky = dy, hx = kx + Math.cos(ang) * L.crankR, hy = ky + Math.sin(ang) * L.crankR;
  g.lineCap = 'round'; g.strokeStyle = '#2a1a10'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - dl, dy); g.lineTo(kx, ky); g.stroke();
  g.strokeStyle = '#4a4038'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(kx, ky); g.lineTo(hx, hy); g.stroke(); g.fillStyle = '#d9b26a'; g.beginPath(); g.arc(hx, hy, 3.2, 0, TAU); g.fill(); g.fillStyle = '#6b4a22'; g.beginPath(); g.arc(kx, ky, 2.4, 0, TAU); g.fill();
  const bw = L.bucketW, bh = bw * 1.1, bx = cx + sw, by = L.bucketY, ry0 = dy + r;
  g.strokeStyle = '#a8803e'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(cx, ry0); g.lineTo(bx, by + bh * 0.1); g.stroke(); g.strokeStyle = '#e8c984'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(cx - 0.8, ry0); g.lineTo(bx - 0.8, by + bh * 0.1); g.stroke();
  g.lineCap = 'butt'; if (bucket) g.drawImage(bucket, bx - bw / 2, by, bw, bh);
}
