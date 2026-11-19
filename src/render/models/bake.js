// Bakes one turntable frame of a model into pixels, in small time-sliced steps.
import { createTarget, clearTarget } from './raster.js';
import { prepare, drawPassA, drawPassB, resolve } from './render.js';
import { mat4RotX, mat4RotY, mat4Mul, mat4Point } from './math.js';

// The model's angle for frame f of n.
export function frameAngle(def, f, n) {
  if (def.swing) return Math.sin((f / n) * Math.PI * 2) * def.swing;
  return (f / n) * (def.period || Math.PI * 2);
}

// Work out the scale and centre so the model fills the sprite at every angle without clipping.
export function fitCamera(def, mesh, w, h) {
  const tilt = def.tilt, m = new Float32Array(16), r1 = new Float32Array(16), r2 = new Float32Array(16), p = new Float32Array(3);
  let maxX = 0, minY = 1e9, maxY = -1e9;
  const steps = 12;
  for (let k = 0; k < steps; k++) {
    mat4Mul(mat4RotX(tilt, r1), mat4RotY(frameAngle(def, k, steps), r2), m);
    for (let i = 0; i < mesh.vertCount; i++) {
      mat4Point(m, mesh.p[i * 3], mesh.p[i * 3 + 1], mesh.p[i * 3 + 2], p);
      maxX = Math.max(maxX, Math.abs(p[0])); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
  }
  const fill = def.fill || 0.84;
  const sc = fill * Math.min(w / (2 * (maxX || 1)), h / ((maxY - minY) || 1));
  return { sc, cx: w / 2, cy: h / 2 + ((minY + maxY) / 2) * sc, tilt };
}

const targets = new Map(); // reused buffers per size, so baking allocates almost nothing
function targetFor(w, h) {
  const k = w + 'x' + h; let t = targets.get(k);
  if (!t) { if (targets.size > 3) targets.clear(); t = createTarget(w, h); targets.set(k, t); }
  return t;
}

// A frame job. Call step() until it returns true; then job.pixels holds w*h*4 bytes.
// def = model entry, mesh = its mesh, w/h = final sprite pixels, ss = supersampling (1 or 2).
export function createFrameJob(def, mesh, cam, w, h, ss, frame, frames, rowsPerStep = 48) {
  const T = targetFor(w * ss, h * ss), pixels = new Uint8ClampedArray(w * h * 4);
  const angle = frameAngle(def, frame, frames);
  const job = { pixels, w, h, done: false, phase: 0, row: 0, P: null };
  job.step = function step() {
    if (job.done) return true;
    if (!job.P) { clearTarget(T); job.P = prepare(mesh, { angle, tilt: cam.tilt, sc: cam.sc * ss, cx: cam.cx * ss, cy: cam.cy * ss }); }
    const rows = job.phase === 2 ? h : T.h;
    const per = job.phase === 2 ? Math.max(4, Math.round(rowsPerStep / ss)) : rowsPerStep;
    const y1 = Math.min(rows, job.row + per);
    if (job.phase === 0) drawPassA(mesh, job.P, T, job.row, y1);
    else if (job.phase === 1) drawPassB(mesh, job.P, T, job.row, y1);
    else resolve(T, ss, pixels, w, job.row, y1);
    job.row = y1;
    if (job.row >= rows) { job.phase++; job.row = 0; if (job.phase > 2) job.done = true; }
    return job.done;
  };
  return job;
}

// Bake a whole frame now (for tests and the preview tool).
export function bakeFrameNow(def, mesh, w, h, ss, frame, frames) {
  const cam = fitCamera(def, mesh, w, h), job = createFrameJob(def, mesh, cam, w, h, ss, frame, frames, 1e9);
  while (!job.step());
  return job.pixels;
}

// A quick fingerprint of pixels, for "same seed = same picture" tests.
export function hashPixels(px) {
  let h = 2166136261;
  for (let i = 0; i < px.length; i++) { h ^= px[i]; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
