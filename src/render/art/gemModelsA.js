// Gem tiers 1-3. Each has paint(g, S, frame), outline(g, S) (for the glint mask) and frames.
// T1 quartz = hexagonal crystal, T2 emerald = step-cut rectangle, T3 amber = rounded teardrop with an inclusion.
import { TIER_COLORS } from '../palette.js';
import { gemPal, facet, ringFacets, ngon, underGlow, edgeAndRim, specular, tracePoly, TAU } from './gemFacets.js';
import { rgbToCss, lighten, darken } from './color.js';

const P1r = gemPal(TIER_COLORS[1]), P1 = { ...P1r, light: [196, 212, 255] }, P2 = gemPal(TIER_COLORS[2]), P3 = gemPal(TIER_COLORS[3]);

// --- Tier 1: hexagon, pointy top, six outer facets + a bright table, with a hex crystal point.
const hexOuter = (S) => ngon(S / 2, S / 2, S * 0.36, S * 0.4, 6, -Math.PI / 2);
const t1 = {
  frames: 1,
  outline: (g, S) => tracePoly(g, hexOuter(S)),
  paint(g, S) {
    underGlow(g, S, P1);
    const A = hexOuter(S), B = ngon(S / 2, S / 2, S * 0.17, S * 0.19, 6, -Math.PI / 2);
    ringFacets(g, A, B, S / 2, S / 2, P1, 0, 0.18);
    facet(g, B, 0.8, P1, 0.14); // table
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(0.6, S * 0.018); // faint crystal lines
    g.beginPath(); g.moveTo(B[0], B[1]); g.lineTo(S / 2, S / 2); g.lineTo(B[6], B[7]); g.moveTo(S / 2, S / 2); g.lineTo(B[2], B[3]); g.stroke(); g.restore();
    edgeAndRim(g, S, P1, (c) => tracePoly(c, A));
    specular(g, S * 0.4, S * 0.3, S * 0.035);
  },
};

// --- Tier 2: step-cut. Three nested cut-corner rectangles (like an emerald) with a dark deep table.
const rectCut = (S, inset, cut) => {
  const x0 = S * (0.16 + inset), x1 = S * (0.84 - inset), y0 = S * (0.1 + inset * 1.15), y1 = S * (0.9 - inset * 1.15), c = S * cut;
  return [x0 + c, y0, x1 - c, y0, x1, y0 + c, x1, y1 - c, x1 - c, y1, x0 + c, y1, x0, y1 - c, x0, y0 + c];
};
const t2 = {
  frames: 1,
  outline: (g, S) => tracePoly(g, rectCut(S, 0, 0.14)),
  paint(g, S) {
    underGlow(g, S, P2);
    const A = rectCut(S, 0, 0.14), B = rectCut(S, 0.09, 0.1), C = rectCut(S, 0.19, 0.06);
    ringFacets(g, A, B, S / 2, S / 2, P2, 0, 0.16);
    ringFacets(g, B, C, S / 2, S / 2, P2, 0.1, 0.14);
    facet(g, C, 0.55, P2, 0.3); // table: deep green with a gradient
    g.save(); g.fillStyle = 'rgba(255,255,255,0.28)'; // a window reflection on the table
    tracePoly(g, [S * 0.37, S * 0.34, S * 0.47, S * 0.34, S * 0.4, S * 0.52, S * 0.33, S * 0.52]); g.fill(); g.restore();
    edgeAndRim(g, S, P2, (c) => tracePoly(c, A));
    specular(g, S * 0.3, S * 0.2, S * 0.03);
  },
};

// --- Tier 3: teardrop cabochon with 5 soft lobes and a dark fossil inclusion.
function dropPath(g, S) {
  g.beginPath(); g.moveTo(S * 0.5, S * 0.08);
  g.bezierCurveTo(S * 0.58, S * 0.2, S * 0.82, S * 0.4, S * 0.82, S * 0.62);
  g.bezierCurveTo(S * 0.82, S * 0.8, S * 0.66, S * 0.92, S * 0.5, S * 0.92);
  g.bezierCurveTo(S * 0.34, S * 0.92, S * 0.18, S * 0.8, S * 0.18, S * 0.62);
  g.bezierCurveTo(S * 0.18, S * 0.4, S * 0.42, S * 0.2, S * 0.5, S * 0.08);
  g.closePath();
}
const t3 = {
  frames: 1,
  outline: dropPath,
  paint(g, S) {
    underGlow(g, S, P3);
    g.save(); dropPath(g, S); g.clip();
    const gr = g.createRadialGradient(S * 0.4, S * 0.42, S * 0.04, S * 0.5, S * 0.58, S * 0.46);
    gr.addColorStop(0, rgbToCss(lighten(P3.light, 0.35))); gr.addColorStop(0.35, rgbToCss(P3.base)); gr.addColorStop(1, rgbToCss(darken(P3.dark, 0.25)));
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    const lobes = [[0.2, 0.75, 0.5, 0.2, 0.34, 0.9, 'rgba(255,240,200,0.16)'], [0.5, 0.2, 0.8, 0.75, 0.66, 0.9, 'rgba(60,20,0,0.22)'], [0.5, 0.2, 0.5, 0.92, 0.34, 0.92, 'rgba(255,255,255,0.07)']];
    for (const l of lobes) { g.fillStyle = l[6]; tracePoly(g, [l[0] * S, l[1] * S, l[2] * S, l[3] * S, l[4] * S, l[5] * S]); g.fill(); }
    g.fillStyle = 'rgba(70,28,4,0.78)'; g.beginPath(); g.ellipse(S * 0.56, S * 0.62, S * 0.12, S * 0.045, -0.7, 0, TAU); g.fill(); // inclusion
    g.strokeStyle = 'rgba(70,28,4,0.7)'; g.lineWidth = Math.max(0.6, S * 0.016);
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(S * (0.55 + i * 0.045), S * (0.62 - i * 0.04)); g.lineTo(S * (0.5 + i * 0.05), S * (0.7 - i * 0.03)); g.stroke(); }
    const hi = g.createRadialGradient(S * 0.5, S * 0.8, 0, S * 0.5, S * 0.8, S * 0.22); // light bounced inside
    hi.addColorStop(0, 'rgba(255,214,130,0.5)'); hi.addColorStop(1, 'rgba(255,214,130,0)'); g.fillStyle = hi; g.fillRect(0, 0, S, S);
    g.restore();
    edgeAndRim(g, S, P3, (c) => dropPath(c, S));
    g.save(); g.fillStyle = 'rgba(255,250,235,0.85)'; g.translate(S * 0.36, S * 0.42); g.rotate(-0.6);
    g.beginPath(); g.ellipse(0, 0, S * 0.07, S * 0.028, 0, 0, TAU); g.fill(); g.restore();
    specular(g, S * 0.3, S * 0.55, S * 0.022, 0.8);
  },
};
export const GEMS_A = { 1: t1, 2: t2, 3: t3 };
