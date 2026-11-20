import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun, createRun, stepBeat, chooseBoon, useSkill, playView, validateEvent } from '../src/engine/index.js';

const RIG = { cols: 4, rows: 3, cells: [['hook', 'hook', 'magnet', 'hook'], ['splitter', 'echo', 'plate', null], [null, null, null, null]] };
const STRONG = { maxStrain: 300, strainMult: 0.35 };
const sim = (seed, extra = {}) => simulateRun({ rig: RIG, mods: STRONG, seed, play: {}, withEvents: true, maxBeats: 1500, ...extra });

test('without the play option nothing changes and no new events appear', () => {
  const r = simulateRun({ rig: RIG, mods: STRONG, seed: 5, withEvents: true, maxBeats: 600 });
  assert.ok(!r.events.some((e) => /BOON|ABILITY|ENCOUNTER|GUARDIAN|RELIC_FOUND/.test(e.t)));
  assert.equal(createRun({ rig: RIG, seed: 1 }).play, null);
});

test('same seed, rig and mods give the same events with the play layer on', () => {
  assert.equal(JSON.stringify(sim(7).events), JSON.stringify(sim(7).events));
  assert.notEqual(JSON.stringify(sim(7).events), JSON.stringify(sim(8).events));
});

test('every new event passes the schema check', () => {
  for (const seed of [1, 2, 3]) for (const e of sim(seed).events) assert.equal(validateEvent(e), null, e.t);
});

test('a boon offer pauses the drop until a boon is chosen', () => {
  const run = createRun({ rig: RIG, mods: STRONG, seed: 3, play: { firstOfferDepth: 5 } });
  let offer = null, guard = 0;
  while (!offer && guard++ < 200) offer = stepBeat(run).find((e) => e.t === 'BOON_OFFER');
  assert.ok(offer && offer.options.length === 3);
  assert.equal(run.state.status, 'choosing');
  assert.deepEqual(stepBeat(run), []);                       // paused: no beats while choosing
  const before = run.state.beat;
  assert.deepEqual(chooseBoon(run, 'not-a-card'), []);       // junk id changes nothing
  const evs = chooseBoon(run, offer.options[0].id);
  assert.ok(evs.some((e) => e.t === 'BOON_PICK'));
  assert.equal(run.state.status, 'running'); assert.equal(run.state.beat, before);
  assert.equal(playView(run).boons.length, 1);
  assert.deepEqual(chooseBoon(run, offer.options[1].id), []); // a second pick does nothing
});

test('timeout pick (null) takes the middle card', () => {
  const run = createRun({ rig: RIG, mods: STRONG, seed: 4, play: { firstOfferDepth: 5 } });
  let offer = null, guard = 0;
  while (!offer && guard++ < 200) offer = stepBeat(run).find((e) => e.t === 'BOON_OFFER');
  const pick = chooseBoon(run, null).find((e) => e.t === 'BOON_PICK');
  assert.equal(pick.id, offer.options[offer.mid].id); assert.equal(pick.auto, true);
});

test('Brace eases the rope and has a cooldown; bad ids do nothing', () => {
  const run = createRun({ rig: RIG, mods: STRONG, seed: 2, play: {} });
  for (let i = 0; i < 30; i++) stepBeat(run);
  const s0 = run.state.strain, e = useSkill(run, 'brace');
  assert.ok(e.some((x) => x.t === 'ABILITY' && x.phase === 'used'));
  assert.ok(run.state.strain < s0);
  assert.deepEqual(useSkill(run, 'brace'), []);              // no charge left
  assert.deepEqual(useSkill(run, 'nope'), []);
  assert.deepEqual(useSkill({}, 'brace'), []);
});

test('a guardian appears, can be hit, and never snaps the rope in one step', () => {
  let met = 0;
  for (const seed of [3, 4, 9]) {
    const r = sim(seed);
    let prev = 0;
    for (const e of r.events) if (e.t === 'STRAIN') { if (prev < 0.8 * e.max) assert.ok(e.value <= 0.97 * e.max + 1e-6 || e.delta <= 0, 'one step jump'); prev = e.value; }
    if (r.events.some((e) => e.t === 'GUARDIAN_START')) met++;
  }
  assert.ok(met >= 1);
});

test('fuzz: no NaN, always ends, across many seeds and rigs', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const r = simulateRun({ rig: seed % 2 ? RIG : { cols: 5, rows: 3, cells: [['net', 'hook', null, 'hook', 'magnet'], [null, 'amplifier', 'plate', null, null], [null, null, null, null, null]] },
      mods: { maxStrain: 200 + (seed % 5) * 60, strainMult: 0.3 + (seed % 4) * 0.1 }, seed, play: {}, maxBeats: 900 });
    assert.ok(Number.isFinite(r.depth) && Number.isFinite(r.gold) && Number.isFinite(r.strain), 'seed ' + seed);
    assert.ok(['hauled', 'snapped'].includes(r.outcome), 'seed ' + seed + ' ' + r.outcome);
  }
});
