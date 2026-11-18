import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/core/rng.js';
import { createRun, stepBeat, haul, peekNext, riskInfo, simulateRun, validateEvent, replayText } from '../src/engine/index.js';
import { snapPayout, itemGold, comboMult, depthBonus } from '../src/engine/gold.js';
import { fakeDeps, rigOf, STARTER, randomRig } from './engine-fakes.js';

const runAll = (rig, mods, seed, policy) => simulateRun({ rig, mods, seed, policy, deps: fakeDeps, withEvents: true });

test('same seed twice gives identical event lists (200 random rigs)', () => {
  const rng = makeRng(7);
  for (let i = 0; i < 200; i++) {
    const rig = randomRig(rng);
    const a = runAll(rig, {}, i + 1), b = runAll(rig, {}, i + 1);
    assert.deepEqual(a.events, b.events);
  }
});

test('different seeds give different runs', () => {
  const a = runAll(STARTER, {}, 1), b = runAll(STARTER, {}, 2);
  assert.notDeepEqual(a.events, b.events);
});

test('property: 5000 random runs stay finite, depth rises, status is final', () => {
  const rng = makeRng(99);
  for (let i = 0; i < 5000; i++) {
    const rig = randomRig(rng);
    const mods = { luck: rng.next(), strainMult: 0.2 + rng.next() * 2, goldMult: 1 + rng.int(0, 50) };
    const run = createRun({ rig, mods, seed: i, deps: fakeDeps });
    let last = run.state.depth, ended = null;
    for (let b = 0; b < 400 && run.state.status === 'running'; b++) {
      stepBeat(run);
      const s = run.state;
      assert.ok(Number.isFinite(s.gold) && s.gold >= 0 && Number.isFinite(s.strain) && s.strain >= 0 && Number.isFinite(s.depth));
      assert.ok(s.depth > last);
      last = s.depth;
      if (s.status !== 'running') ended = s.status;
    }
    if (ended) { assert.deepEqual(stepBeat(run), []); assert.equal(run.state.status, ended); assert.deepEqual(haul(run), []); }
  }
});

test('every event passes validation', () => {
  const rng = makeRng(5);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const res = runAll(randomRig(rng), {}, i);
    for (const e of res.events) { assert.equal(validateEvent(e), null, JSON.stringify(e)); seen.add(e.t); }
  }
  for (const t of ['RUN_START', 'BEAT', 'SPAWN', 'FIRE', 'CHAIN', 'COLLECT', 'MISS', 'HAZARD', 'STRAIN', 'SNAP']) assert.ok(seen.has(t), 'saw ' + t);
  assert.notEqual(validateEvent({ t: 'COLLECT' }), null);
  assert.notEqual(validateEvent({ t: 'NOPE' }), null);
});

test('gold and snap math for fixed examples', () => {
  assert.equal(comboMult(1), 1);
  assert.ok(Math.abs(comboMult(3) - 1.2) < 1e-9);
  assert.equal(comboMult(50), 2);
  assert.equal(depthBonus(100), 1.5);
  assert.equal(itemGold(3, 1, 1, 0), 3);
  assert.equal(itemGold(3, 3, 2, 100), Math.round(3 * 1.2 * 2 * 1.5));
  assert.equal(itemGold(0.0001, 1, 1, 0), 1);
  assert.deepEqual(snapPayout(1000, 0.3), { goldKept: 300, goldLost: 700 });
  assert.deepEqual(snapPayout(7, 0.3), { goldKept: 2, goldLost: 5 });
  assert.deepEqual(snapPayout(NaN, 0.3), { goldKept: 0, goldLost: 0 });
});

test('snap keeps keepOnSnap of gold; haul keeps all', () => {
  const run = createRun({ rig: STARTER, mods: { keepOnSnap: 0.5 }, seed: 3, deps: fakeDeps });
  let snap = null;
  while (run.state.status === 'running') for (const e of stepBeat(run)) if (e.t === 'SNAP') snap = e;
  assert.ok(snap);
  const g = Math.floor(run.state.gold);
  assert.equal(snap.goldKept, Math.floor(g * 0.5));
  assert.equal(snap.goldKept + snap.goldLost, g);
  const r2 = createRun({ rig: STARTER, mods: {}, seed: 3, deps: fakeDeps });
  for (let i = 0; i < 20; i++) stepBeat(r2);
  const h = haul(r2);
  assert.equal(h.length, 1);
  assert.equal(h[0].t, 'HAUL');
  assert.equal(h[0].gold, Math.floor(r2.state.gold));
  assert.equal(r2.state.status, 'hauled');
  assert.deepEqual(haul(r2), []);
});

test('peekNext does not change the real run', () => {
  const mk = () => createRun({ rig: STARTER, mods: {}, seed: 11, deps: fakeDeps });
  const a = mk(), b = mk();
  const evA = [], evB = [];
  for (let i = 0; i < 60; i++) {
    if (i % 3 === 0) peekNext(b, 5);
    evA.push(...stepBeat(a)); evB.push(...stepBeat(b));
  }
  assert.deepEqual(evA, evB);
  const run = mk();
  const peek = peekNext(run, 3);
  const real = [stepBeat(run), stepBeat(run), stepBeat(run)].map((evs) => evs.find((e) => e.t === 'SPAWN').lanes);
  assert.deepEqual(peek, real);
  assert.deepEqual(peekNext(run, -1), []);
  assert.equal(peekNext(run, 999).length, 16);
  assert.deepEqual(peekNext(null, 3), []);
});

test('riskInfo', () => {
  const run = createRun({ rig: STARTER, mods: { keepOnSnap: 0.3 }, seed: 2, deps: fakeDeps });
  assert.equal(riskInfo(run).beatsToSnap, 999);
  for (let i = 0; i < 30; i++) stepBeat(run);
  const r = riskInfo(run);
  assert.equal(r.keepIfSnap, Math.floor(run.state.gold * 0.3));
  assert.equal(r.goldAtRisk, Math.floor(run.state.gold) - r.keepIfSnap);
  assert.ok(r.beatsToSnap > 0 && r.beatsToSnap < 999);
  const cool = createRun({ rig: rigOf([['.', '.', '.', '.'], ['oilcan', 'oilcan', 'oilcan', 'oilcan'], ['oilcan', 'oilcan', 'oilcan', 'oilcan']]), mods: { strainMult: 0 }, seed: 1, deps: fakeDeps });
  for (let i = 0; i < 10; i++) stepBeat(cool);
  assert.equal(riskInfo(cool).beatsToSnap, 999);
  assert.deepEqual(riskInfo(null), { beatsToSnap: 999, goldAtRisk: 0, keepIfSnap: 0 });
});

test('milestones every 50 m and biome change', () => {
  const res = runAll(rigOf([['oilcan', 'oilcan', 'oilcan', 'oilcan'], ['oilcan', 'oilcan', 'oilcan', 'oilcan'], ['hook']]), { strainMult: 0.2 }, 4);
  const miles = res.events.filter((e) => e.t === 'MILESTONE').map((e) => e.depth);
  assert.deepEqual(miles.slice(0, 3), [50, 100, 150]);
  const biome = res.events.filter((e) => e.t === 'BIOME');
  assert.equal(biome[0].id, 'quartz');
  assert.ok(biome[0].depth >= 100 && biome[0].depth < 101.5);
});

test('empty, full, unknown ids, big rig, huge mods', () => {
  const empty = simulateRun({ rig: rigOf([[], [], []]), mods: {}, seed: 1, deps: fakeDeps });
  assert.equal(empty.gold, 0);
  assert.equal(empty.outcome, 'snapped');
  const full = simulateRun({ rig: rigOf([['hook', 'polisher', 'vacuum', 'splitter', 'plate'], ['hook', 'hook', 'hook', 'hook', 'hook'], ['plate', 'oilcan', 'metro', 'hook', 'hook'], ['hook', 'hook', 'hook', 'hook', 'hook']], 5), mods: {}, seed: 1, deps: fakeDeps });
  assert.ok(full.gold > 0);
  const unknown = simulateRun({ rig: rigOf([['zzz', 'nope'], [], ['hook']]), mods: {}, seed: 1, deps: fakeDeps });
  assert.ok(Number.isFinite(unknown.gold));
  const clamped = createRun({ rig: { cols: 99, rows: 99, cells: [] }, mods: {}, seed: 1, deps: fakeDeps });
  assert.equal(clamped.rig.cols, 5); assert.equal(clamped.rig.rows, 4);
  const small = createRun({ rig: { cols: 1, rows: 1 }, mods: {}, seed: 1, deps: fakeDeps });
  assert.equal(small.rig.cols, 4); assert.equal(small.rig.rows, 3);
  for (const rig of [null, undefined, 5, 'x', {}, { cells: 'bad' }]) assert.ok(stepBeat(createRun({ rig, mods: null, seed: undefined, deps: fakeDeps })).length > 0);
  const huge = { maxStrain: 1e300, keepOnSnap: 99, goldMult: Infinity, strainMult: -5, luck: 50, startDepth: 1e20, cols: NaN, rows: 'x' };
  const h = simulateRun({ rig: STARTER, mods: huge, seed: 1, deps: fakeDeps, maxBeats: 200 });
  assert.ok(Number.isFinite(h.gold) && Number.isFinite(h.depth) && h.gold >= 0);
  for (const bad of [{ maxStrain: NaN }, { maxStrain: -1 }, { goldMult: NaN }, { luck: NaN }, { keepOnSnap: -3 }]) {
    const r = simulateRun({ rig: STARTER, mods: bad, seed: 1, deps: fakeDeps, maxBeats: 300 });
    assert.ok(Number.isFinite(r.gold) && Number.isFinite(r.strain));
  }
});

test('a broken part is switched off, NaN from parts is cleaned', () => {
  const r = simulateRun({ rig: rigOf([[], [], ['boom', 'hook']]), mods: {}, seed: 1, deps: fakeDeps, maxBeats: 100 });
  assert.ok(Number.isFinite(r.gold));
  const n = simulateRun({ rig: rigOf([[], [], ['nanpart', 'nanpart']]), mods: {}, seed: 1, deps: fakeDeps, maxBeats: 100 });
  assert.ok(Number.isFinite(n.gold) && Number.isFinite(n.strain) && n.gold >= 0);
});

test('parts: chains, splitter, plate, passives', () => {
  const split = runAll(rigOf([['hook', '.', 'hook', '.'], ['.', '.', '.', '.'], ['.', 'splitter', '.', '.']]), {}, 8);
  assert.ok(split.events.some((e) => e.t === 'CHAIN'));
  assert.ok(split.stats.collected > 0);
  const plate = runAll(rigOf([['.', '.', '.', '.'], ['.', '.', '.', '.'], ['plate', 'plate', 'plate', 'plate']]), {}, 8);
  assert.ok(plate.events.some((e) => e.t === 'HAZARD' && e.absorbedBy));
  const bare = simulateRun({ rig: rigOf([[], [], []]), mods: {}, seed: 5, deps: fakeDeps });
  const rope = simulateRun({ rig: rigOf([[], [], ['rope']]), mods: {}, seed: 5, deps: fakeDeps });
  assert.ok(rope.beats > bare.beats);
  const drill = simulateRun({ rig: rigOf([[], [], ['drill']]), mods: {}, seed: 5, deps: fakeDeps, maxBeats: 5 });
  assert.equal(drill.depth, 10);
  const metro = runAll(rigOf([['.', '.', '.', '.'], ['.', '.', '.', '.'], ['metro', 'oilcan', '.', '.']]), {}, 2);
  assert.ok(metro.events.some((e) => e.t === 'CHAIN'));
});

test('cheats are off when mods.cheat is null and honoured when set', () => {
  const base = runAll(STARTER, { cheat: null }, 6), none = runAll(STARTER, {}, 6);
  assert.deepEqual(base.events, none.events);
  const noSnap = simulateRun({ rig: STARTER, mods: { cheat: { noSnap: true } }, seed: 6, deps: fakeDeps, maxBeats: 400 });
  assert.equal(noSnap.outcome, 'hauled');
  assert.ok(noSnap.strain <= 100 && noSnap.beats === 400);
  const frozen = simulateRun({ rig: STARTER, mods: { cheat: { freezeStrain: true } }, seed: 6, deps: fakeDeps, maxBeats: 200 });
  assert.equal(frozen.strain, 0);
  const fast = simulateRun({ rig: STARTER, mods: { cheat: { speedMult: 2, noSnap: true } }, seed: 6, deps: fakeDeps, maxBeats: 10 });
  assert.equal(fast.depth, 20);
  const biome = runAll(STARTER, { cheat: { forceBiome: 'magma' } }, 6);
  assert.ok(biome.events.filter((e) => e.t === 'BIOME').every((e) => e.id === 'magma') && biome.biomeId === 'magma');
  const g1 = simulateRun({ rig: STARTER, mods: { cheat: { noSnap: true } }, seed: 6, deps: fakeDeps, maxBeats: 50 });
  const g2 = simulateRun({ rig: STARTER, mods: { cheat: { noSnap: true, goldMult: 10 } }, seed: 6, deps: fakeDeps, maxBeats: 50 });
  assert.ok(g2.gold > g1.gold * 5);
  const junk = simulateRun({ rig: STARTER, mods: { cheat: { speedMult: NaN, goldMult: 'x', forceBiome: 5 } }, seed: 6, deps: fakeDeps, maxBeats: 20 });
  assert.ok(Number.isFinite(junk.gold));
});

test('replayText gives readable lines', () => {
  const t = replayText({ rig: STARTER, mods: {}, seed: 1, deps: fakeDeps, maxBeats: 3 });
  assert.match(t, /-- beat 1/);
  assert.match(t, /start seed 1/);
});

test('the real parts module is wired in and a hook earns gold', async () => {
  const { simulateRun: sim } = await import('../src/engine/index.js');
  const res = sim({ rig: rigOf([[], [], ['', 'hook']]), mods: {}, seed: 1, policy: ({ run }) => (run.state.strain > 60 ? 'haul' : 'continue') });
  assert.ok(Number.isFinite(res.gold));
  const { getProviders } = await import('../src/engine/registry.js');
  assert.ok(getProviders().getPart('hook'));
  assert.equal(getProviders().getPart('nope'), null);
});

test('emit() of FIRE does not double count and CHAIN is ignored', () => {
  const run = createRun({ rig: STARTER, mods: {}, seed: 1, deps: { getPart: () => null } });
  const out = [];
  run.out = out;
  run.ctx.enter(2, 1, 9);
  run.ctx.emit({ t: 'FIRE', r: 2, c: 1, partId: 'x' });
  run.ctx.emit({ t: 'CHAIN', from: { r: 0, c: 0 }, to: { r: 1, c: 1 } });
  run.ctx.emit(null);
  assert.equal(out.filter((e) => e.t === 'FIRE').length, 1);
  assert.equal(out.filter((e) => e.t === 'CHAIN').length, 0);
});
