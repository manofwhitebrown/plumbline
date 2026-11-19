// All six gem models by tier. paint(g, S, frame) draws into 0..S; outline(g, S) traces the silhouette.
import { GEMS_A } from './gemModelsA.js';
import { GEMS_B } from './gemModelsB.js';
export const GEMS = { ...GEMS_A, ...GEMS_B };
export function gemFrames(tier) { const m = GEMS[tier]; return m ? m.frames : 1; }
export function paintGemModel(g, S, tier, frame = 0) {
  const m = GEMS[Math.max(1, Math.min(6, tier | 0 || 1))];
  try { m.paint(g, S, frame); } catch (e) { /* keep partial sprite */ }
}
// Glint: a bright diagonal band at position k (0..1) across the gem, clipped to its outline.
export function paintGlint(g, S, tier, k) {
  const m = GEMS[Math.max(1, Math.min(6, tier | 0 || 1))];
  try {
    g.save(); m.outline(g, S); g.clip();
    const c = -0.3 + k * 1.6, gr = g.createLinearGradient(S * (c - 0.12), S * (c - 0.12), S * (c + 0.12), S * (c + 0.12));
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S); g.restore();
  } catch (e) { /* ignore */ }
}
