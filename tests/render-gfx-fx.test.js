import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { setCanvasFactory } from '../src/render/canvasUtil.js';
import { createFxSprites, toRgb, FX_KINDS, BASE } from '../src/render/art/fxSprites.js';
import { createParticles, MAX_PARTICLES } from '../src/render/particles.js';
import { createEffects } from '../src/render/effects.js';

const withCanvas = () => setCanvasFactory((w, h) => createCanvas(w, h));
const noCanvas = () => setCanvasFactory(() => null);
const spy = () => { const calls = []; return { calls, ctx: new Proxy({ globalAlpha: 1 }, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'drawImage') calls.push(a); }), set: (t, k, v) => { t[k] = v; return true; } }) }; };

test('colour parsing: hex, short hex, rgba, junk', () => {
  assert.deepEqual(toRgb('#f6c453'), [246, 196, 83]); assert.deepEqual(toRgb('#fff'), [255, 255, 255]);
  assert.deepEqual(toRgb('rgba(255,227,161,0.9)'), [255, 227, 161]); assert.deepEqual(toRgb(null), [255, 255, 255]); assert.deepEqual(toRgb('red'), [255, 255, 255]);
});
test('sprites: all 7 kinds exist, are cached, and stay within the memory budget', () => {
  withCanvas(); const sp = createFxSprites(); sp.rebuild(3, false);
  for (const k of FX_KINDS) assert.ok(sp.get(k, '#ffffff'), k);
  const a = sp.get('spark', '#ff00aa'); assert.equal(a, sp.get('spark', '#ff00aa'), 'cached');
  for (let i = 0; i < 200; i++) sp.get('spark', '#' + (0x100000 + i * 997).toString(16).slice(0, 6)); // flood with colours
  assert.ok(sp.count <= 72 + 1, 'cache cap holds: ' + sp.count);
  assert.ok(sp.bytes < 8 * 1024 * 1024, 'sprite memory: ' + sp.bytes);
  sp.destroy(); assert.equal(sp.count, 0); assert.equal(sp.get('spark', '#fff'), null);
});
test('low quality uses fewer, smaller sprites', () => {
  withCanvas(); const hi = createFxSprites(), lo = createFxSprites(); hi.rebuild(2, false); lo.rebuild(2, true);
  assert.ok(lo.bytes < hi.bytes);
});
test('sprites are deterministic: same pixels twice', () => {
  withCanvas(); const a = createFxSprites(), b = createFxSprites(); a.rebuild(1, false); b.rebuild(1, false);
  assert.ok(a.get('glint', '#ffe3a1').toBuffer('image/png').equals(b.get('glint', '#ffe3a1').toBuffer('image/png')));
});
test('safe without canvas: no throw, draw returns false, particles fall back to flat shapes', () => {
  noCanvas(); const sp = createFxSprites(); sp.rebuild(2, false);
  assert.equal(sp.get('ring', '#fff'), null); assert.equal(sp.draw({}, 'ring', '#fff', 1, 1, 10), false);
  const p = createParticles(); p.setSprites(sp); const { ctx, calls } = spy();
  for (let k = 0; k < 9; k++) p.emit(k, 10, 10, 0, 0, 500, 3, '#fff');
  p.draw(ctx); assert.equal(calls.length, 0); withCanvas();
});
test('particles use sprites when present (one drawImage each) and keep the 300 cap', () => {
  withCanvas(); const sp = createFxSprites(); sp.rebuild(1, false); const p = createParticles(); p.setSprites(sp);
  for (const k of [0, 1, 2, 3, 6, 7, 8]) p.emit(k, 20, 20, 0, 0, 600, 3, '#ffe3a1');
  const { ctx, calls } = spy(); p.draw(ctx); assert.equal(calls.length, 7);
  for (let i = 0; i < 600; i++) p.emit(0, 1, 1, 0, 0, 500, 2, '#fff'); assert.ok(p.count <= MAX_PARTICLES); assert.equal(MAX_PARTICLES, 300);
  for (let i = 0; i < 20; i++) p.update(64); assert.equal(p.count, 0);
});
test('layered effects: only on high quality, switchable off, never more than 3 flashes per second', () => {
  withCanvas();
  const mk = () => { const em = []; const particles = { emit: (...a) => { em.push(a); return {}; }, burst: () => {}, clear() {} };
    const sc = { flashTimes: [0, 0, 0], flashA: 0, time: 5000, L: { cx: 100, attachY: 10, top: 50, bucketH: 60, bucketW: 40, w: 200, h: 400, tile: 30, cols: 4 }, reduceMotion: false, items: { items: [] }, reset() {}, snapped: false, hauled: false, rings: { acquire: () => ({}) }, streaks: { acquire: () => ({}) }, due: { acquire: () => ({}) } };
    const fx = createEffects({ sc, particles, floaters: { add() {}, clear() {} }, camera: { shake() {}, pulse() {}, reset() {}, nudge() {} }, rope: { snap() {}, doJolt() {}, reset() {} }, bucket: { dip() {}, startFall() {}, startLift() {}, reset() {}, offY: 0 }, well: { setBiome() {} }, vignette: { setStrain() {} } });
    return { em, fx, sc }; };
  let { em, fx } = mk(); fx.handlers.SNAP({}); assert.ok(em.some((a) => a[0] === 8), 'snap shockwave');
  ({ em, fx } = mk()); fx.handlers.HAUL(); assert.ok(em.filter((a) => a[0] === 6).length >= 8, 'haul coin glints');
  ({ em, fx } = mk()); fx.handlers.RECORD(); assert.ok(em.filter((a) => a[0] === 7).length >= 20, 'record confetti');
  ({ em, fx } = mk()); fx.state.extras = false; fx.handlers.RECORD(); fx.handlers.HAUL(); assert.equal(em.filter((a) => a[0] === 6 || a[0] === 7 || a[0] === 8).length, 0, 'extras off');
  ({ em, fx } = mk()); fx.state.low = true; fx.handlers.RECORD(); assert.equal(em.filter((a) => a[0] === 7 || a[0] === 8).length, 0, 'low quality');
  ({ em, fx } = mk()); fx.handlers.RECORD(); assert.equal(em.filter((a) => a[0] === 7).length, 24); const { sc } = mk();
  // flash limiter: 3 flashes inside one second at most
  const m = mk(); let before = 0; for (let i = 0; i < 6; i++) { m.sc.time = 9000 + i * 100; m.sc.flashA = 0; m.sc.snapped = false; m.fx.handlers.SNAP({}); if (m.sc.flashA > 0) before++; } // [INTEGRATE-1] RECORD no longer flashes (the cinematic owns it); SNAP does
  assert.equal(before, 3);
});
