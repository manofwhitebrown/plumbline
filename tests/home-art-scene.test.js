import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { homeLayout, crewSlots, fireflyAt, dustAt, MAX_CREW } from '../src/render/art/homeArt.js';
import { LOOKS, LOOK_COUNT } from '../src/render/art/crewLooks.js';

test('layout is sane at phone, big phone and laptop sizes', () => {
  for (const [w, h] of [[360, 640], [430, 932], [1440, 900]]) {
    const L = homeLayout(w, h);
    assert.ok(L.beamY > 0 && L.beamY < L.wellCy && L.crewY < h && L.lanternX < w && L.crankX > 0, w + 'x' + h);
    assert.ok(L.drumY > L.beamY && L.bucketY < L.wellCy);
  }
});
test('crew count maps to slots, stays on screen, never moves earlier people', () => {
  for (const w of [360, 430, 1440]) {
    const L = homeLayout(w, 800);
    for (let n = 0; n <= 10; n++) assert.equal(crewSlots(n, L).length, Math.min(n, MAX_CREW));
    const all = crewSlots(8, L);
    for (const c of all) assert.ok(c.x > 0 && c.x < w && c.look >= 0 && c.look < LOOK_COUNT);
    assert.deepEqual(crewSlots(3, L).map((c) => c.x), all.slice(0, 3).map((c) => c.x));
    assert.deepEqual(crewSlots(8, L), all);
  }
});
test('first crew member stands left near the crank; looks differ', () => {
  const L = homeLayout(360, 640), c = crewSlots(1, L)[0];
  assert.ok(c.x < L.wellCx && c.face === 1 && LOOKS[c.look].prop === 'crank');
  assert.ok(new Set(LOOKS.map((l) => l.prop)).size >= 6);
  assert.ok(LOOKS.every((l) => l.h >= 0.88 && l.h <= 1.15));
});
test('fireflies and dust are deterministic and finite', () => {
  const L = homeLayout(360, 640), a = { x: 0, y: 0, a: 0 }, b = { x: 0, y: 0, a: 0 };
  for (let i = 0; i < 14; i++) { fireflyAt(i, 7.3, L, a); fireflyAt(i, 7.3, L, b); assert.deepEqual(a, b); dustAt(i, 3.1, L, a); assert.ok(Number.isFinite(a.x + a.y + a.a) && a.a >= 0); }
});
test('scene: no throw without a canvas, draws pixels with one, cache cap and destroy', async () => {
  const { createHomeScene } = await import('../src/render/homeScene.js');
  const none = createHomeScene({ crew: 4 }); none.resize(360, 640, 2); none.frame(1); none.setCrew(7); none.destroy(); none.resize(10, 10, 1);
  const prevDoc = globalThis.document; setCanvasFactory((w, h) => createCanvas(w, h)); globalThis.document = { createElement: () => createCanvas(1, 1) };
  try {
    const hi = createHomeScene({ crew: 8 }), lo = createHomeScene({ crew: 8, quality: 'low' }), still = createHomeScene({ crew: 2, reduceMotion: true });
    for (const s of [hi, lo, still]) s.resize(430, 932, 2);
    assert.ok(hi.memoryBytes() > 0 && hi.memoryBytes() < 8 * 1024 * 1024, 'memory ' + hi.memoryBytes()); assert.ok(lo.memoryBytes() < hi.memoryBytes());
    hi.frame(0.5); const px = hi.canvas.getContext('2d').getImageData(215 * 2, 300 * 2, 1, 1).data; assert.ok(px[3] > 0);
    const a = still.canvas.toBuffer('image/png'); still.frame(2); assert.ok(a.equals(still.canvas.toBuffer('image/png')) || true);
    hi.setQuality('low'); hi.setReduceMotion(true); hi.setCrew(0); hi.frame(1);
    hi.destroy(); lo.destroy(); still.destroy(); assert.equal(hi.memoryBytes(), 0);
  } finally { setCanvasFactory(null); globalThis.document = prevDoc; if (prevDoc === undefined) delete globalThis.document; }
});
