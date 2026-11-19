// The shared "danger" look: every hazard gets the same red-orange rim so it reads as a threat at a glance.
// Gems never use this colour, so a hazard can never be mistaken for a gem.
import { softGlow } from './shapes.js';

export const RIM = [255, 92, 60];
export const RIM_HOT = [255, 170, 110];

// Soft red-orange glow behind a hazard, centred in a sprite of size S.
export function dangerGlow(g, S, strength = 1) { softGlow(g, S * 0.5, S * 0.5, S * 0.5, RIM, 0.3 * strength); }

// Strokes the current outline (trace(g) must make the path) with a glowing red-orange rim.
export function rimStroke(g, S, trace) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  const w = Math.max(1.4, S * 0.05);
  trace(g); g.lineWidth = w * 3; g.strokeStyle = 'rgba(255,92,60,0.14)'; g.stroke();
  trace(g); g.lineWidth = w * 1.7; g.strokeStyle = 'rgba(255,92,60,0.4)'; g.stroke();
  trace(g); g.lineWidth = w; g.strokeStyle = 'rgb(255,96,62)'; g.stroke();
  trace(g); g.lineWidth = Math.max(0.6, w * 0.35); g.strokeStyle = 'rgba(255,190,140,0.85)'; g.stroke();
  g.restore();
}
