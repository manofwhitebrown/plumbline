// cinematics/records.js: NEW RECORD (golden shockwave, a depth ribbon that unfurls, glints; a celebration, 1600 ms) and the
// small 50 m MILESTONE marker (700 ms, subtle). Both sit below the HUD top zone and are click-through.
import { ease, seg, glow, rgba, TOKENS } from './common.js';

export const RECORD_MS = 1600, MILESTONE_MS = 700;

export function makeRecord(layer, opts) {
  const o = opts || {};
  const depth = Math.max(0, Math.round(Number(o.depth) || 0));
  const cue = typeof o.cue === 'function' ? o.cue : () => {};
  let burst = false, lastT = 0;
  return {
    id: 'record', durationMs: RECORD_MS,
    update(t, p) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2, cy = h * 0.3;
      const dt = Math.max(0, t - lastT); lastT = t;
      // shockwave: one thin ring plus a soft glow, expanding and fading
      const sw = seg(t, 0, 700, ease.out);
      if (sw < 1) { ctx.strokeStyle = rgba(TOKENS.gold, 0.7 * (1 - sw)); ctx.lineWidth = 3 * (1 - sw) + 0.5; ctx.beginPath(); ctx.arc(cx, cy, 20 + sw * w * 0.7, 0, 6.2832); ctx.stroke(); glow(ctx, cx, cy, 40 + sw * w * 0.5, TOKENS.goldSoft, 0.22 * (1 - sw)); }
      if (!burst) { burst = true; cue('record'); layer.pool.burst(cx, cy + 36, 18, TOKENS.goldSoft, 90, 900, 1.6, 30, 3); }
      layer.pool.update(dt); layer.pool.draw(ctx);
      // ribbon unfurls from the centre, holds, then folds away
      const open = seg(t, 120, 420, ease.out), close = seg(t, 1250, 300, ease.in), k = open * (1 - close);
      if (k > 0.001) {
        const rw = w * 0.74 * k, rh = 34, ry = cy + 30;
        ctx.save(); ctx.globalAlpha = 0.95;
        const g = ctx.createLinearGradient(cx - rw / 2, 0, cx + rw / 2, 0); g.addColorStop(0, '#b8862a'); g.addColorStop(0.5, TOKENS.gold); g.addColorStop(1, '#b8862a');
        ctx.fillStyle = g; ctx.fillRect(cx - rw / 2, ry - rh / 2, rw, rh);
        // notched ends
        ctx.fillStyle = '#8a6420'; ctx.beginPath(); ctx.moveTo(cx - rw / 2, ry - rh / 2); ctx.lineTo(cx - rw / 2 - 12 * k, ry); ctx.lineTo(cx - rw / 2, ry + rh / 2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + rw / 2, ry - rh / 2); ctx.lineTo(cx + rw / 2 + 12 * k, ry); ctx.lineTo(cx + rw / 2, ry + rh / 2); ctx.closePath(); ctx.fill();
        if (k > 0.85) { ctx.fillStyle = '#1b1410'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 15px system-ui,sans-serif'; ctx.fillText('NEW RECORD  ' + depth + ' m', cx, ry + 1); }
        // glint sweeping across the ribbon
        const gl = seg(t, 520, 500); if (gl > 0 && gl < 1) { const gx = cx - rw / 2 + rw * gl; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(gx - 6, ry - rh / 2, 12, rh); }
        ctx.restore();
      }
    },
    finish() { layer.clear(); },
  };
}

export function makeMilestone(layer, opts) {
  const o = opts || {};
  const depth = Math.max(0, Math.round(Number(o.depth) || 0));
  const cue = typeof o.cue === 'function' ? o.cue : () => {};
  let cued = false;
  return {
    id: 'milestone', durationMs: MILESTONE_MS,
    update(t) {
      const ctx = layer.begin(); if (!ctx) return;
      if (!cued) { cued = true; cue('chime'); }
      const a = Math.min(seg(t, 0, 160), 1 - seg(t, 500, 200, ease.in)), x = 10 + 18 * (1 - ease.out(Math.min(1, t / 240)));
      const y = layer.h * 0.5;
      ctx.globalAlpha = 0.7 * a; ctx.strokeStyle = TOKENS.goldSoft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(x + 14, y); ctx.stroke();
      ctx.fillStyle = TOKENS.goldSoft; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = '600 11px system-ui,sans-serif'; ctx.fillText(depth + ' m', 6, y - 4);
      glow(ctx, x + 14, y, 16, TOKENS.gold, 0.35 * a); ctx.globalAlpha = 1;
    },
    finish() { layer.clear(); },
  };
}
