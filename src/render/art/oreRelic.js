// Ore (chunky rock with a gold vein and sparkles) and Relic (small ornate chest). Both drawn into 0..S.
import { gemPal, facet, tracePoly, edgeAndRim, TAU } from './gemFacets.js';
import { softGlow, contactShadow, roundRectPath } from './shapes.js';
import { rgbToCss } from './color.js';

const ROCK = gemPal({ base: '#7d8291', light: '#b7bccb', dark: '#2f3340' });
const orePts = (S) => [0.2, 0.34, 0.42, 0.14, 0.7, 0.2, 0.88, 0.46, 0.8, 0.78, 0.5, 0.88, 0.22, 0.76, 0.12, 0.54].map((v) => v * S);

export function paintOreModel(g, S) {
  try {
    contactShadow(g, S * 0.5, S * 0.9, S * 0.3, S * 0.06, 0.3);
    const A = orePts(S), n = A.length / 2, cx = S * 0.5, cy = S * 0.52;
    for (let i = 0; i < n; i++) { // fan of rock facets
      const j = (i + 1) % n, mx = (A[i * 2] + A[j * 2]) / 2 - cx, my = (A[i * 2 + 1] + A[j * 2 + 1]) / 2 - cy;
      const lit = 0.5 + 0.5 * ((mx * -0.6 + my * -0.8) / (Math.hypot(mx, my) || 1));
      facet(g, [A[i * 2], A[i * 2 + 1], A[j * 2], A[j * 2 + 1], cx, cy], lit * 0.85, ROCK, 0.16);
    }
    g.save(); tracePoly(g, A); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const vein = (w, col) => { g.lineWidth = w; g.strokeStyle = col; g.beginPath(); g.moveTo(S * 0.18, S * 0.66); g.lineTo(S * 0.38, S * 0.5); g.lineTo(S * 0.52, S * 0.6); g.lineTo(S * 0.66, S * 0.4); g.lineTo(S * 0.86, S * 0.32); g.stroke(); };
    vein(S * 0.13, 'rgba(40,24,4,0.6)'); vein(S * 0.09, 'rgb(214,150,40)'); vein(S * 0.05, 'rgb(246,196,83)'); vein(S * 0.018, 'rgb(255,244,196)');
    g.restore();
    edgeAndRim(g, S, ROCK, (c) => tracePoly(c, A));
    for (const [x, y, r] of [[0.3, 0.44, 0.03], [0.62, 0.52, 0.026], [0.74, 0.62, 0.022], [0.46, 0.72, 0.02]]) { // sparkle flecks
      g.fillStyle = 'rgba(255,248,214,0.95)'; g.beginPath(); g.arc(S * x, S * y, S * r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,248,214,0.75)'; g.lineWidth = Math.max(0.5, S * 0.012); g.beginPath();
      g.moveTo(S * x - S * r * 2.6, S * y); g.lineTo(S * x + S * r * 2.6, S * y); g.moveTo(S * x, S * y - S * r * 2.6); g.lineTo(S * x, S * y + S * r * 2.6); g.stroke();
    }
  } catch (e) { /* keep partial sprite */ }
}

export function paintRelicModel(g, S) {
  try {
    softGlow(g, S * 0.5, S * 0.55, S * 0.5, [246, 196, 83], 0.22);
    contactShadow(g, S * 0.5, S * 0.9, S * 0.32, S * 0.06, 0.32);
    const x = S * 0.12, w = S * 0.76, lidT = S * 0.2, split = S * 0.46, bot = S * 0.84;
    // body (wood with grain)
    roundRectPath(g, x, split, w, bot - split, S * 0.04);
    const wg = g.createLinearGradient(x, split, x + w, bot); wg.addColorStop(0, '#a05a2a'); wg.addColorStop(1, '#5a2e14'); g.fillStyle = wg; g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(40,16,4,0.35)'; g.lineWidth = Math.max(0.6, S * 0.014);
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, split + (bot - split) * i / 5); g.lineTo(x + w, split + (bot - split) * i / 5 + S * 0.01); g.stroke(); }
    g.restore();
    // lid (domed)
    g.beginPath(); g.moveTo(x, split); g.lineTo(x, lidT + S * 0.12); g.quadraticCurveTo(x, lidT - S * 0.03, S / 2, lidT - S * 0.03); g.quadraticCurveTo(x + w, lidT - S * 0.03, x + w, lidT + S * 0.12); g.lineTo(x + w, split); g.closePath();
    const lg = g.createLinearGradient(x, lidT, x + w, split); lg.addColorStop(0, '#c07a3c'); lg.addColorStop(1, '#7a4220'); g.fillStyle = lg; g.fill();
    g.strokeStyle = 'rgba(255,230,190,0.5)'; g.lineWidth = Math.max(0.8, S * 0.022); g.beginPath(); g.moveTo(x + 2, lidT + S * 0.1); g.quadraticCurveTo(S / 2, lidT - S * 0.02, x + w * 0.6, lidT + S * 0.0); g.stroke();
    // brass: bands, seam, corners
    const brass = g.createLinearGradient(0, lidT, 0, bot); brass.addColorStop(0, '#ffe08a'); brass.addColorStop(0.5, '#d9a23a'); brass.addColorStop(1, '#8a5a14');
    g.fillStyle = brass;
    g.fillRect(x - S * 0.01, split - S * 0.035, w + S * 0.02, S * 0.07); // seam band
    for (const bx of [x + w * 0.18, x + w * 0.82 - S * 0.07]) g.fillRect(bx, lidT - S * 0.01, S * 0.07, bot - lidT + S * 0.01); // vertical bands
    for (const cx of [x, x + w - S * 0.09]) g.fillRect(cx, bot - S * 0.09, S * 0.09, S * 0.09);
    g.fillStyle = 'rgba(255,255,255,0.55)'; for (const bx of [x + w * 0.18, x + w * 0.82 - S * 0.07]) g.fillRect(bx, lidT + S * 0.02, S * 0.015, bot - lidT - S * 0.06);
    // rivets
    g.fillStyle = '#fff1b8'; for (const [rx, ry] of [[x + w * 0.18 + S * 0.035, lidT + S * 0.1], [x + w * 0.82 - S * 0.035, lidT + S * 0.1], [x + w * 0.18 + S * 0.035, bot - S * 0.12], [x + w * 0.82 - S * 0.035, bot - S * 0.12]]) { g.beginPath(); g.arc(rx, ry, S * 0.014, 0, TAU); g.fill(); }
    // lock plate + glowing keyhole
    g.fillStyle = brass; roundRectPath(g, S * 0.43, split - S * 0.06, S * 0.14, S * 0.2, S * 0.025); g.fill();
    softGlow(g, S * 0.5, split + S * 0.03, S * 0.2, [255, 214, 120], 0.9);
    g.fillStyle = 'rgb(255,248,214)'; g.beginPath(); g.arc(S * 0.5, split + S * 0.02, S * 0.028, 0, TAU); g.fill(); g.fillRect(S * 0.485, split + S * 0.02, S * 0.03, S * 0.07);
    g.strokeStyle = 'rgba(30,12,2,0.8)'; g.lineWidth = Math.max(1, S * 0.03); g.lineJoin = 'round'; // dark outline
    g.beginPath(); g.moveTo(x, split); g.lineTo(x, lidT + S * 0.12); g.quadraticCurveTo(x, lidT - S * 0.03, S / 2, lidT - S * 0.03); g.quadraticCurveTo(x + w, lidT - S * 0.03, x + w, lidT + S * 0.12); g.lineTo(x + w, bot); g.lineTo(x, bot); g.closePath(); g.stroke();
  } catch (e) { /* keep partial sprite */ }
}
