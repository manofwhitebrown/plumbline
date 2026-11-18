import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buzz, setHapticsEnabled, _reset } from '../src/platform/haptics.js';
import { getViewport, isLandscapeWide, getSafeArea, applyViewportVars, watchViewport } from '../src/platform/viewport.js';

test('haptics: no device support means a quiet false, never an error', () => {
  _reset();
  assert.equal(buzz('tap'), false);
  assert.equal(buzz('nonsense'), false);
  assert.equal(buzz(undefined), false);
});

test('haptics: uses vibrate when present, respects off switch and spacing', () => {
  let t = 1000; _reset(() => t);
  const calls = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (p) => { calls.push(p); return true; } }, configurable: true, writable: true });
  try {
    assert.equal(buzz('tap'), true);
    assert.equal(buzz('collect'), true);
    t += 10;
    assert.equal(buzz('collect'), false);   // too soon
    t += 100;
    assert.equal(buzz('collect'), true);
    setHapticsEnabled(false);
    assert.equal(buzz('snap'), false);
    setHapticsEnabled(true);
    assert.equal(buzz('snap'), true);
    assert.equal(calls.length, 4);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original); else delete globalThis.navigator;
    _reset();
  }
});

test('viewport: safe without a browser', () => {
  assert.equal(isLandscapeWide(), false);
  assert.deepEqual(getSafeArea(), { top: 0, right: 0, bottom: 0, left: 0 });
  const v = getViewport();
  assert.ok(v.w > 0 && v.h > 0 && v.dpr >= 1 && v.dpr <= 2);
  assert.doesNotThrow(() => applyViewportVars());
  const off = watchViewport(() => {});
  assert.equal(typeof off, 'function'); off();
  assert.equal(typeof watchViewport(null), 'function');
});
