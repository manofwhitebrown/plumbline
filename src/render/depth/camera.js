// Depth camera: gentle roll and sway from rope tension, zoom pulse on big collects, shake on hits.
// It moves only the depth layers (walls, foreground), never the lanes, so gameplay stays steady.
// Hard caps: 6 px, 1.5 degrees, 3 percent zoom. Everything is zero with Reduce motion.
import { createCues } from '../../feel/cues.js';
import { createSpring } from '../../feel/spring.js';
import { CAM } from './constants.js';
import { fin, clamp, clampCam } from './math.js';

export function createDepthCam(opts) {
  let reduce = !!(opts && opts.reduceMotion), shake = 0, t = 0;
  const cues = createCues({ reduceMotion: reduce }), rollS = createSpring(0, 520), leanS = createSpring(0, 380);
  const cam = {
    dx: 0, dy: 0, roll: 0, zoom: 1, tension: 0, danger: 0, // roll in degrees
    setReduceMotion(v) { reduce = !!v; cues.setReduceMotion(reduce); if (reduce) { shake = 0; cam.dx = cam.dy = cam.roll = 0; cam.zoom = 1; rollS.snap(0); leanS.snap(0); } },
    push(ev) {
      if (!ev || typeof ev !== 'object') return;
      cues.push(ev);
      if (reduce) return;
      if (ev.t === 'HAZARD') {
        const d = clamp(fin(ev.strainDelta), 0, 12);
        if (d > 0) { shake = Math.min(CAM.shakePx, shake + clamp(d * 0.9, 1.5, CAM.shakePx)); leanS.value = clamp(leanS.value + (fin(ev.lane) % 2 ? -0.5 : 0.5), -CAM.rollDeg * 0.6, CAM.rollDeg * 0.6); }
      } else if (ev.t === 'SNAP') shake = CAM.shakePx;
      else if (ev.t === 'RUN_START') { shake = 0; leanS.snap(0); }
    },
    update(dtMs, strain01) {
      const dt = clamp(fin(dtMs), 0, 100);
      t += dt;
      cues.update(dt, { strain: clamp(fin(strain01), 0, 1), maxStrain: 1, status: 'running' });
      cam.tension = cues.tension; cam.danger = cues.danger;
      if (reduce) { cam.dx = cam.dy = cam.roll = 0; cam.zoom = 1; return cam; }
      shake *= Math.pow(0.004, dt / 1000); if (shake < 0.05) shake = 0;
      const k = cam.tension;
      const swayX = Math.sin(t / 2300) * (0.5 + 2.2 * k), swayY = Math.sin(t / 3100 + 0.8) * (0.3 + 1.2 * k);
      const rollT = Math.sin(t / 3100 + 1.3) * (0.16 + 0.8 * k);
      rollS.update(rollT, dt); leanS.update(0, dt);
      cam.dx = swayX + Math.sin(t * 0.083) * shake + cues.camX;
      cam.dy = swayY + Math.cos(t * 0.097) * shake + cues.camY;
      cam.roll = rollS.value + leanS.value;
      cam.zoom = cues.zoom;
      return clampCam(cam, CAM);
    },
    reset() { shake = 0; cues.reset(); rollS.snap(0); leanS.snap(0); cam.dx = cam.dy = cam.roll = 0; cam.zoom = 1; },
  };
  return cam;
}
