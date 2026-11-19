import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fgPlace, fgMaskAlpha, slotDepth, slotSprite, freeIntrusion } from '../src/render/depth/foreground.js';
import { shaftGeom } from '../src/render/depth/math.js';
import { FG, STYLE, BIOME_ORDER } from '../src/render/depth/constants.js';

test('the erase mask covers the whole lane band from the bucket down, at every layout', () => {
  for (const [W, H, margin, laneTop] of [[360, 640, 30, 165], [430, 932, 36, 230], [360, 640, 52, 165], [320, 480, 20, 120]]) {
    const free = Math.max(4, freeIntrusion(margin));
    for (let y = laneTop; y < H; y += 5) for (let x = free; x <= W - free; x += 3) assert.equal(fgMaskAlpha(x, y, W, free, laneTop), 1, `${W}x${H} at ${x},${y}`);
    // far from the lanes (edge, high up) nothing is erased
    assert.equal(fgMaskAlpha(0, laneTop + 100, W, free, laneTop), 0);
    assert.equal(fgMaskAlpha(W / 2, laneTop - FG.maskFeatherY - 5, W, free, laneTop), 0);
  }
});

test('silhouettes only exist in a depth window, move up as you descend and come back down on a haul', () => {
  const g = shaftGeom(360, 640), a = {}, b = {};
  const z = 500;
  assert.equal(fgPlace(a, z, z - 0.5, g, 30, 1, true), false, 'already passed');
  assert.equal(fgPlace(a, z, z - 9, g, 30, 1, true), false, 'not yet in view');
  assert.equal(fgPlace(a, z, z - 4, g, 30, 1, true), true); const yFar = a.y;
  assert.equal(fgPlace(b, z, z - 2, g, 30, 1, true), true);
  assert.ok(b.y < yFar, 'closer = higher on screen'); assert.ok(b.w > a.w, 'and bigger');
  fgPlace(b, z, z - 4, g, 30, 1, true); assert.equal(b.y, yFar, 'hauling back up restores the same place exactly');
});

test('motion blur stretches only when asked and only with speed', () => {
  const g = shaftGeom(360, 640), a = {}, b = {}, c = {};
  fgPlace(a, 500, 497.8, g, 30, 2.2, true); fgPlace(b, 500, 497.8, g, 30, 2.2, false); fgPlace(c, 500, 497.8, g, 30, 0, true);
  assert.ok(a.blur > 1 && a.blur <= 1.8 + 1e-9); assert.equal(b.blur, 1); assert.equal(c.blur, 1);
});

test('placement is finite and bounded for hostile input; alpha dims over the HUD bands', () => {
  const g = shaftGeom(360, 640), o = {};
  for (const [z, d, m, v] of [[500, NaN, 30, 1], [NaN, 5, 30, 1], [500, 497, NaN, NaN], [1e12, 1e12 - 2, 30, 1], [5, 3, -50, 1e9]]) {
    const ok = fgPlace(o, z, d, g, m, v, true);
    if (ok) for (const k of ['x', 'y', 'w', 'h', 'alpha', 'blur']) assert.ok(Number.isFinite(o[k]), k);
  }
  const mid = {}, hud = {};
  fgPlace(mid, 500, 497.8, g, 30, 1, false); // centre near row 278
  fgPlace(hud, 500, 498.8, g, 30, 1, false); // centre near the top bar
  assert.ok(hud.alpha < mid.alpha, `${hud.alpha} < ${mid.alpha}`);
});

test('every biome has silhouettes and every slot maps to a real sprite index', () => {
  for (let bi = 0; bi < BIOME_ORDER.length; bi++) {
    const n = STYLE[BIOME_ORDER[bi]].sil.length * 2; assert.ok(n >= 4);
    for (let k = -50; k < 500; k++) for (const side of [0, 1]) { const s = slotSprite(side, k, bi); assert.ok(Number.isInteger(s) && s >= 0 && s < n); }
  }
  for (let k = 0; k < 100; k++) assert.ok(slotDepth(1, k) > slotDepth(1, k - 1), 'slots stay in order');
});
