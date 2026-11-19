import test from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { paintHeroIcon, FAMILIES } from '../src/render/art/iconStyle.js';
import * as P from '../src/render/partIcon.js';

function fakeCtx(log = []) {
  const grad = { addColorStop: (...a) => log.push('stop' + a.join(',')) };
  const base = { createLinearGradient: () => grad, createRadialGradient: () => grad };
  return new Proxy(base, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(String(k)); }; },
    set(t, k, v) { log.push('set' + String(k)); return true; },
  });
}
const fakeFactory = (w, h) => ({ width: w, height: h, getContext: () => fakeCtx() });
const STATES = ['idle', 'firing', 'selected', 'locked'];

test('every part has a family with a full colour set', () => {
  assert.equal(P.PART_KEYS.length, 26);
  for (const f of Object.values(FAMILIES)) {
    assert.equal(f.metal.length, 3); assert.equal(f.tile.length, 2); assert.match(f.accent, /^#[0-9a-f]{6}$/i);
  }
  const accents = ['collector', 'processor', 'defense', 'engine', 'special'].map((n) => FAMILIES[n].accent);
  assert.equal(new Set(accents).size, 5, 'the five family accents differ');
});

test('hero icon paints every part in every state, and says no when there is no canvas', () => {
  setCanvasFactory(fakeFactory);
  for (const key of P.PART_KEYS) for (const st of STATES) {
    const log = [];
    assert.equal(paintHeroIcon(fakeCtx(log), 48, 2, () => {}, FAMILIES.collector, st), true);
    assert.ok(log.length > 10);
  }
  setCanvasFactory(() => null);
  assert.equal(paintHeroIcon(fakeCtx(), 48, 2, () => {}, FAMILIES.collector, 'idle'), false);
  setCanvasFactory(null);
});

test('part icon sprites: cached per size and state, flat drawing when there is no canvas, never throws', () => {
  setCanvasFactory(fakeFactory); P.clearSprites();
  const a = P.getSprite('hook', 48, 2, 'idle');
  assert.ok(a); assert.equal(P.getSprite('hook', 48, 2, 'idle'), a);
  assert.notEqual(P.getSprite('hook', 48, 2, 'firing'), a);
  for (const id of [...P.PART_KEYS, 'nope', null, 5]) for (const st of STATES) assert.doesNotThrow(() => P.draw(fakeCtx(), id, 3, 4, 24, st));
  setCanvasFactory(() => null); P.clearSprites();
  assert.doesNotThrow(() => P.draw(fakeCtx(), 'prism', 0, 0, 96, 'firing'));
  assert.equal(P.getSprite('hook', 48, 1, 'idle'), null);
  setCanvasFactory(null); P.clearSprites();
});
