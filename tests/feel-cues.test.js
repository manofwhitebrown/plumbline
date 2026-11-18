import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCues, LIMITS } from '../src/feel/cues.js';

const keys = ['tension', 'anticipation', 'danger', 'heartbeatHz', 'heartbeat', 'camX', 'camY', 'zoom', 'comboGlow', 'hitStopMs', 'timeScale'];
function bounded(c) {
  for (const k of keys) assert.ok(Number.isFinite(c[k]), k + ' not finite: ' + c[k]);
  assert.ok(c.tension >= 0 && c.tension <= 1); assert.ok(c.anticipation >= 0 && c.anticipation <= 1);
  assert.ok(c.danger >= 0 && c.danger <= 1); assert.ok(c.heartbeatHz >= 0 && c.heartbeatHz <= 3);
  assert.ok(c.heartbeat >= 0 && c.heartbeat <= 1); assert.ok(Math.abs(c.camX) <= 3 && Math.abs(c.camY) <= 3);
  assert.ok(c.zoom >= 1 && c.zoom <= 1 + LIMITS.zoomMax + 1e-9); assert.ok(c.comboGlow >= 0 && c.comboGlow <= 1);
  assert.ok(c.hitStopMs >= 0 && c.hitStopMs <= 80); assert.ok(c.timeScale >= 0.05 && c.timeScale <= 1);
}

test('all outputs are finite and bounded for hostile input', () => {
  const c = createCues();
  const bad = [null, undefined, 5, 'x', {}, { strain: NaN, maxStrain: 0 }, { strain: 1e300, maxStrain: 1 }, { strain: -50, maxStrain: 100, combo: Infinity }, { status: 'snapped' }];
  const evs = [null, 3, {}, { t: 'COLLECT' }, { t: 'COLLECT', item: { tier: NaN } }, { t: 'HAZARD', strainDelta: Infinity, lane: NaN }, { t: 'SNAP' }, { t: 'MILESTONE' }, { t: 'RUN_START' }];
  for (let i = 0; i < 200; i++) {
    c.push(evs[i % evs.length]);
    c.update([0, 16, -5, NaN, 1e9, 33][i % 6], bad[i % bad.length]);
    bounded(c);
  }
});

test('tension follows strain smoothly with no jump', () => {
  const c = createCues();
  c.update(16, { strain: 0, maxStrain: 100 });
  let prev = c.tension;
  for (let i = 0; i < 20; i++) { c.update(16, { strain: 100, maxStrain: 100 }); assert.ok(c.tension - prev < 0.2); assert.ok(c.tension >= prev); prev = c.tension; }
  for (let i = 0; i < 200; i++) c.update(16, { strain: 100, maxStrain: 100 });
  assert.ok(c.tension > 0.99);
});

test('anticipation builds only in the last 10 percent', () => {
  const c = createCues();
  for (let i = 0; i < 200; i++) c.update(16, { strain: 89, maxStrain: 100 });
  assert.ok(c.anticipation < 0.01);
  for (let i = 0; i < 200; i++) c.update(16, { strain: 99, maxStrain: 100 });
  assert.ok(c.anticipation > 0.8);
});

test('heartbeat is calm below 75 percent and fast near the limit', () => {
  const c = createCues();
  for (let i = 0; i < 60; i++) c.update(16, { strain: 50, maxStrain: 100 });
  assert.equal(c.heartbeatHz, 0); assert.equal(c.heartbeat, 0);
  c.update(16, { strain: 100, maxStrain: 100 });
  assert.ok(c.heartbeatHz >= 2.9);
  c.update(16, { strain: 76, maxStrain: 100 });
  assert.ok(c.heartbeatHz >= 1 && c.heartbeatHz < 1.2);
});

test('big collect gives a short hit-stop, with a gap between', () => {
  const c = createCues();
  c.push({ t: 'COLLECT', item: { tier: 5 } });
  c.update(16, {});
  assert.ok(c.hitStopMs > 0 && c.hitStopMs <= 80); assert.equal(c.timeScale, 0.05);
  for (let i = 0; i < 10; i++) c.update(16, {});
  assert.equal(c.hitStopMs, 0); assert.equal(c.timeScale, 1);
  c.push({ t: 'COLLECT', item: { tier: 5 } }); // too soon
  c.update(16, {});
  assert.equal(c.hitStopMs, 0);
  c.push({ t: 'COLLECT', item: { tier: 1 } }); c.update(16, {});
  assert.equal(c.hitStopMs, 0);
});

test('Reduce motion switches shake, zoom, hit-stop and heartbeat off', () => {
  const c = createCues({ reduceMotion: true });
  c.push({ t: 'HAZARD', strainDelta: 5, lane: 1 }); c.push({ t: 'SNAP' }); c.push({ t: 'COLLECT', item: { tier: 6 } }); c.push({ t: 'MILESTONE' });
  c.update(16, { strain: 100, maxStrain: 100 });
  assert.equal(c.camX, 0); assert.equal(c.camY, 0); assert.equal(c.zoom, 1); assert.equal(c.hitStopMs, 0); assert.equal(c.heartbeatHz, 0);
  assert.ok(c.tension > 0); // calm values still follow
});

test('camera nudge decays back to zero', () => {
  const c = createCues();
  c.push({ t: 'HAZARD', strainDelta: 5, lane: 0 }); c.update(16, {});
  assert.ok(Math.abs(c.camX) > 0.1);
  for (let i = 0; i < 100; i++) c.update(16, {});
  assert.ok(Math.abs(c.camX) < 0.01);
});

test('frame-rate independent decay', () => {
  const at = (step) => { const c = createCues(); c.push({ t: 'HAZARD', strainDelta: 5, lane: 0 }); for (let t = 0; t < 200; t += step) c.update(step, {}); return Math.abs(c.camX); };
  assert.ok(Math.abs(at(33) - at(7)) < 0.15);
});

test('RUN_START resets', () => {
  const c = createCues();
  for (let i = 0; i < 100; i++) c.update(16, { strain: 100, maxStrain: 100, combo: 30 });
  c.push({ t: 'RUN_START' });
  assert.equal(c.tension, 0); assert.equal(c.comboGlow, 0);
});
