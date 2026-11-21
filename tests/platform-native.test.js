import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleBack, keepAwake, isAwakeWanted, installNative, isNativeApp, _resetNative, _setShellForTests } from '../src/platform/native.js';

test('native: no window means install does nothing and never throws', () => {
  _resetNative();
  assert.equal(installNative(), false);
  assert.equal(isNativeApp(), false);
});

test('back: before the screens exist the press means "minimise"', () => {
  _resetNative();
  assert.equal(handleBack(), 'exit');
});

test('back: a screen with somewhere to go handles it, Home asks nothing and minimises', () => {
  _resetNative();
  let steps = 1;
  _setShellForTests({ hasOverlay: () => false, back: () => { if (steps > 0) { steps--; return true; } return false; } });
  assert.equal(handleBack(), 'handled');
  assert.equal(handleBack(), 'exit');
});

test('back: an open window closes with Escape and the app stays', () => {
  _resetNative();
  const seen = [];
  const original = { document: globalThis.document, KeyboardEvent: globalThis.KeyboardEvent };
  globalThis.KeyboardEvent = class { constructor(type, init) { this.type = type; this.key = init.key; } };
  globalThis.document = { body: { dispatchEvent: (e) => { seen.push(e.key); return true; } } };
  try {
    _setShellForTests({ hasOverlay: () => true, back: () => { throw new Error('should not be called'); } });
    assert.equal(handleBack(), 'handled');
    assert.deepEqual(seen, ['Escape']);
  } finally {
    globalThis.document = original.document;
    globalThis.KeyboardEvent = original.KeyboardEvent;
    if (original.document === undefined) delete globalThis.document;
    if (original.KeyboardEvent === undefined) delete globalThis.KeyboardEvent;
  }
});

test('back: a broken shell fails soft', () => {
  _resetNative();
  _setShellForTests({ hasOverlay: () => { throw new Error('boom'); }, back: () => true });
  assert.equal(handleBack(), 'exit');
});

test('keep awake: remembers the wish even when the phone cannot do it', async () => {
  _resetNative();
  assert.equal(await keepAwake(true), false);
  assert.equal(isAwakeWanted(), true);
  await keepAwake(false);
  assert.equal(isAwakeWanted(), false);
});
