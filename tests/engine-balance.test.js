import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun, createRun, stepBeat } from '../src/engine/index.js';
import { fakeDeps, STARTER, rigOf } from './engine-fakes.js';

const N = 1000;
const haul80 = ({ run }) => (run.state.strain >= 0.8 * run.state.maxStrain ? 'haul' : 'continue');
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)];

test('balance: starter rig numbers (evidence printed)', () => {
  const snapDepth = [], haulGold = [], haulDepth = [], greedyGold = [];
  for (let s = 1; s <= N; s++) {
    const a = simulateRun({ rig: STARTER, mods: {}, seed: s, deps: fakeDeps });
    snapDepth.push(a.depth); greedyGold.push(a.gold);
    assert.equal(a.outcome, 'snapped');
    const b = simulateRun({ rig: STARTER, mods: {}, seed: s, deps: fakeDeps, policy: haul80 });
    haulGold.push(b.gold); haulDepth.push(b.depth);
  }
  console.log('  never haul : snaps at ' + mean(snapDepth).toFixed(1) + ' m (10%..90%: ' + pct(snapDepth, 0.1).toFixed(0) + '..' + pct(snapDepth, 0.9).toFixed(0) + '), gold before snap ' + mean(greedyGold).toFixed(1));
  console.log('  haul at 80%: gold ' + mean(haulGold).toFixed(1) + ' (10%..90%: ' + pct(haulGold, 0.1) + '..' + pct(haulGold, 0.9) + '), depth ' + mean(haulDepth).toFixed(1) + ' m');
  assert.ok(mean(snapDepth) >= 60 && mean(snapDepth) <= 120, 'greedy snap depth');
  assert.ok(pct(snapDepth, 0.1) >= 50 && pct(snapDepth, 0.9) <= 140, 'greedy spread');
  assert.ok(mean(haulGold) >= 40 && mean(haulGold) <= 150, 'haul at 80% gold');
  assert.ok(pct(haulGold, 0.1) >= 25 && pct(haulGold, 0.9) <= 220, 'haul spread');
});

test('balance: a better rig earns more than the starter rig', () => {
  const better = rigOf([['.', '.', '.', '.'], ['.', 'polisher', '.', '.'], ['hook', 'polisher', 'hook', '.']]);
  let a = 0, b = 0;
  for (let s = 1; s <= 300; s++) {
    a += simulateRun({ rig: STARTER, mods: {}, seed: s, deps: fakeDeps, policy: haul80 }).gold;
    b += simulateRun({ rig: better, mods: {}, seed: s, deps: fakeDeps, policy: haul80 }).gold;
  }
  assert.ok(b > a * 1.5);
});

test('no bad numbers in 20000 quick runs with several mods', () => {
  for (let s = 1; s <= 20000; s++) {
    const r = simulateRun({ rig: STARTER, mods: { luck: (s % 10) / 10, goldMult: 1 + (s % 7) }, seed: s, deps: fakeDeps, maxBeats: 150 });
    if (!(Number.isFinite(r.gold) && r.gold >= 0 && Number.isFinite(r.strain) && r.strain >= 0 && Number.isFinite(r.depth))) assert.fail('bad number at seed ' + s);
  }
});

test('speed: a 300-beat run with events is quick, headless runs are fast', () => {
  // Wall-clock test: take the BEST of several samples so a busy machine cannot fail it (flaky before).
  const cheat = { noSnap: true };
  let perRun = Infinity;
  for (let k = 0; k < 5; k++) {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) { const run = createRun({ rig: STARTER, mods: { cheat }, seed: i, deps: fakeDeps }); for (let b = 0; b < 300; b++) stepBeat(run); }
    perRun = Math.min(perRun, (performance.now() - t0) / 20);
  }
  let perSec = 0;
  for (let k = 0; k < 3; k++) {
    const t1 = performance.now();
    for (let s = 1; s <= 1000; s++) simulateRun({ rig: STARTER, mods: {}, seed: s, deps: fakeDeps });
    perSec = Math.max(perSec, 1000 / ((performance.now() - t1) / 1000));
  }
  console.log('  300-beat run with events: ' + perRun.toFixed(2) + ' ms; headless: ' + Math.round(perSec) + ' runs/second');
  assert.ok(perRun < 25, 'one 300-beat run should take under 25 ms (best of 5)');
  assert.ok(perSec > 300, 'headless runs too slow (loose bound)');
});
