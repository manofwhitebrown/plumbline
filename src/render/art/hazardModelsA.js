// Hazards: rock (jagged boulder with hot cracks), bat (3 wing frames, red eyes), root (thick, twisting, thorned).
import { hazardColors } from '../palette.js';
import { gemPal, facet, tracePoly, TAU } from './gemFacets.js';
import { softGlow, roundedPoly, contactShadow } from './shapes.js';
import { RIM, dangerGlow, rimStroke } from './hazardRim.js';

// ---- Rock: spiky, irregular, dark; glowing cracks. Nothing smooth, nothing symmetrical.
const rockPts = (S) => [0.1, 0.62, 0.16, 0.36, 0.3, 0.3, 0.34, 0.1, 0.52, 0.22, 0.68, 0.06, 0.78, 0.28, 0.92, 0.4, 0.86, 0.66, 0.74, 0.9, 0.5, 0.82, 0.3, 0.92].map((v) => v * S);
export function paintRockModel(g, S) {
  try {
    const c = hazardColors('rock'), pal = gemPal({ base: c.base, dark: '#23252e', light: c.light });
    dangerGlow(g, S);
    const A = rockPts(S), n = A.length / 2, cx = S * 0.5, cy = S * 0.55;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, mx = (A[i * 2] + A[j * 2]) / 2 - cx, my = (A[i * 2 + 1] + A[j * 2 + 1]) / 2 - cy;
      facet(g, [A[i * 2], A[i * 2 + 1], A[j * 2], A[j * 2 + 1], cx, cy], (0.5 + 0.5 * ((mx * -0.6 + my * -0.8) / (Math.hypot(mx, my) || 1))) * 0.7, pal, 0.2);
    }
    g.save(); tracePoly(g, A); g.clip(); g.lineCap = 'round'; g.lineJoin = 'round';
    const cracks = [[0.34, 0.1, 0.42, 0.34, 0.36, 0.5, 0.5, 0.6, 0.46, 0.84], [0.5, 0.6, 0.7, 0.54, 0.9, 0.62], [0.42, 0.34, 0.2, 0.42]];
    for (const pts of cracks) {
      g.beginPath(); g.moveTo(pts[0] * S, pts[1] * S); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * S, pts[i + 1] * S);
      g.lineWidth = S * 0.07; g.strokeStyle = 'rgba(255,80,40,0.3)'; g.stroke(); // hot glow in the crack
      g.lineWidth = S * 0.035; g.strokeStyle = 'rgb(255,110,50)'; g.stroke();
      g.lineWidth = S * 0.012; g.strokeStyle = 'rgb(255,214,150)'; g.stroke();
    }
    g.restore();
    rimStroke(g, S, (c2) => tracePoly(c2, A));
  } catch (e) { /* keep partial sprite */ }
}

// ---- Bat: wing = 0 up, 1 level, 2 down. Scalloped wings with finger bones, glowing red eyes, small fangs.
function wingPts(S, side, wy) {
  const cx = S / 2, cy = S * 0.52, p = [[0.07, -0.07], [0.26, wy - 0.14], [0.47, wy - 0.02], [0.42, wy + 0.1], [0.35, wy + 0.04], [0.31, wy + 0.17], [0.23, wy + 0.08], [0.17, wy + 0.2], [0.09, 0.13]];
  const out = []; for (const q of p) out.push(cx + side * q[0] * S, cy + q[1] * S); return out;
}
export function paintBatModel(g, S, wing) {
  try {
    const c = hazardColors('bat'), cx = S / 2, cy = S * 0.52, wy = [-0.26, 0, 0.24][wing] || 0;
    dangerGlow(g, S, 0.9);
    const wings = [wingPts(S, -1, wy), wingPts(S, 1, wy)];
    const outline = (c2) => { for (const w of wings) { roundedPoly(c2, w, S * 0.02); } };
    const rimAll = (c2) => { c2.beginPath(); for (const w of wings) { c2.moveTo(w[0], w[1]); for (let i = 2; i < w.length; i += 2) c2.lineTo(w[i], w[i + 1]); c2.closePath(); } };
    for (const w of wings) { // membrane
      const gr = g.createLinearGradient(cx, cy, w[4], w[5]); gr.addColorStop(0, c.base); gr.addColorStop(1, c.dark);
      g.fillStyle = gr; roundedPoly(g, w, S * 0.02); g.fill();
      g.strokeStyle = 'rgba(190,150,230,0.55)'; g.lineWidth = Math.max(0.7, S * 0.02); g.lineCap = 'round'; g.beginPath(); // finger bones
      for (const k of [2, 3, 5, 7]) { g.moveTo(w[2], w[3]); g.lineTo(w[k * 2 > 17 ? 16 : k * 2], w[k * 2 > 17 ? 17 : k * 2 + 1]); }
      g.stroke();
    }
    rimStroke(g, S, rimAll);
    g.fillStyle = c.dark; g.beginPath(); g.ellipse(cx, cy + S * 0.03, S * 0.11, S * 0.16, 0, 0, TAU); g.fill(); // body
    g.fillStyle = c.base; g.beginPath(); g.ellipse(cx - S * 0.03, cy - S * 0.01, S * 0.04, S * 0.09, 0.2, 0, TAU); g.fill();
    g.fillStyle = c.dark; g.beginPath(); g.arc(cx, cy - S * 0.13, S * 0.095, 0, TAU); g.fill(); // head
    g.beginPath(); g.moveTo(cx - S * 0.09, cy - S * 0.17); g.lineTo(cx - S * 0.075, cy - S * 0.3); g.lineTo(cx - S * 0.01, cy - S * 0.2); g.moveTo(cx + S * 0.09, cy - S * 0.17); g.lineTo(cx + S * 0.075, cy - S * 0.3); g.lineTo(cx + S * 0.01, cy - S * 0.2); g.fill(); // ears
    for (const s of [-1, 1]) { softGlow(g, cx + s * S * 0.04, cy - S * 0.13, S * 0.09, [255, 60, 70], 0.8); g.fillStyle = '#ff4d5e'; g.beginPath(); g.ellipse(cx + s * S * 0.04, cy - S * 0.13, S * 0.027, S * 0.02, s * 0.3, 0, TAU); g.fill(); g.fillStyle = '#fff0e0'; g.fillRect(cx + s * S * 0.04 - S * 0.008, cy - S * 0.14, S * 0.012, S * 0.012); }
    g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * S * 0.025, cy - S * 0.07); g.lineTo(cx + s * S * 0.04, cy - S * 0.07); g.lineTo(cx + s * S * 0.032, cy - S * 0.03); g.closePath(); g.fill(); }
  } catch (e) { /* keep partial sprite */ }
}

// ---- Root: thick S-curve with bark ridges and sharp thorns. Drawn upright; the game sways it.
export function paintRootModel(g, S) {
  try {
    const c = hazardColors('root'), BW = S * 0.22; // BW = body width
    const P = (t) => [(0.5 + Math.sin(t * 5.4) * 0.17 * (1 - t * 0.2)) * S, (0.85 - t * 0.7) * S]; // t 0 bottom .. 1 top
    const curve = (c2) => { c2.beginPath(); const a = P(0); c2.moveTo(a[0], a[1]); for (let i = 1; i <= 28; i++) { const q = P(i / 28); c2.lineTo(q[0], q[1]); } };
    g.lineCap = 'round'; g.lineJoin = 'round';
    dangerGlow(g, S, 0.8);
    const thorns = [];
    for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.15, a = P(t), b = P(t + 0.02), side = i % 2 ? 1 : -1, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1; thorns.push([a[0], a[1], (nx / L) * side, (ny / L) * side]); }
    const thorn = (c2, th, len, wd) => { c2.beginPath(); c2.moveTo(th[0], th[1]); c2.lineTo(th[0] + th[2] * S * len, th[1] + th[3] * S * len); c2.lineTo(th[0] + th[3] * S * wd, th[1] - th[2] * S * wd); c2.closePath(); };
    const w = Math.max(1.4, S * 0.05); // red-orange rim: wider than the body so it shows all round
    for (const [extra, col] of [[w * 5, 'rgba(255,92,60,0.16)'], [w * 3.2, 'rgba(255,92,60,0.45)'], [w * 2, 'rgb(255,96,62)']]) { curve(g); g.lineWidth = BW + extra; g.strokeStyle = col; g.stroke(); }
    for (const th of thorns) { thorn(g, th, 0.2, 0.05); g.lineWidth = w * 2.2; g.strokeStyle = 'rgb(255,96,62)'; g.stroke(); }
    curve(g); g.lineWidth = BW; g.strokeStyle = c.dark; g.stroke();
    curve(g); g.lineWidth = BW * 0.78; g.strokeStyle = c.base; g.stroke();
    g.save(); curve(g); g.lineWidth = BW * 0.78; g.setLineDash([S * 0.02, S * 0.05]); g.strokeStyle = 'rgba(40,24,8,0.5)'; g.stroke(); g.restore();
    g.save(); g.translate(-S * 0.03, -S * 0.02); curve(g); g.lineWidth = BW * 0.2; g.strokeStyle = c.light; g.globalAlpha = 0.85; g.stroke(); g.restore();
    for (const th of thorns) { thorn(g, th, 0.17, 0.042); g.fillStyle = '#efe0b8'; g.fill(); g.lineWidth = Math.max(0.6, S * 0.015); g.strokeStyle = c.dark; g.stroke(); }
  } catch (e) { /* keep partial sprite */ }
}
