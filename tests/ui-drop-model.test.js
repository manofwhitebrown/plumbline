import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hudModel, goldDelta, popText, haulSubline, goalPills } from '../src/ui/logic/dropModel.js';
import { createHaulLock } from '../src/ui/logic/haulLock.js';

test('hud model reads a normal view', () => {
  const m = hudModel({ depth: 412, gold: 1234, strain: 80, maxStrain: 100, combo: 3, status: 'running',
    biome: { name: 'Quartz' }, risk: { goldAtRisk: 1200 }, goals: [{ text: 'Reach 150 m', progress01: 0.4 }] });
  assert.equal(m.depthText, '412 m');
  assert.equal(m.goldText, '1.2K');
  assert.equal(m.biomeName, 'Quartz');
  assert.equal(m.level, 2);
  assert.equal(m.pulse, true);
  assert.equal(m.shake, false);
  assert.equal(m.haulSub, 'Keep it all · at risk 1.2K');
  assert.equal(m.comboShow, true);
  assert.equal(m.running, true);
});

test('hud model never throws and never prints bad numbers', () => {
  for (const bad of [null, undefined, 5, 'x', [], {}, { depth: NaN, gold: Infinity, strain: -4, maxStrain: 0, combo: 'a', risk: 3, goals: 7 }]) {
    const m = hudModel(bad);
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(m)), JSON.stringify(m));
    assert.ok(m.strain01 >= 0 && m.strain01 <= 1);
    assert.equal(m.running, false);
  }
});

test('danger levels drive pulse, shake and edge', () => {
  assert.deepEqual([hudModel({ strain: 10, maxStrain: 100 }).level, hudModel({ strain: 60, maxStrain: 100 }).level], [0, 1]);
  const d3 = hudModel({ strain: 95, maxStrain: 100 });
  assert.equal(d3.level, 3);
  assert.equal(d3.shake, true);
  assert.equal(d3.edge, 2);
  assert.equal(hudModel({ strain: 76, maxStrain: 100 }).edge, 1);
  assert.equal(hudModel({ strain: 30, maxStrain: 100 }).edge, 0);
});

test('extreme numbers stay short', () => {
  const m = hudModel({ depth: 99999, gold: 1e300, combo: 99, strain: 1, maxStrain: 100 });
  assert.ok(m.goldText.length <= 8);
  assert.ok(m.depthText.length <= 10);
  assert.equal(m.comboText, 'x99');
});

test('haul subline', () => {
  assert.equal(haulSubline({ goldAtRisk: 0 }), 'Keep it all');
  assert.equal(haulSubline(null), 'Keep it all');
  assert.equal(haulSubline({ goldAtRisk: 15 }), 'Keep it all · at risk 15');
});

test('goal pills: three at most, text cut, done is full', () => {
  const goals = [
    { text: 'A'.repeat(50), progress01: 2 },
    { text: 'B', done: true, progress01: 0 },
    null,
    { text: 'C', progress01: -1 },
    { text: 'D' },
  ];
  const p = goalPills(goals);
  assert.equal(p.length, 3);
  assert.ok(p[0].text.length <= 28);
  assert.equal(p[0].progress01, 1);
  assert.equal(p[1].progress01, 1);
  assert.equal(p[2].progress01, 0);
  assert.deepEqual(goalPills('nope'), []);
});

test('gold pops only for real gains', () => {
  assert.equal(goldDelta(10, 25), 15);
  assert.equal(goldDelta(25, 10), 0);
  assert.equal(goldDelta(NaN, 5), 5);
  assert.equal(goldDelta(5, Infinity), 0);
  assert.equal(popText(1500), '+1.5K');
  assert.equal(popText(NaN), '+0');
});

test('haul lock fires once, even when spammed', () => {
  let n = 0;
  const lock = createHaulLock(() => { n++; return { ok: true }; });
  for (let i = 0; i < 50; i++) lock.press();
  assert.equal(n, 1);
  assert.equal(lock.isLocked(), true);
  lock.reset();
  lock.press();
  assert.equal(n, 2);
});

test('haul lock opens again when nothing was hauled, and never throws', () => {
  let n = 0;
  const lock = createHaulLock(() => { n++; return { ok: false }; });
  lock.press(); lock.press();
  assert.equal(n, 2);
  const boom = createHaulLock(() => { throw new Error('x'); });
  assert.doesNotThrow(() => boom.press());
  assert.doesNotThrow(() => createHaulLock().press());
});
