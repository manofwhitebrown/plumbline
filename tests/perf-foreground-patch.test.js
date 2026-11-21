// [PERF-2] The foreground only clears, erases and blits the patch each side used. A long-lived foreground must
// draw exactly the same pixels as a brand-new one every frame (no leftover pixels from earlier frames).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { createForeground } from '../src/render/depth/foreground.js';
import { createAssets } from '../src/render/depth/assets.js';
import { createDepthCam } from '../src/render/depth/camera.js';

const mk = (w, h) => createCanvas(w, h), W = 360, H = 640;
test('foreground: patch-only drawing leaves no ghosts and matches a fresh foreground pixel for pixel', () => {
  const A = createAssets({ mk, now: () => Date.now(), wallTexture: null });
  A.request(0, 3); for (let i = 0; i < 200; i++) A.step(50);
  const cam = createDepthCam({ reduceMotion: false }), live = createForeground({ mk });
  const ca = createCanvas(W, H), cb = createCanvas(W, H), ga = ca.getContext('2d'), gb = cb.getContext('2d');
  let drawnFrames = 0, frames = 0;
  for (let d = 5; d < 90; d += 0.31, frames++) {
    cam.update(16, 0.3); if (frames % 25 === 0) cam.push({ t: 'HAZARD', strainDelta: 4 });
    const vel = (frames % 7) * 4, blur = frames % 3 !== 0;
    ga.clearRect(0, 0, W, H); gb.clearRect(0, 0, W, H);
    const n = live.draw(ga, A, d, W, H, 40, 200, vel, cam, blur, -1);
    createForeground({ mk }).draw(gb, A, d, W, H, 40, 200, vel, cam, blur, -1);
    if (n > 0) drawnFrames++;
    assert.equal(Buffer.compare(ca.data(), cb.data()), 0, 'frame ' + frames + ' differs (depth ' + d.toFixed(2) + ')');
  }
  assert.ok(drawnFrames > 20, 'the test saw silhouettes (' + drawnFrames + ' frames)');
});
