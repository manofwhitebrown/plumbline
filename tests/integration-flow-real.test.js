// The real engine, real meta, real save (in memory) and real run session working together.
// Only the loop is replaced by a manual one, so the test controls time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setDeps, resetDeps } from '../src/run/deps.js';
import { hardReset } from '../src/run/state.js';
import { _forget as forgetRecords } from '../src/run/records.js';
import { _forget as forgetRigs } from '../src/run/rigs.js';
import { makeLoop } from './run-helpers.js';
import { bus } from '../src/core/bus.js';
import * as saveMod from '../src/core/save.js';
import * as engine from '../src/engine/index.js';
import * as parts from '../src/engine/parts/index.js';
import { meta } from '../src/meta/index.js';
import { session } from '../src/run/session.js';
import * as runApi from '../src/run/index.js';
import { recover } from '../src/run/recover.js';
import { loadFixture } from '../src/cheats/fixtures.js';
import { fmt } from '../src/core/format.js';
import { tutorial } from '../src/tutorial/index.js';
import { ACHIEVEMENTS } from '../src/data/rewards.js';

let loop;
function setup(extra = {}) {
  saveMod.resetAll();
  resetDeps(); hardReset(); forgetRecords(); forgetRigs();
  loop = makeLoop();
  setDeps({ save: saveMod, meta, engine, getPart: parts.getPart, detectCombos: parts.detectCombos, createLoop: loop.createLoop, baseBeatMs: 450, ...extra });
  const seen = [];
  const offs = ['run:started', 'run:ended', 'run:recovered', 'rig:changed'].map((n) => bus.on(n, (p) => seen.push([n, p])));
  return { seen, count: (n) => seen.filter((x) => x[0] === n).length, off: () => offs.forEach((f) => f()) };
}

test('init hooks are safe to call twice (run, tutorial)', () => {
  assert.doesNotThrow(() => { runApi.init(); runApi.init(); tutorial.init(); tutorial.init(); });
  assert.equal(typeof tutorial.shouldStart(), 'boolean');
});

test('a haul pays exactly once: gold and shards match run:ended', () => {
  const t = setup();
  const g0 = meta.gold(), s0 = meta.shards();
  let achieved = 0;   // achievements pay their own shards; they are not part of the drop payment
  const offA = bus.on('achievement:unlocked', ({ id }) => { const a = ACHIEVEMENTS.find((x) => x.id === id); achieved += a ? a.shards : 0; });
  assert.equal(session.start().ok, true);
  loop.tick(40);
  assert.equal(session.haul().ok, true);
  assert.equal(t.count('run:ended'), 1);
  const e = t.seen.find((x) => x[0] === 'run:ended')[1];
  assert.equal(e.outcome, 'hauled');
  assert.equal(meta.gold() - g0, e.kept);
  offA();
  assert.equal(meta.shards() - s0 - achieved, e.shardsEarned, 'the drop paid its shards once');
  assert.ok(Array.isArray(e.rig && e.rig.cells), 'run:ended carries the rig');
  loop.tick(5);                       // nothing more happens after the end
  assert.equal(meta.gold() - g0, e.kept);
  t.off();
});

test('a snap pays exactly once', () => {
  // A rope that snaps at once, so the test does not depend on tuning or luck. [FINISH-3]
  const weak = { ...meta, getMods: () => ({ ...meta.getMods(), maxStrain: 10, strainMult: 100 }) };
  const t = setup({ meta: weak });
  const g0 = meta.gold();
  session.start();
  loop.tick(2000);
  assert.equal(t.count('run:ended'), 1);
  const e = t.seen.find((x) => x[0] === 'run:ended')[1];
  assert.equal(e.outcome, 'snapped');
  assert.equal(meta.gold() - g0, e.kept);
  t.off();
});

test('run:started carries the rig', () => {
  const t = setup();
  session.start(); 
  const s = t.seen.find((x) => x[0] === 'run:started')[1];
  assert.ok(s.rig && Array.isArray(s.rig.cells));
  session.abort();
  t.off();
});

test('crash in the middle of a drop: recover pays once, a second call pays nothing', () => {
  const t = setup();
  const g0 = meta.gold();
  session.start();
  loop.tick(35);                      // a checkpoint is written every 10 beats
  hardReset();                        // the page died: no finish ran
  const first = recover();
  assert.ok(first && first.outcome === 'snapped');
  const after = meta.gold();
  assert.equal(after - g0, first.kept);
  assert.equal(recover(), null);
  assert.equal(meta.gold(), after);
  assert.equal(t.count('run:recovered'), 1);
  t.off();
});

test('seed and safeUntilDepth: the first tutorial drop cannot snap before 40 m', () => {
  const t = setup();
  const mods = { ...meta.getMods(), maxStrain: 10, strainMult: 100 };   // a rope that would snap at once
  const rig = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, 'hook', null, null]] };
  const plain = engine.createRun({ rig, mods, seed: 7 });
  const safe = engine.createRun({ rig, mods, seed: 7, safeUntilDepth: 40 });
  let snappedPlain = false;
  for (let i = 0; i < 38; i++) { engine.stepBeat(plain); engine.stepBeat(safe); if (plain.state.status === 'snapped') snappedPlain = true; }
  assert.equal(snappedPlain, true, 'without the option the rope snaps early');
  assert.equal(safe.state.status, 'running', 'with the option it does not');
  assert.ok(safe.state.strain < safe.state.maxStrain);
  for (let i = 0; i < 200 && safe.state.status === 'running'; i++) engine.stepBeat(safe);
  assert.equal(safe.state.status, 'snapped', 'after 40 m the rope is normal again');
  // session.start accepts both options
  const r = session.start({ seed: 1234, safeUntilDepth: 40, tutorial: true });
  assert.equal(r.ok, true); assert.equal(r.seed, 1234);
  session.abort();
  t.off();
});

test('auto-haul: the session hauls at the chosen strain level', () => {
  const t = setup();
  setDeps({ meta: { ...meta, upgrades: { ...meta.upgrades, autoHaul: () => 30 } } });
  session.start();
  loop.tick(2000);
  const e = t.seen.find((x) => x[0] === 'run:ended')[1];
  assert.equal(e.outcome, 'hauled');
  assert.equal(t.count('run:ended'), 1);
  t.off();
});

test('Collapse: the saved rig is checked again', () => {
  const t = setup();
  const before = runApi.rigs.getRig();
  assert.ok(before.cells.flat().filter(Boolean).length <= 1);
  bus.emit('meta:collapsed', { coreDustGain: 0 });  // must not throw
  assert.ok(runApi.rigs.getRig().cells.length >= 3);
  t.off();
});

test('debugView and debugResults send no events and pay nothing', () => {
  const t = setup();
  const g0 = meta.gold();
  const v = session.debugView();
  const r = session.debugResults();
  const big = session.debugView({ extreme: true });
  assert.equal(v.combo, 7); assert.equal(big.combo, 99);
  assert.ok(r.kept > 0 && r.goals.length === 3);
  assert.equal(t.seen.filter((x) => x[0].startsWith('run:')).length, 0);
  assert.equal(meta.gold(), g0);
  t.off();
});

test('fixtures: empty, busy, extreme load into memory and the extreme one is full', () => {
  const t = setup();
  assert.equal(saveMod.storageKind(), 'memory');
  assert.equal(loadFixture('nope').ok, false);
  assert.equal(loadFixture('busy').ok, true);
  assert.ok(meta.gold() > 1000);
  assert.equal(loadFixture('extreme').ok, true);
  assert.equal(Object.keys(meta.ownedParts()).length, 26);
  const rig = runApi.rigs.getRig();
  assert.equal(rig.cols, 5); assert.equal(rig.rows, 4);
  assert.equal(rig.cells.flat().filter(Boolean).length, 20, 'the 5x4 bucket is full');
  assert.ok(meta.gold() > 9e35);
  assert.match(fmt(meta.gold()), /Dc$/);
  assert.equal(meta.stats.get().bestDepth, 99999);
  assert.equal(meta.achievements.list().every((a) => a.unlocked), true);
  assert.equal(meta.codex.list().every((e) => e.found), true);
  assert.equal(loadFixture('empty').ok, true);
  assert.equal(meta.gold(), 0);
  saveMod.resetAll();
  t.off();
});

test('real parts pay: a lone Hook hauled at 80% strain earns inside the balance target', () => {
  const rig = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, 'hook', null, null]] };
  let total = 0, runs = 0;
  for (let s = 1; s <= 40; s++) {
    const r = engine.simulateRun({ rig, mods: meta.getMods(), seed: s, policy: ({ run }) => (run.state.strain / run.state.maxStrain > 0.8 ? 'haul' : 'continue') });
    total += r.kept; runs++;
    assert.ok(Number.isFinite(r.gold) && r.gold >= 0);
  }
  const avg = total / runs;
  assert.ok(avg >= 30 && avg <= 200, 'average kept gold was ' + avg);
});

test('real parts: a better rig earns more than a lone Hook (same seeds)', () => {
  const one = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, 'hook', null, null]] };
  const more = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, 'polisher', 'polisher', null], ['hook', 'hook', 'hook', 'hook']] };
  const pol = ({ run }) => (run.state.strain / run.state.maxStrain > 0.8 ? 'haul' : 'continue');
  let a = 0, b = 0;
  for (let s = 1; s <= 30; s++) {
    a += engine.simulateRun({ rig: one, mods: meta.getMods(), seed: s, policy: pol }).gold;
    b += engine.simulateRun({ rig: more, mods: meta.getMods(), seed: s, policy: pol }).gold;
  }
  assert.ok(b > a * 1.5, 'four hooks and polishers should clearly beat one hook: ' + a + ' vs ' + b);
});

test('daily twist and spawn-rate fields reach the run', () => {
  const rig = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, null, null, null], [null, 'hook', null, null]] };
  const base = engine.createRun({ rig, mods: { ...meta.getMods() }, seed: 3 });
  const brittle = engine.createRun({ rig, mods: { ...meta.getMods(), twist: 'brittle_rope' }, seed: 3 });
  assert.ok(brittle.state.maxStrain < base.state.maxStrain, 'brittle_rope lowers max strain');
  const noHazards = engine.createRun({ rig, mods: { ...meta.getMods(), hazardRate: 0.0001 }, seed: 3 });
  let hit = 0, hit2 = 0;
  const run2 = engine.createRun({ rig, mods: { ...meta.getMods() }, seed: 3 });
  for (let i = 0; i < 60; i++) { for (const e of engine.stepBeat(noHazards)) if (e.t === 'HAZARD') hit++; for (const e of engine.stepBeat(run2)) if (e.t === 'HAZARD') hit2++; }
  assert.ok(hit < hit2, 'hazardRate lowers the number of dangers: ' + hit + ' vs ' + hit2);
});

test('no NaN or negative numbers with the biggest rig over many runs', () => {
  loadFixture('extreme');
  const rig = runApi.rigs.getRig();
  for (let s = 1; s <= 25; s++) {
    const r = engine.simulateRun({ rig, mods: meta.getMods(), seed: s });
    for (const k of ['gold', 'kept', 'depth', 'strain']) assert.ok(Number.isFinite(r[k]) && r[k] >= 0, k + ' was ' + r[k]);
  }
  saveMod.resetAll();
});

test('whole journey: new save, tutorial drop, results, Workshop, Crew, welcome back, Collapse, drop again', async () => {
  const { s: metaSlice } = await import('../src/meta/state.js');
  const offlineMod = await import('../src/meta/offline.js');
  const t = setup();
  // 1. a brand new save starts the tutorial
  assert.equal(tutorial.shouldStart(), true);
  // 2. the first drop uses the tutorial options (fixed seed, safe start)
  const opts = tutorial.runOptions();
  const r1 = session.start(opts ? { ...opts } : {});
  assert.equal(r1.ok, true);
  loop.tick(25);
  assert.equal(session.getView().status, 'running');
  assert.equal(session.haul().ok, true);
  // 3. results are ready and the gold was paid once
  const res = session.getResult();
  assert.ok(res && res.outcome === 'hauled' && res.kept >= 0);
  assert.equal(t.count('run:ended'), 1);
  // 4. Workshop: buy a part
  meta.addGold(1e7);
  const id = parts.allParts().map((p) => p.id).find((pid) => pid !== 'hook' && meta.canBuyPart(pid));
  assert.ok(id, 'there is a part the player can buy');
  const g1 = meta.gold();
  assert.equal(meta.buyPart(id).ok, true);
  assert.ok(meta.gold() < g1);
  assert.ok(meta.ownedParts()[id] >= 1);
  // 5. Crew: hire and earn per second
  const crewId = meta.crew.list()[0].id;
  assert.equal(meta.crew.buy(crewId).ok, true);
  assert.ok(meta.crew.perSecond() > 0);
  // 6. Welcome back: gold waits and is paid once
  offlineMod.skip(3 * 3600 * 1000);
  const away = meta.offline.peek();
  assert.ok(away && away.gold > 0);
  const gA = meta.gold();
  assert.equal(meta.offline.claim().ok, true);
  assert.ok(meta.gold() > gA);
  assert.equal(meta.offline.claim().ok, false, 'a second claim pays nothing');
  // 7. Collapse
  const st = metaSlice();
  st.bestDepth = 5000; st.goldThisCollapse = 1e12; st.gold = 1e12;
  assert.equal(meta.collapse.available(), true);
  const c = meta.collapse.do();
  assert.equal(c.ok, true);
  assert.ok(meta.coreDust() > 0);
  assert.deepEqual(Object.keys(meta.ownedParts()), ['hook']);
  assert.ok(runApi.rigs.getRig().cells.flat().filter(Boolean).every((p) => p === 'hook'));
  // 8. the player can drop again
  assert.equal(session.start().ok, true);
  loop.tick(10);
  session.abort();
  t.off();
  saveMod.resetAll();
});
