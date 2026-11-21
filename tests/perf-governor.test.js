import test from 'node:test';
import assert from 'node:assert/strict';
import { createGovernor, TIERS, GOV } from '../src/render/governor.js';

const run = (g, ms, n) => { for (let i = 0; i < n; i++) g.sample(ms); };

test('governor: steady 60 fps never leaves high', () => {
  const g = createGovernor(); run(g, 16.7, 6000); assert.equal(g.step, 0);
});
test('governor: slow frames step down one tier per slow window, down to minimal and no further', () => {
  const seen = []; const g = createGovernor({ onChange: (s, t) => seen.push(t.name) });
  run(g, 33, GOV.window); assert.equal(g.step, 1);
  run(g, 33, GOV.window); assert.equal(g.step, 2);
  run(g, 33, GOV.window * 5); assert.equal(g.step, TIERS.length - 1);
  assert.deepEqual(seen, ['medium', 'reduced', 'minimal']);
});
test('governor: a short spike or a hidden tab does not count', () => {
  const g = createGovernor(); run(g, 16, 100); run(g, 60, 3); run(g, 16, 100); g.sample(5000); g.sample(900); assert.equal(g.step, 0);
});
test('governor: goes back up only after a long calm time, one tier at a time', () => {
  const g = createGovernor(); run(g, 33, GOV.window * 2); assert.equal(g.step, 2);
  run(g, 16.7, Math.floor((GOV.upWaitMs - 500) / 16.7)); assert.equal(g.step, 2, 'not yet');
  run(g, 16.7, 60); assert.equal(g.step, 1);
  run(g, 16.7, Math.ceil(GOV.upWaitMs / 16.7) + 5); assert.equal(g.step, 0);
});
test('governor: a raise that fails doubles the wait, and a safe raise resets it', () => {
  const g = createGovernor(); run(g, 33, GOV.window); assert.equal(g.step, 1);
  run(g, 16.7, Math.ceil(GOV.upWaitMs / 16.7) + 5); assert.equal(g.step, 0);
  run(g, 33, GOV.window); assert.equal(g.step, 1); assert.equal(g.upWait, GOV.upWaitMs * 2);
  run(g, 16.7, Math.ceil(GOV.upWaitMs / 16.7) + 5); assert.equal(g.step, 1, 'waits twice as long now');
  run(g, 16.7, Math.ceil(GOV.upWaitMs / 16.7) + 5); assert.equal(g.step, 0);
  run(g, 16.7, Math.ceil(GOV.probationMs / 16.7) + 5); assert.equal(g.upWait, GOV.upWaitMs);
  let ups = 0; const h = createGovernor({ onChange: (s) => { if (s === 0) ups++; } }); // an always-slow phone does not flicker
  for (let t = 0; t < 600; t++) { run(h, 33, 30); } assert.ok(ups <= 1);
});
test('governor: hand-picked quality switches it off; junk input is ignored', () => {
  const g = createGovernor(); run(g, 33, GOV.window * 2); g.setEnabled(false); assert.equal(g.step, 0); run(g, 50, 500); assert.equal(g.step, 0);
  g.setEnabled(true); for (const v of [NaN, -3, 0, undefined, Infinity, 'x']) g.sample(v); assert.equal(g.step, 0);
});
test('governor: tiers only ever remove work as they go down', () => {
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(TIERS[i].particles < TIERS[i - 1].particles);
    assert.ok(!TIERS[i].bake || TIERS[i - 1].bake, 'baking never comes back lower down');
  }
  assert.equal(TIERS[0].depth, 'high'); assert.equal(TIERS[0].particles, 1); assert.equal(TIERS[0].bake, true);
});

test('governor: a very slow phone steps down fast (6 very slow frames in a row), a lone spike does not', () => {
  const g = createGovernor(); run(g, 100, GOV.fastRun); assert.equal(g.step, 1);
  run(g, 100, GOV.fastRun); assert.equal(g.step, 2);
  const h = createGovernor(); for (let k = 0; k < 4; k++) { run(h, 16, 60); h.sample(120); } run(h, 16, 60); assert.equal(h.step, 0, 'single spikes spaced apart do nothing');
});
