// cinematics/dropStart.js: Home to the well. Camera pushes into the mouth, the rope pays out, the bucket falls into
// darkness, then 3-2-1 while the rig lights up part by part. Full version 1500 ms, quick version 500 ms.
// onGo (start the run) runs exactly once: at the end, on skip, or at once with Reduce motion.
import { once, ease, seg, glow, rgba, bucketGlyph, TOKENS } from './common.js';

export const FULL_MS = 1500, QUICK_MS = 500, FULL_DROPS = 3;
let started = 0;
export function nextVariant() { started++; return started <= FULL_DROPS ? 'full' : 'quick'; }
export function _resetDropCount() { started = 0; }

export function makeDropStart(layer, opts) {
  const o = opts || {};
  const quick = o.variant === 'quick';
  const parts = Math.max(0, Math.min(12, (o.parts | 0) || 5));
  const go = once(o.onGo);
  const cue = typeof o.cue === 'function' ? o.cue : () => {};
  const cued = {};
  const fire = (k) => { if (!cued[k]) { cued[k] = 1; cue(k); } };
  return {
    id: 'dropStart', durationMs: quick ? QUICK_MS : FULL_MS,
    update(t, p) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2, my = h * 0.3;
      // 1. push in: a darkening ring closes on the well mouth
      const push = seg(p, 0, 0.25);
      ctx.fillStyle = 'rgba(2,1,8,' + (0.15 + 0.5 * push) + ')'; ctx.fillRect(0, 0, w, h);
      glow(ctx, cx, my, w * (0.9 - 0.35 * push), TOKENS.goldSoft, 0.12 * push);
      ctx.strokeStyle = rgba(TOKENS.goldSoft, 0.35 * push); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, my, w * 0.3, w * 0.09, 0, 0, 6.2832); ctx.stroke();
      // 2. rope pays out over the edge
      const pay = seg(p, 0.1, 0.3);
      if (pay > 0) { ctx.strokeStyle = rgba(TOKENS.goldSoft, 0.8 * (1 - 0.8 * seg(p, 0.72, 0.12))); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.quadraticCurveTo(cx + 6, my * pay * 0.5, cx, my + (h * 0.7) * pay); ctx.stroke(); fire('rope'); }
      // 3. bucket slides over the edge and falls (ease-in), fading into the dark
      const fall = seg(p, 0.3, 0.45, ease.in), slide = seg(p, 0.3, 0.15);
      if (fall > 0 || slide > 0) { const by = my - 30 + fall * h * 0.8; ctx.globalAlpha = 1 - 0.85 * fall; bucketGlyph(ctx, cx - (1 - slide) * 40, by, 38, 1 - fall); ctx.globalAlpha = 1; fire('fall'); }
      if (quick) { glow(ctx, cx, my, w * 0.6, TOKENS.gold, 0.25 * seg(p, 0.75, 0.25)); return; }
      // 4. 3-2-1 beat, rig lamps light part by part
      const beat = (p - 0.6) / 0.4; // 0..1 across the last 600 ms
      if (beat > 0) {
        const n = Math.min(2, Math.floor(beat * 3)), local = beat * 3 - n, num = 3 - n;
        const a = (1 - seg(local, 0.6, 0.4)) * seg(local, 0, 0.25), sc = 1.12 - 0.12 * ease.out(Math.min(1, local * 3));
        ctx.save(); ctx.translate(cx, h * 0.42); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.fillStyle = TOKENS.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 64px system-ui,sans-serif'; ctx.fillText(String(num), 0, 0); ctx.restore(); ctx.globalAlpha = 1;
        fire('beat' + n);
        const lit = Math.floor(seg(beat, 0, 0.9) * parts + 0.0001);
        for (let i = 0; i < parts; i++) { const lx = cx + (i - (parts - 1) / 2) * 22, ly = h * 0.55; ctx.fillStyle = i < lit ? TOKENS.gold : 'rgba(141,151,184,0.35)'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.2832); ctx.fill(); if (i < lit) glow(ctx, lx, ly, 18, TOKENS.gold, 0.3); }
      }
      // last 8 percent: curtain lifts so the first beat of the run is clean
      ctx.fillStyle = 'rgba(2,1,8,' + (0.6 * (1 - seg(p, 0.92, 0.08))) + ')'; if (p > 0.92) { ctx.clearRect(0, 0, w, h); ctx.fillRect(0, 0, w, h); }
    },
    finish() { layer.clear(); go(); },
  };
}
