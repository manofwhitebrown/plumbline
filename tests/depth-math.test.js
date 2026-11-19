import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSliceTable, buildSliceTable, sliceStart, sliceDepth, shaftGeom, wallWidth, biomeIndexAt, blendAt, clampCam, rowOf } from '../src/render/depth/math.js';
import { TEX_H, OV, CAM, BIOME_EDGES, BLEND_M, GEOM } from '../src/render/depth/constants.js';
import { BIOME_EDGES as POLISH_EDGES, BLEND_M as POLISH_BLEND } from '../src/render/polish/util.js';

const SIZES = [[360, 640], [430, 932], [320, 480], [480, 1000], [360, 320]];

test('biome edges and blend length match the polish layer and the contract', () => {
  assert.deepEqual(BIOME_EDGES, POLISH_EDGES); assert.equal(BLEND_M, POLISH_BLEND);
  assert.equal(biomeIndexAt(0), 0); assert.equal(biomeIndexAt(99.9), 0); assert.equal(biomeIndexAt(100), 1); assert.equal(biomeIndexAt(1e6), 5);
  assert.equal(blendAt(80), 0); assert.ok(blendAt(92) > 0 && blendAt(92) < 1); assert.equal(blendAt(100), 0); assert.equal(blendAt(1200), 0);
});

test('slice table covers the layer top to bottom with no gaps and sane numbers', () => {
  const t = makeSliceTable();
  for (const [w, h] of SIZES) for (const step of [6, 8, 14]) {
    buildSliceTable(t, w, h, step);
    assert.ok(t.n > 10 && t.n < t.y.length, `n for ${w}x${h}`);
    assert.equal(t.y[0], -OV);
    for (let i = 0; i < t.n; i++) {
      if (i > 0) assert.ok(Math.abs(t.y[i] - (t.y[i - 1] + t.h[i - 1])) < 1e-3, 'gap at ' + i);
      assert.ok(t.h[i] > 0 && t.wI[i] > 0 && t.srcH[i] > 0 && t.srcH[i] <= TEX_H, 'row ' + i);
      assert.ok(t.mip[i] >= 0 && t.mip[i] <= 2); assert.ok(Number.isFinite(t.zq[i]) && Number.isFinite(t.rq0[i]));
    }
    assert.ok(Math.abs(t.y[t.n - 1] + t.h[t.n - 1] - (h + OV)) < 1e-3);
    // perspective: far (low) rows are minified more than near (high) rows, and the wall widens toward the bottom
    assert.ok(t.srcH[t.n - 1] / t.h[t.n - 1] > t.srcH[0] / t.h[0]);
    assert.ok(t.wI[t.n - 1] > t.wI[0]);
  }
});

test('wall width never goes negative and stays inside the screen', () => {
  for (const [w, h] of SIZES) { const g = shaftGeom(w, h); for (let y = -100; y < h + 100; y += 7) { const v = wallWidth(y, g); assert.ok(v > 0 && v < w / 2, `${w}x${h} y${y}`); } }
});

test('scroll wraps without seams at any depth, including huge and negative ones', () => {
  const t = makeSliceTable();
  for (const [w, h] of SIZES) {
    buildSliceTable(t, w, h, 8);
    for (const d of [0, 0.001, 1, 3.2, 7.77, 99.9999, 100, 12345.678, 9e6, -5, -0.3]) for (const off of [0, TEX_H * 0.5]) {
      for (let i = 0; i < t.n; i++) {
        const u0 = sliceStart(t, i, d, off);
        assert.ok(u0 >= 0 && u0 < TEX_H, 'u0 range');
        assert.ok(u0 + t.srcH[i] <= 2 * TEX_H + 1e-6, 'reads past the doubled texture');
        if (i + 1 < t.n) { // the next slice starts exactly where this one ended (modulo the tile height)
          const end = (u0 + t.srcH[i]) % TEX_H, next = sliceStart(t, i + 1, d, off);
          const diff = Math.min(Math.abs(end - next), TEX_H - Math.abs(end - next));
          assert.ok(diff < 0.02 * Math.max(1, Math.abs(d) < 1e5 ? 1 : 1e3) + 1e-3, `seam at slice ${i}, depth ${d}: ${end} vs ${next}`);
        }
      }
    }
  }
});

test('a fixed world point keeps its place on screen: the texture row matches the depth model', () => {
  const t = makeSliceTable(); buildSliceTable(t, 360, 640, 8);
  const g = shaftGeom(360, 640);
  // a ring at depth z shows on screen row rowOf(z - d + dRef); the slice there must be at depth z (within one slice)
  for (const d of [10, 55.5, 300]) for (const z of [d + 2, d + 7, d + 15]) {
    const y = rowOf(z - d + GEOM.dRef, g); if (y < -OV || y > 640 + OV) continue;
    let i = 0; while (i < t.n - 1 && t.y[i] + t.h[i] < y) i++;
    assert.ok(Math.abs(sliceDepth(t, i, d) - z) < 1.2, `slice depth ${sliceDepth(t, i, d)} vs ${z}`);
  }
});

test('camera clamp enforces 6 px, 1.5 degrees and 3 percent for any input', () => {
  const c = { dx: 99, dy: -99, roll: 45, zoom: 9 }; clampCam(c, CAM);
  assert.deepEqual(c, { dx: 6, dy: -6, roll: 1.5, zoom: 1.03 });
  const n = clampCam({ dx: NaN, dy: Infinity, roll: -Infinity, zoom: NaN }, CAM);
  assert.ok(Number.isFinite(n.dx) && Number.isFinite(n.dy) && Number.isFinite(n.roll) && n.zoom === 1);
});
