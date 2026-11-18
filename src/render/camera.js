// Camera: gentle follow, small shake (max 6 px), zoom pulses. No allocations per frame.
import { clamp } from './safe.js';
export const MAX_SHAKE = 6;

export function createCamera() {
  const cam = {
    reduceMotion: false,
    x: 0, y: 0, zoom: 1,
    _shake: 0, _t: 0, _pulse: 0, _nx: 0, _ny: 0,
    shake(px) { if (cam.reduceMotion) return; cam._shake = Math.min(MAX_SHAKE, Math.max(cam._shake, clamp(+px || 0, 0, MAX_SHAKE))); },
    pulse(amount) { if (cam.reduceMotion) amount *= 0.3; cam._pulse = Math.max(cam._pulse, clamp(+amount || 0, 0, 0.05)); },
    nudge(dx, dy) { if (cam.reduceMotion) return; cam._nx += clamp(+dx || 0, -3, 3); cam._ny += clamp(+dy || 0, -3, 3); },
    update(dtMs) {
      const dt = clamp(+dtMs || 0, 0, 100);
      cam._t += dt;
      cam._shake *= Math.pow(0.0025, dt / 1000); // fast fade
      if (cam._shake < 0.05) cam._shake = 0;
      cam._pulse *= Math.pow(0.02, dt / 1000);
      cam._nx *= Math.pow(0.001, dt / 1000);
      cam._ny *= Math.pow(0.001, dt / 1000);
      const s = cam._shake, t = cam._t;
      cam.x = Math.sin(t * 0.083) * s + cam._nx;
      cam.y = Math.cos(t * 0.097) * s + cam._ny;
      cam.zoom = 1 + cam._pulse;
    },
    apply(ctx, w, h) {
      ctx.translate(w / 2 + cam.x, h * 0.4 + cam.y);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-w / 2, -h * 0.4);
    },
    reset() { cam._shake = 0; cam._pulse = 0; cam._nx = 0; cam._ny = 0; cam.x = 0; cam.y = 0; cam.zoom = 1; },
  };
  return cam;
}
