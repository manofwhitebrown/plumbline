// Gem tiers 4-6. T4 ruby = classic brilliant (kite facets), T5 void = dark angular shard with a swirling core,
// T6 prism = triangular prism turning a white beam into a rainbow (animated).
import { TIER_COLORS } from '../palette.js';
import { gemPal, facet, ngon, underGlow, edgeAndRim, specular, tracePoly, TAU } from './gemFacets.js';
import { facetLight, softGlow } from './shapes.js';
import { rgbToCss, lighten, darken, hslToRgb } from './color.js';

const P5 = gemPal(TIER_COLORS[5]);
// Ruby: keep the facets deep red (the stock light colour is a pale pink that washes the stone out).
const P4r = gemPal(TIER_COLORS[4]);
const P4 = { base: P4r.base, dark: darken(P4r.dark, 0.25), light: [255, 120, 136] };

// --- Tier 4: brilliant seen from above. 8 kite facets + table (+ small star triangles between kites).
const girdle = (S) => ngon(S / 2, S / 2, S * 0.4, S * 0.4, 16, -Math.PI / 2); // 16 points; even = kite tips
const t4 = {
  frames: 1,
  outline: (g, S) => tracePoly(g, girdle(S)),
  paint(g, S) {
    underGlow(g, S, P4);
    const G = girdle(S), cx = S / 2, cy = S / 2, T = ngon(cx, cy, S * 0.2, S * 0.2, 8, -Math.PI / 2);
    g.fillStyle = rgbToCss(P4.dark); tracePoly(g, G); g.fill();
    for (let i = 0; i < 8; i++) { // star triangles (subtle ring)
      const a = T[i * 2], b = T[i * 2 + 1], c = T[((i + 1) % 8) * 2], d = T[((i + 1) % 8) * 2 + 1], h = G[(i * 2 + 1) * 2], k = G[(i * 2 + 1) * 2 + 1];
      facet(g, [a, b, h, k, c, d], 0.45 + 0.3 * facetLight(-Math.PI / 2 + (i + 0.5) * TAU / 8 + Math.PI), P4, 0.1);
    }
    for (let i = 0; i < 8; i++) { // kites: table corner -> side points -> girdle tip
      const tipI = i * 2, hl = (tipI + 15) % 16, hr = (tipI + 1) % 16;
      const a = -Math.PI / 2 + i * TAU / 8;
      const side = (idx) => [cx + (G[idx * 2] - cx) * 0.72, cy + (G[idx * 2 + 1] - cy) * 0.72];
      const L = side(hl), R = side(hr);
      facet(g, [T[i * 2], T[i * 2 + 1], R[0], R[1], G[tipI * 2], G[tipI * 2 + 1], L[0], L[1]], facetLight(a), P4, 0.24);
    }
    facet(g, T, 0.72, P4, 0.2); // table
    g.save(); g.strokeStyle = 'rgba(255,230,235,0.4)'; g.lineWidth = Math.max(0.5, S * 0.014); // facet edges
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(T[i * 2], T[i * 2 + 1]); g.lineTo(G[i * 4], G[i * 4 + 1]); g.stroke(); }
    tracePoly(g, T); g.stroke(); g.restore();
    edgeAndRim(g, S, P4, (c) => tracePoly(c, G));
    specular(g, S * 0.38, S * 0.32, S * 0.035);
  },
};

// --- Tier 5: angular dark shard. Fan of near-black violet facets, glowing core, slow swirl (8 frames).
const shard = (S) => [0.5, 0.07, 0.8, 0.29, 0.88, 0.62, 0.64, 0.92, 0.3, 0.85, 0.12, 0.52, 0.24, 0.22].map((v) => v * S);
const t5 = {
  frames: 8,
  outline: (g, S) => tracePoly(g, shard(S)),
  paint(g, S, frame = 0) {
    underGlow(g, S, P5, 1.2);
    const A = shard(S), cx = S * 0.5, cy = S * 0.5, n = A.length / 2, dk = darken(P5.dark, 0.7), mid = darken(P5.dark, 0.35);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, mx = (A[i * 2] + A[j * 2]) / 2 - cx, my = (A[i * 2 + 1] + A[j * 2 + 1]) / 2 - cy;
      facet(g, [A[i * 2], A[i * 2 + 1], A[j * 2], A[j * 2 + 1], cx, cy], facetLight(Math.atan2(my, mx)) * 0.5, { base: mid, light: P5.dark, dark: dk }, 0.2);
    }
    g.save(); tracePoly(g, A); g.clip();
    g.lineCap = 'round'; const spin = (frame / 8) * TAU;
    for (let arm = 0; arm < 3; arm++) { // swirl arms: a spiral turned by `frame`
      g.beginPath();
      for (let k = 0; k <= 14; k++) { const r = S * (0.03 + 0.3 * (k / 14)), a = spin + arm * TAU / 3 + (k / 14) * 3.2; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.lineWidth = Math.max(1, S * 0.05); g.strokeStyle = rgbToCss(P5.base, 0.28); g.stroke();
      g.lineWidth = Math.max(0.7, S * 0.02); g.strokeStyle = rgbToCss(P5.light, 0.7); g.stroke();
    }
    softGlow(g, cx, cy, S * 0.26, [236, 220, 255], 0.9); // hot core
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(cx, cy, S * 0.04, 0, TAU); g.fill();
    edgeAndRim(g, S, { dark: P5.dark, light: P5.base, base: P5.base }, (c) => tracePoly(c, A));
  },
};

// --- Tier 6: prism. Glass triangle, white beam in from the left, six rainbow bands out to the right.
const tri = (S) => [S * 0.5, S * 0.13, S * 0.8, S * 0.78, S * 0.2, S * 0.78];
const BANDS = [0, 28, 55, 130, 210, 275]; // red, orange, yellow, green, blue, violet hues
const t6 = {
  frames: 8,
  outline: (g, S) => tracePoly(g, tri(S)),
  paint(g, S, frame = 0) {
    const T = tri(S), ph = (frame / 8) * TAU;
    softGlow(g, S * 0.5, S * 0.55, S * 0.5, [200, 210, 255], 0.22);
    const ex = S * 0.64, ey = S * 0.5; // where the colours leave the glass
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { // rainbow fan; the fan breathes with the frame
      const wob = Math.sin(ph + i * 0.7) * S * 0.012, y0 = S * (0.2 + i * 0.1) + wob, y1 = y0 + S * 0.1;
      g.fillStyle = rgbToCss(hslToRgb(BANDS[i], 0.95, 0.58), 0.8 + 0.12 * Math.sin(ph + i));
      g.beginPath(); g.moveTo(ex, ey - 1); g.lineTo(S * 0.98, y0); g.lineTo(S * 0.98, y1); g.lineTo(ex, ey + 1); g.closePath(); g.fill();
    }
    g.restore();
    softGlow(g, S * 0.3, S * 0.6, S * 0.2, [255, 255, 255], 0.5);
    const gl = g.createLinearGradient(0, S * 0.74, S * 0.4, S * 0.55); gl.addColorStop(0, 'rgba(255,255,255,0.1)'); gl.addColorStop(1, 'rgb(255,255,255)');
    g.strokeStyle = gl; g.lineWidth = Math.max(1.6, S * 0.07); g.lineCap = 'round'; g.beginPath(); g.moveTo(S * 0.02, S * 0.76); g.lineTo(S * 0.38, S * 0.56); g.stroke(); // white beam
    const glass = { base: [214, 226, 255], light: [250, 252, 255], dark: [96, 118, 190] };
    facet(g, [T[0], T[1], T[4], T[5], S * 0.5, S * 0.6], 0.8, glass, 0.15);
    facet(g, [T[0], T[1], T[2], T[3], S * 0.5, S * 0.6], 0.35, glass, 0.15);
    facet(g, [T[4], T[5], T[2], T[3], S * 0.5, S * 0.6], 0.55, glass, 0.12);
    g.fillStyle = `rgba(255,255,255,${0.5 + 0.2 * Math.sin(ph)})`; tracePoly(g, [S * 0.5, S * 0.27, S * 0.44, S * 0.5, S * 0.5, S * 0.55]); g.fill();
    edgeAndRim(g, S, { dark: [80, 96, 170], light: [255, 255, 255], base: glass.base }, (c) => tracePoly(c, T));
  },
};
export const GEMS_B = { 4: t4, 5: t5, 6: t6 };
