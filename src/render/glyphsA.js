// Part glyphs, set A (collectors, processors). Unit space: -1..1, glyph lives in about -0.62..0.62.
// k = { metal, light, dark, accent }. All shapes are drawn with paths.
const TAU = Math.PI * 2;
function stroke(g, w, style) { g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = style; g.stroke(); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
function star4(g, x, y, r) {
  g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.closePath();
}
export { stroke, circle, star4, TAU };

export const glyphsA = {
  hook(g, k) { // brass hook with an eye
    g.beginPath(); g.moveTo(0, -0.42); g.lineTo(0, 0.18); g.arc(-0.24, 0.18, 0.24, 0, Math.PI * 0.95); g.lineTo(-0.5, -0.02);
    stroke(g, 0.17, k.metal);
    circle(g, 0, -0.52, 0.12); stroke(g, 0.08, k.metal);
    g.beginPath(); g.moveTo(-0.52, -0.02); g.lineTo(-0.62, -0.14); g.lineTo(-0.4, -0.12); g.closePath(); g.fillStyle = k.light; g.fill();
  },
  magnet(g, k) { // horseshoe with silver tips
    g.beginPath(); g.moveTo(-0.4, 0.4); g.lineTo(-0.4, 0); g.arc(0, 0, 0.4, Math.PI, 0); g.lineTo(0.4, 0.4);
    stroke(g, 0.3, k.accent);
    g.beginPath(); g.moveTo(-0.4, 0.4); g.lineTo(-0.4, 0); g.arc(0, 0, 0.4, Math.PI, 0); g.lineTo(0.4, 0.4);
    stroke(g, 0.08, 'rgba(255,255,255,0.35)');
    g.fillStyle = '#e6ecf8'; g.fillRect(-0.55, 0.3, 0.3, 0.22); g.fillRect(0.25, 0.3, 0.3, 0.22);
  },
  net(g, k) { // mesh inside a ring
    g.save(); circle(g, 0, 0, 0.55); g.clip();
    g.beginPath();
    for (let i = -4; i <= 4; i++) { g.moveTo(i * 0.28 - 1, -1); g.lineTo(i * 0.28 + 1, 1); g.moveTo(i * 0.28 + 1, -1); g.lineTo(i * 0.28 - 1, 1); }
    stroke(g, 0.06, k.light); g.restore();
    circle(g, 0, 0, 0.55); stroke(g, 0.12, k.metal);
  },
  vacuum(g, k) { // funnel with suction lines
    g.beginPath(); g.moveTo(-0.55, -0.45); g.lineTo(0.55, -0.45); g.lineTo(0.16, 0.12); g.lineTo(0.16, 0.55); g.lineTo(-0.16, 0.55); g.lineTo(-0.16, 0.12); g.closePath();
    g.fillStyle = k.metal; g.fill(); stroke(g, 0.05, k.dark);
    g.beginPath(); g.moveTo(-0.38, -0.3); g.lineTo(0.38, -0.3); stroke(g, 0.06, 'rgba(255,255,255,0.5)');
    g.beginPath(); g.moveTo(-0.2, -0.75); g.lineTo(-0.2, -0.58); g.moveTo(0.2, -0.75); g.lineTo(0.2, -0.58); g.moveTo(0, -0.8); g.lineTo(0, -0.62); stroke(g, 0.06, k.accent);
  },
  polisher(g, k) { // cloth with sparkles
    g.beginPath(); g.moveTo(-0.55, 0.15); g.quadraticCurveTo(-0.3, -0.1, 0, 0.1); g.quadraticCurveTo(0.3, 0.3, 0.55, 0.05);
    g.lineTo(0.5, 0.5); g.quadraticCurveTo(0.25, 0.68, 0, 0.5); g.quadraticCurveTo(-0.3, 0.32, -0.5, 0.55); g.closePath();
    g.fillStyle = k.metal; g.fill(); stroke(g, 0.04, k.dark);
    g.fillStyle = '#fff'; star4(g, 0.1, -0.35, 0.36); g.fill(); star4(g, -0.42, -0.2, 0.18); g.fill(); star4(g, 0.5, -0.1, 0.14); g.fill();
  },
  multiplier(g, k) { // bold x
    g.beginPath(); g.moveTo(-0.45, -0.45); g.lineTo(0.45, 0.45); g.moveTo(0.45, -0.45); g.lineTo(-0.45, 0.45);
    stroke(g, 0.3, k.dark); g.beginPath(); g.moveTo(-0.45, -0.45); g.lineTo(0.45, 0.45); g.moveTo(0.45, -0.45); g.lineTo(-0.45, 0.45);
    stroke(g, 0.2, k.metal);
  },
  smelter(g, k) { // crucible with flame
    g.beginPath(); g.moveTo(-0.5, 0); g.lineTo(0.5, 0); g.quadraticCurveTo(0.5, 0.55, 0, 0.58); g.quadraticCurveTo(-0.5, 0.55, -0.5, 0); g.closePath();
    g.fillStyle = k.metal; g.fill(); stroke(g, 0.05, k.dark);
    g.beginPath(); g.ellipse(0, 0, 0.5, 0.1, 0, 0, TAU); g.fillStyle = '#ffb454'; g.fill();
    g.beginPath(); g.moveTo(0, -0.62); g.quadraticCurveTo(0.35, -0.3, 0.2, -0.05); g.quadraticCurveTo(0, 0.05, -0.2, -0.05); g.quadraticCurveTo(-0.3, -0.3, 0, -0.62);
    g.fillStyle = '#ff7a45'; g.fill();
    g.beginPath(); g.moveTo(0, -0.34); g.quadraticCurveTo(0.14, -0.18, 0.06, -0.06); g.quadraticCurveTo(-0.1, -0.06, 0, -0.34); g.fillStyle = '#ffe3a1'; g.fill();
  },
  splitter(g, k) { // forked arrow
    g.beginPath(); g.moveTo(0, 0.6); g.lineTo(0, 0.05); g.moveTo(0, 0.05); g.lineTo(-0.4, -0.35); g.moveTo(0, 0.05); g.lineTo(0.4, -0.35);
    stroke(g, 0.16, k.metal);
    g.fillStyle = k.light;
    g.beginPath(); g.moveTo(-0.58, -0.58); g.lineTo(-0.58, -0.2); g.lineTo(-0.2, -0.58); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0.58, -0.58); g.lineTo(0.58, -0.2); g.lineTo(0.2, -0.58); g.closePath(); g.fill();
  },
  amplifier(g, k) { // wave bars
    const hs = [0.25, 0.5, 0.8, 0.5, 0.3];
    for (let i = 0; i < 5; i++) {
      const x = -0.48 + i * 0.24, h = hs[i];
      g.beginPath(); g.roundRect ? g.roundRect(x - 0.07, -h * 0.6, 0.14, h * 1.2, 0.07) : g.rect(x - 0.07, -h * 0.6, 0.14, h * 1.2);
      g.fillStyle = i === 2 ? k.light : k.metal; g.fill();
    }
  },
  gilder(g, k) { // gold coin
    circle(g, 0, 0, 0.55); g.fillStyle = k.metal; g.fill(); stroke(g, 0.07, k.dark);
    circle(g, 0, 0, 0.38); stroke(g, 0.05, k.light);
    g.fillStyle = k.light; star4(g, 0, 0, 0.3); g.fill();
    g.beginPath(); g.arc(0, 0, 0.55, Math.PI * 1.1, Math.PI * 1.5); stroke(g, 0.06, 'rgba(255,255,255,0.7)');
  },
  prism(g, k) { // glass triangle splitting light
    const cols = ['#ff5470', '#ffb454', '#ffe36a', '#46e3a3', '#7fd6ff', '#b583ff'];
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0.14, 0.02 + (i - 2.5) * 0.02); g.lineTo(0.7, -0.32 + i * 0.13); stroke(g, 0.07, cols[i]); }
    g.beginPath(); g.moveTo(0, -0.55); g.lineTo(0.42, 0.4); g.lineTo(-0.42, 0.4); g.closePath();
    g.fillStyle = 'rgba(220,235,255,0.55)'; g.fill(); stroke(g, 0.07, '#f2f6ff');
    g.beginPath(); g.moveTo(-0.62, 0.1); g.lineTo(-0.15, 0.12); stroke(g, 0.07, '#fff');
  },
};
