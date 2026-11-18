// The rope: three twisted strands, sway, strain tint, fraying, and a violent twang on SNAP.
import { ropeTint } from './palette.js';
import { hash01 } from './rand.js';
import { clamp01, easeOut } from './safe.js';

const N = 22;
const DASH = [3, 5];
const NO_DASH = [];

export function createRope() {
  const xs = new Float32Array(N + 1), ys = new Float32Array(N + 1);
  const r = { jolt: 0, snapT: -1, reduceMotion: false, endX: 0, endY: 0 };
  return Object.assign(r, {
    doJolt(a) { r.jolt = Math.min(1.5, r.jolt + (+a || 0)); },
    snap() { r.snapT = 0; },
    reset() { r.snapT = -1; r.jolt = 0; },
    update(dtMs) { r.jolt *= Math.pow(0.02, dtMs / 1000); if (r.snapT >= 0) r.snapT += dtMs; },
    // Where the rope is at 0..1 along its length (for sparks). Returns false if not ready.
    sample(u, out) { const i = Math.max(0, Math.min(N, Math.round(u * N))); out.x = xs[i]; out.y = ys[i]; return true; },
    draw(ctx, x0, y0, x1, y1, strain, t, scroll) {
      const s = clamp01(strain), snapped = r.snapT >= 0;
      const amp = r.reduceMotion ? 0.4 : 1;
      let ex = x1, ey = y1, whip = 0;
      if (snapped) { // upper end recoils upward and whips
        const k = easeOut(r.snapT / 350); ey = y1 + (y0 + 40 - y1) * k; whip = Math.max(0, 1 - r.snapT / 1400) * 46 * amp;
      }
      r.endX = ex; r.endY = ey;
      const shake = s > 0.75 ? (s - 0.75) * 4 * amp : 0;
      for (let i = 0; i <= N; i++) {
        const u = i / N, env = Math.sin(u * Math.PI);
        let x = x0 + (ex - x0) * u + Math.sin(u * 5 + t / 1100) * 3 * env * amp;
        x += Math.sin(u * 28 - t * 0.05) * shake * 2.5 * env;
        x += Math.sin(u * 9 - r.jolt * 10 + t * 0.03) * r.jolt * 9 * env * amp;
        if (snapped) x += Math.sin(u * 14 - r.snapT * 0.03) * whip * (0.4 + u * 0.6);
        xs[i] = x; ys[i] = y0 + (ey - y0) * u;
      }
      const tint = ropeTint(s);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); for (let i = 1; i <= N; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(20,12,6,0.85)'; ctx.stroke();
      ctx.lineWidth = 6.5; ctx.strokeStyle = tint; ctx.stroke();
      // twist: dashes that crawl with depth
      ctx.setLineDash(DASH); ctx.lineDashOffset = -(scroll % 8);
      ctx.lineWidth = 6.5; ctx.strokeStyle = 'rgba(30,16,6,0.4)'; ctx.stroke();
      ctx.setLineDash(NO_DASH);
      ctx.beginPath(); ctx.moveTo(xs[0] - 1.6, ys[0]); for (let i = 1; i <= N; i++) ctx.lineTo(xs[i] - 1.6, ys[i]);
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,240,200,0.45)'; ctx.stroke();
      // loose fibres above 70% strain
      if (s > 0.7 || snapped) {
        const n = snapped ? 14 : Math.round(((s - 0.7) / 0.3) * 12) + 1;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const i = 1 + Math.floor(hash01(k * 7 + 3) * (N - 2)), side = hash01(k * 13 + 1) > 0.5 ? 1 : -1, len = 3 + hash01(k * 5 + 9) * 5;
          ctx.moveTo(xs[i], ys[i]); ctx.lineTo(xs[i] + side * len, ys[i] + len * 0.5 + Math.sin(t / 200 + k) * 1.2);
        }
        ctx.lineWidth = 1; ctx.strokeStyle = s > 0.9 || snapped ? '#ffb0a8' : '#f0d59a'; ctx.stroke();
      }
    },
  });
}
