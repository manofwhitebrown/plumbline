import test from 'node:test';
import assert from 'node:assert/strict';
import { firstHourOptions, startOptions } from '../src/engine/play/firstHour.js';
import { createRun, stepBeat, chooseBoon } from '../src/engine/index.js';

const RIG = { cols: 4, rows: 3, cells: [['hook', 'hook', 'magnet', 'hook'], [null, null, null, null], [null, null, null, null]] };

test('the script gets less calm as drops are finished', () => {
  assert.equal(firstHourOptions(1).encounters, false);
  assert.equal(firstHourOptions(1).firstOfferDepth, 30);
  assert.equal(firstHourOptions(2).firstOfferDepth, 40);
  assert.equal(firstHourOptions(5).encounters, undefined);
  assert.equal(firstHourOptions(5).firstOfferDepth, 60);
  assert.deepEqual(firstHourOptions(9), {});
  assert.deepEqual(firstHourOptions('x'), {});
  assert.deepEqual(firstHourOptions(0), {});
});

test('mercy adds on top of the script', () => {
  const o = startOptions(2, 3);
  assert.equal(o.freeBrace, 1); assert.equal(o.firstOfferDepth, 40);
  assert.deepEqual(startOptions(20, 0), {});
});

test('the first real drop gets its early pick and no surprise before 30 m', () => {
  const run = createRun({ rig: RIG, mods: { maxStrain: 300, strainMult: 0.4 }, seed: 9, play: startOptions(1, 0) });
  let offerAt = -1, enc = false;
  for (let i = 0; i < 80 && run.state.status !== 'snapped'; i++) {
    for (const e of stepBeat(run)) { if (e.t === 'BOON_OFFER' && offerAt < 0) offerAt = run.state.depth; if (/ENCOUNTER_WARN|GUARDIAN_WARN/.test(e.t)) enc = true; }
    if (run.state.status === 'choosing') chooseBoon(run, null);
  }
  assert.ok(offerAt >= 30 && offerAt <= 33, 'offer at ' + offerAt);
  assert.equal(enc, false);
});
