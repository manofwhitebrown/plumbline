// Draws one small crew member with plain canvas shapes. Feet at (x, y), faces +x (flipped by `face`).
// No allocation per call: every colour string is precomputed in crewLooks.js or constant here.
import { LOOKS } from './crewLooks.js';
const TAU = 6.2832, ARM = 19;
function limb(g, x1, y1, x2, y2, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function dot(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }

function headgear(g, lk, hy, back) {
  switch (lk.hair) {
    case 'long': if (back) { g.fillStyle = lk.hairC; g.beginPath(); g.ellipse(-2.4, hy + 3, 5.2, 8, 0, 0, TAU); g.fill(); } else { g.fillStyle = lk.hairC; g.beginPath(); g.arc(0, hy - 0.6, 5.5, 3.3, 6.1); g.closePath(); g.fill(); } break;
    case 'hood': if (back) { dot(g, -0.4, hy + 0.4, 6.4, lk.shirtD); } else { g.strokeStyle = lk.shirtL; g.lineWidth = 1.5; g.beginPath(); g.arc(0.4, hy + 0.2, 5.7, 3.4, 6.0); g.stroke(); } break;
    case 'hat': if (!back) { g.fillStyle = lk.cap; g.beginPath(); g.ellipse(0.6, hy - 2.8, 9, 2.1, 0, 0, TAU); g.fill(); g.fillStyle = lk.capD; g.fillRect(-4, hy - 8.4, 8.6, 6); g.fillStyle = lk.shirtL; g.fillRect(-4, hy - 4.2, 8.6, 1.3); } break;
    case 'cap': if (!back) { g.fillStyle = lk.cap; g.beginPath(); g.arc(0, hy - 1.2, 5.6, 3.14, 6.28); g.closePath(); g.fill(); g.fillRect(1, hy - 2, 7, 1.7); g.fillStyle = lk.capD; g.fillRect(-5.4, hy - 1.6, 4, 1.6); } break;
    case 'helmet': if (!back) { g.fillStyle = lk.cap; g.beginPath(); g.arc(0, hy - 0.8, 6, 3.14, 6.28); g.closePath(); g.fill(); g.fillStyle = lk.capD; g.fillRect(-6.2, hy - 1, 12.4, 1.8); g.fillStyle = 'rgba(255,240,170,0.35)'; g.beginPath(); g.arc(4.7, hy - 3.2, 4.4, 0, TAU); g.fill(); dot(g, 4.7, hy - 3.2, 2, '#fff1b8'); } break;
    case 'bandana': if (!back) { g.fillStyle = lk.hairC; g.beginPath(); g.arc(0, hy - 0.8, 5.5, 3.14, 6.28); g.closePath(); g.fill(); g.fillStyle = lk.cap; g.fillRect(-5.4, hy - 3, 10.8, 2.2); g.beginPath(); g.moveTo(-5.2, hy - 2); g.lineTo(-9, hy - 0.5); g.lineTo(-8, hy - 3.6); g.closePath(); g.fill(); } break;
    default: if (!back) { g.fillStyle = lk.hairC; g.beginPath(); g.arc(0, hy - 0.6, 5.6, 3.0, 6.3); g.closePath(); g.fill(); g.fillRect(-5.4, hy - 1, 3, 4); }
  }
}

// wx, wy: world point the hands reach for (crank). face: +1 or -1. lit: +1 if the lantern is on the facing side, else -1.
export function drawCrewMember(g, x, y, s, lk, t, ph, lit, face, wx, wy) {
  const sc = s * lk.h, br = Math.sin(t * 1.7 + ph) * 0.55, sw = Math.sin(t * 0.8 + ph * 1.3) * 0.022, hy = -41 + br;
  g.save(); g.translate(x, y); g.scale(face * sc, sc); g.lineCap = 'round';
  g.fillStyle = 'rgba(4,3,10,0.4)'; g.beginPath(); g.ellipse(-lit * 4, 0.6, 12.5, 2.9, 0, 0, TAU); g.fill(); // soft ground shadow, cast away from the lantern
  if (lk.prop === 'crank') { g.fillStyle = '#5a3a22'; g.fillRect(-9, -3, 18, 3); } // not used for ground, kept tiny
  g.rotate(sw);
  const sh = lit > 0 ? -1 : 1; // side that is in shade (local x sign)
  // back arm and back leg (in shade)
  limb(g, -4.6, -33 + br, -6, -23, 3.5, lk.shirtD); dot(g, -6, -21.6, 1.9, lk.skinD);
  limb(g, -2.8, -19, -3, -5, 4.6, lk.pantsD); g.fillStyle = lk.boot; g.beginPath(); g.ellipse(-2, -2.4, 4.4, 2.6, 0, 0, TAU); g.fill();
  if (lk.prop === 'sack') { dot(g, -6, -35, 7.2, '#9a7a4a'); dot(g, -8, -37, 3, '#b8955a'); g.fillStyle = '#5a4026'; g.fillRect(-7, -43.4, 3.4, 2); }
  headgear(g, lk, hy, true);
  // front leg + boot
  limb(g, 3, -19, 3.2, -5, 4.8, lk.pants); g.fillStyle = lk.boot; g.beginPath(); g.ellipse(4, -2.4, 4.8, 2.7, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,196,120,0.28)'; g.fillRect(lit > 0 ? 5 : 0.8, -9, 1, 4);
  // torso with a shaded half, belt and a lit edge
  g.fillStyle = lk.shirt; g.beginPath(); g.moveTo(-6, -34 + br * 0.5); g.quadraticCurveTo(0, -37.5 + br, 6, -34 + br * 0.5); g.lineTo(5.2, -19); g.lineTo(-5.2, -19); g.closePath(); g.fill();
  g.fillStyle = 'rgba(8,6,16,0.3)'; g.beginPath(); g.moveTo(0, -36); g.lineTo(sh * 6.2, -34); g.lineTo(sh * 5.2, -19); g.lineTo(0, -19); g.closePath(); g.fill();
  g.fillStyle = '#2a1a10'; g.fillRect(-5.3, -21.4, 10.6, 1.8); dot(g, 0, -20.5, 1, '#d9b26a');
  if (lk.prop === 'lamp') { g.fillStyle = lk.shirtD; g.fillRect(-1, -34, 2, 14); g.fillStyle = '#6b4a2a'; g.fillRect(-4.6, -27, 3.2, 3.4); }
  if (lk.prop === 'rope') { g.strokeStyle = '#d2b06a'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(-0.6, -29, 6, 3.2, 0.9, 0, TAU); g.stroke(); }
  g.strokeStyle = 'rgba(255,200,130,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(lit * 5.8, -33.5); g.lineTo(lit * 5, -19.5); g.stroke();
  // head
  dot(g, 0, hy, 5.1, lk.skin); g.fillStyle = lk.skinD; g.beginPath(); g.arc(0, hy, 5.1, lit > 0 ? 1.6 : -1.5, lit > 0 ? 4.7 : 1.6, lit < 0); g.fill(); g.fillStyle = lk.skin; g.fillRect(-1.6, hy + 3.6, 3.2, 3);
  dot(g, 2.3, hy + 0.5, 0.75, '#1a1210'); g.fillStyle = 'rgba(210,120,100,0.35)'; g.fillRect(1.2, hy + 2.2, 2, 0.9);
  headgear(g, lk, hy, false);
  g.strokeStyle = 'rgba(255,205,140,0.65)'; g.lineWidth = 1; g.beginPath(); if (lit > 0) g.arc(0, hy, 5.3, -1.1, 0.9); else g.arc(0, hy, 5.3, 2.3, 4.3); g.stroke();
  // front arm and what it holds
  const sx = 4.8, sy = -33 + br;
  if (lk.prop === 'crank') {
    let dx = (wx - x) * face / sc - sx, dy = (wy - y) / sc - sy; const d = Math.sqrt(dx * dx + dy * dy) || 1, k = d > ARM ? ARM / d : 1;
    const hx = sx + dx * k, hyy = sy + dy * k;
    limb(g, sx, sy, (sx + hx) / 2 + 0.6, (sy + hyy) / 2 + 2.2, 3.7, lk.shirtL); limb(g, (sx + hx) / 2 + 0.6, (sy + hyy) / 2 + 2.2, hx, hyy, 3.4, lk.shirtL); dot(g, hx, hyy, 2, lk.skin);
  } else if (lk.prop === 'wave') {
    const wv = Math.sin(t * 4.2 + ph) * 3; limb(g, sx, sy, 9.4, -39, 3.7, lk.shirtL); limb(g, 9.4, -39, 11 + wv, -48, 3.4, lk.shirtL); dot(g, 11.4 + wv, -49.4, 2, lk.skin);
  } else if (lk.prop === 'pick') {
    limb(g, 9.5, -17, 13, -49, 1.8, '#7a5230'); g.strokeStyle = '#aeb6c0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(5.8, -46); g.quadraticCurveTo(13, -53, 20.5, -45.4); g.stroke(); g.strokeStyle = 'rgba(255,230,190,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(7, -47); g.quadraticCurveTo(13, -52.6, 19, -46.2); g.stroke();
    limb(g, sx, sy, 9, -25, 3.7, lk.shirtL); dot(g, 9.4, -24.4, 2, lk.skin);
  } else if (lk.prop === 'rope') {
    g.strokeStyle = '#d2b06a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(10.5, -25); g.quadraticCurveTo(20, -14, 27, -1.4); g.stroke(); g.strokeStyle = '#8a6a34'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(10.5, -24.4); g.quadraticCurveTo(20, -13.4, 27, -0.8); g.stroke();
    limb(g, sx, sy, 9, -26, 3.7, lk.shirtL); dot(g, 10, -25.4, 2, lk.skin); limb(g, -3, -33 + br, 5.5, -22, 3.3, lk.shirtD); dot(g, 6, -21.6, 1.8, lk.skin);
  } else if (lk.prop === 'sack') {
    limb(g, sx, sy, 3, -40, 3.6, lk.shirtL); dot(g, 1.6, -42.4, 1.9, lk.skin);
  } else { limb(g, sx, sy, 6.2, -23.5, 3.7, lk.shirtL); dot(g, 6.2, -21.8, 1.9, lk.skin); }
  g.restore();
}
export function drawCrew(g, x, y, s, sway) { drawCrewMember(g, x, y, s, LOOKS[0], sway, 0, 1, 1, x, y); } // old name, kept for callers
