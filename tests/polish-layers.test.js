import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPolish } from '../src/render/polish/index.js';
import { AMBIENCE_CAP } from '../src/render/polish/ambience.js';
import { blendInfo, BIOME_EDGES, POLISH_CAP } from '../src/render/polish/util.js';

// A fake 2D context that records what was drawn and never fails.
function fakeCtx() {
  const calls = {};
  const grad = { addColorStop() {} };
  const target = { calls };
  return new Proxy(target, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k in t) return t[k];
      return (...a) => { calls[k] = (calls[k] || 0) + 1; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const factory = () => { const ctx = fakeCtx(); return { getContext: () => ctx, width: 1, height: 1 }; };
const state = (o = {}) => ({ depth: 120, biomeId: 'quartz', strain01: 0.5, danger: 0.5, speed: 1, bucket: { x: 180, y: 300 }, lanes: [60, 120, 180, 240], laneCount: 4, arriveY: 420, w: 360, h: 640, time: 1000, ...o });
const make = (o = {}) => { const p = createPolish({ makeCanvas: factory, ...o }); p.resize(360, 640, 2); return p; };
function frames(p, ctx, n, st) { for (let i = 0; i < n; i++) { const s = st ? st(i) : state({ time: i * 16 }); p.update(16, s); p.drawBack(ctx, s); p.drawFront(ctx, s); } }

test('layers never throw on hostile input', () => {
  const p = make();
  const ctx = fakeCtx();
  const bad = [undefined, null, 5, 'x', {}, state({ depth: NaN, strain01: Infinity, bucket: null, lanes: null }), state({ biomeId: 42 }), state({ time: -5, speed: 'a' }), state({ depth: 1e300 })];
  for (let i = 0; i < 100; i++) {
    const s = bad[i % bad.length];
    p.update([16, NaN, -4, 1e9][i % 4], s); p.drawBack(ctx, s); p.drawFront(ctx, s);
  }
  p.drawBack(null, state()); p.drawFront(undefined, state()); p.resize(NaN, -3, 'x'); p.setQuality(7); p.setReduceMotion(null);
  const dbg = p.debug();
  assert.ok(Number.isFinite(dbg.particles) && dbg.particles >= 0);
});

test('Reduce motion: no particles, no flicker, still draws light', () => {
  const p = make({ reduceMotion: true });
  const ctx = fakeCtx();
  frames(p, ctx, 300);
  assert.equal(p.debug().particles, 0);
  assert.ok(ctx.calls.drawImage > 0 || ctx.calls.fill > 0, 'static light still drawn');
});

test('Quality low: only blend and a still lantern', () => {
  const p = make({ quality: 'low' });
  const ctx = fakeCtx();
  frames(p, ctx, 300, (i) => state({ depth: 90, biomeId: 'clay', time: i * 16 }));
  const d = p.debug();
  assert.equal(d.particles, 0); assert.equal(d.strips, 0);
  assert.ok(ctx.calls.fillRect > 0, 'blend drawn');
});

test('switching to low or reduce motion clears particles at once', () => {
  const p = make();
  const ctx = fakeCtx();
  frames(p, ctx, 400);
  assert.ok(p.debug().particles > 0);
  p.setQuality('low');
  assert.equal(p.debug().particles, 0);
  p.setQuality('high'); frames(p, ctx, 400); assert.ok(p.debug().particles > 0);
  p.setReduceMotion(true);
  assert.equal(p.debug().particles, 0);
});

test('particle cap holds in every biome and deep', () => {
  assert.ok(AMBIENCE_CAP <= POLISH_CAP);
  for (const id of ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss']) {
    const p = make();
    const ctx = fakeCtx();
    let max = 0;
    for (let i = 0; i < 2000; i++) { const s = state({ biomeId: id, depth: 5000, speed: 50, time: i * 16 }); p.update(16, s); p.drawBack(ctx, s); max = Math.max(max, p.debug().particles); }
    assert.ok(max <= AMBIENCE_CAP, id + ' reached ' + max);
    assert.ok(max > 0, id + ' made none');
  }
});

test('no pool growth over 10,000 updates', () => {
  const p = make();
  const ctx = fakeCtx();
  let max = 0, lastStrips = 0;
  for (let i = 0; i < 10000; i++) {
    const s = state({ biomeId: ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss'][Math.floor(i / 500) % 6], depth: i * 0.2, time: i * 16 });
    p.update(16, s); if (i % 4 === 0) { p.drawBack(ctx, s); p.drawFront(ctx, s); }
    const d = p.debug(); max = Math.max(max, d.particles); lastStrips = d.strips;
  }
  assert.ok(max <= AMBIENCE_CAP);
  assert.ok(lastStrips <= 6);
});

test('resize rebuilds strips and keeps working', () => {
  const p = make();
  const ctx = fakeCtx();
  frames(p, ctx, 50);
  p.resize(430, 932, 1); frames(p, ctx, 50); p.resize(480, 900, 2); frames(p, ctx, 50);
  assert.ok(p.debug().strips <= 6);
});

test('destroyed polish does nothing and never throws', () => {
  const p = make();
  p.destroy();
  const ctx = fakeCtx();
  p.update(16, state()); p.drawBack(ctx, state()); p.drawFront(ctx, state());
  assert.equal(ctx.calls.drawImage || 0, 0);
});

test('works with no offscreen canvas available', () => {
  const p = createPolish({ makeCanvas: () => null });
  p.resize(360, 640, 1);
  const ctx = fakeCtx();
  frames(p, ctx, 100);
  assert.equal(p.debug().strips, 0);
});

test('biome blend never jumps: 0 before the window, smooth, 1 at the edge', () => {
  for (let i = 0; i < BIOME_EDGES.length; i++) {
    const ids = ['clay', 'quartz', 'amber', 'magma', 'void'];
    const edge = BIOME_EDGES[i];
    assert.equal(blendInfo(ids[i], edge - 16).t, 0);
    assert.equal(blendInfo(ids[i], edge).t, 1);
    let prev = 0;
    for (let d = edge - 15; d <= edge; d += 0.25) { const t = blendInfo(ids[i], d).t; assert.ok(t >= prev && t - prev < 0.08, 'step too big at ' + d); prev = t; }
    assert.equal(blendInfo(ids[i], edge).to, ['quartz', 'amber', 'magma', 'void', 'abyss'][i]);
  }
  assert.equal(blendInfo('abyss', 5000).t, 0);
  assert.equal(blendInfo('nope', 90).to, null);
  assert.equal(blendInfo('clay', NaN).t, 0);
});

test('blend draws nothing far from an edge and something inside the window', () => {
  const p = make();
  const far = fakeCtx(), near = fakeCtx();
  p.drawBack(far, state({ biomeId: 'clay', depth: 20 }));
  p.drawBack(near, state({ biomeId: 'clay', depth: 95 }));
  assert.ok((near.calls.fillRect || 0) > (far.calls.fillRect || 0));
});
