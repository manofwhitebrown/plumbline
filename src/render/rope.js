// The rope: three twisted strands, sway, strain tint, fraying, and a violent twang on SNAP.
import { ropeTint } from './palette.js';
import { hash01 } from './rand.js';
import { clamp01, easeOut } from './safe.js';
import { buildRopeTile, drawRopeStrip, ROPE_W } from './art/ropeArt.js'; // [GFX-1] twisted rope look

const N = 22;

export function createRope() {
  const xs = new Float32Array(N + 1), ys = new Float32Array(N + 1);
  let tile = null, tileTried = false;
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
      if (!tile && !tileTried) { tileTried = true; tile = buildRopeTile(); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(xs[0], ys[0]); for (let i = 1; i <= N; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.lineWidth = ROPE_W + 3; ctx.strokeStyle = 'rgba(20,12,6,0.85)'; ctx.stroke(); // dark outline (also hides tiny gaps)
      if (tile) drawRopeStrip(ctx, tile, xs, ys, N, scroll); // three strands wound around each other, crawling down with depth
      else { ctx.lineWidth = ROPE_W - 2.5; ctx.strokeStyle = tint; ctx.stroke(); }
      // strain tint: gold at rest, amber, then red
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.2 + 0.6 * s; ctx.lineWidth = ROPE_W - 2; ctx.strokeStyle = tint; ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // loose fibres above 70% strain; red-hot and glowing above 90%
      if (s > 0.7 || snapped) {
        const hot = s > 0.9 || snapped, n = snapped ? 16 : Math.round(((s - 0.7) / 0.3) * 14) + 2;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const i = 1 + Math.floor(hash01(k * 7 + 3) * (N - 2)), side = hash01(k * 13 + 1) > 0.5 ? 1 : -1, len = 3 + hash01(k * 5 + 9) * 6;
          const wob = r.reduceMotion ? 0 : Math.sin(t / 200 + k) * 1.4;
          ctx.moveTo(xs[i], ys[i]); ctx.quadraticCurveTo(xs[i] + side * len * 0.5, ys[i] + len * 0.1, xs[i] + side * len, ys[i] + len * 0.55 + wob);
        }
        ctx.lineWidth = 1; ctx.strokeStyle = hot ? '#ffb0a8' : '#f0d59a'; ctx.stroke();
        if (hot) { // red-hot fibres glow: a second, additive, softer pass
          const pulse = r.reduceMotion ? 0.7 : 0.6 + 0.3 * Math.sin(t / 160);
          ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,70,40,' + (0.35 * pulse).toFixed(2) + ')'; ctx.stroke();
          ctx.lineWidth = 7; ctx.beginPath(); for (let i = 2; i < N; i += 4) { ctx.moveTo(xs[i], ys[i]); ctx.lineTo(xs[i] + 0.01, ys[i]); }
          ctx.strokeStyle = 'rgba(255,90,40,' + (0.16 * pulse).toFixed(2) + ')'; ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    },
  });
}
