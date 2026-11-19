// The rope: three twisted strands, sway, strain tint, fraying, and a violent twang on SNAP.
import { ropeTint } from './palette.js';
import { hash01 } from './rand.js';
import { clamp01, easeOut } from './safe.js';
import { getRopeTiles } from './art/ropeArt.js'; // [GFX-1] twisted rope tiles

const N = 22;
const DASH = [3, 5];
const NO_DASH = [];

// Draw one tile along the rope curve. The tile is cut into slices that follow each segment,
// so the twist runs on smoothly around bends. Nothing is allocated here.
function strip(ctx, tile, T, xs, ys, scroll) {
  let acc = ((scroll % T.th) + T.th) % T.th;
  for (let i = 0; i < N; i++) {
    const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i], len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) continue;
    ctx.save(); ctx.translate(xs[i], ys[i]); ctx.rotate(Math.atan2(-dx, dy));
    let src = acc, drawn = 0;
    while (drawn < len) {
      const take = Math.min(len - drawn, T.th - src);
      ctx.drawImage(tile, 0, src * T.dpr, T.tw * T.dpr, Math.max(1, take * T.dpr), -T.tw / 2, drawn, T.tw, take + 0.7);
      drawn += take; src = 0;
    }
    ctx.restore();
    acc = (acc + len) % T.th;
  }
}

export function createRope() {
  const xs = new Float32Array(N + 1), ys = new Float32Array(N + 1);
  const r = { jolt: 0, snapT: -1, reduceMotion: false, low: false, dpr: 1, endX: 0, endY: 0 };
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
      const T = r.low ? null : getRopeTiles(r.dpr);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); for (let i = 1; i <= N; i++) ctx.lineTo(xs[i], ys[i]);
      if (T) {
        ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(8,5,2,0.4)'; ctx.stroke(); // soft shadow behind the rope
        strip(ctx, T.calm, T, xs, ys, scroll);
        const warm = clamp01((s - 0.45) / 0.4), hot = clamp01((s - 0.82) / 0.18);
        if (warm > 0.02) { ctx.globalAlpha = warm; strip(ctx, T.warm, T, xs, ys, scroll); }
        if (hot > 0.02) { ctx.globalAlpha = hot * (r.reduceMotion ? 0.85 : 0.7 + 0.15 * Math.sin(t / 140)); strip(ctx, T.hot, T, xs, ys, scroll); }
        ctx.globalAlpha = 1;
      } else { // low quality or no canvas: the simple flat rope
        const tint = ropeTint(s);
        ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(20,12,6,0.85)'; ctx.stroke();
        ctx.lineWidth = 6.5; ctx.strokeStyle = tint; ctx.stroke();
        ctx.setLineDash(DASH); ctx.lineDashOffset = -(scroll % 8);
        ctx.lineWidth = 6.5; ctx.strokeStyle = 'rgba(30,16,6,0.4)'; ctx.stroke();
        ctx.setLineDash(NO_DASH);
        ctx.beginPath(); ctx.moveTo(xs[0] - 1.6, ys[0]); for (let i = 1; i <= N; i++) ctx.lineTo(xs[i] - 1.6, ys[i]);
        ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,240,200,0.45)'; ctx.stroke();
      }
      // loose fibres above 70% strain: curved wisps that glow red-hot above 90%
      if (s > 0.7 || snapped) {
        const hotF = s > 0.9 || snapped;
        const n = Math.round(((snapped ? 1 : (s - 0.7) / 0.3)) * (r.low ? 6 : 14)) + 1;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const i = 1 + Math.floor(hash01(k * 7 + 3) * (N - 2)), side = hash01(k * 13 + 1) > 0.5 ? 1 : -1, len = 3 + hash01(k * 5 + 9) * 6;
          const fx = xs[i] + side * 2, fy = ys[i], wob = r.reduceMotion ? 0 : Math.sin(t / 200 + k) * 1.4;
          ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + side * len * 0.9, fy + len * 0.1 + wob, fx + side * len * 0.7, fy + len * 0.8);
        }
        ctx.lineWidth = 1; ctx.strokeStyle = hotF ? '#ffb090' : '#f0d59a'; ctx.stroke();
        if (hotF && !r.low) { // red-hot glow on the same fibres
          ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,90,40,0.35)'; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        }
      }
    },
  });
}
