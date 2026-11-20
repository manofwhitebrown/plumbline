import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepBeat, peekNext, chooseBoon } from '../src/engine/index.js';
import { nextSnapStreak, mercyOptions } from '../src/engine/play/mercy.js';
import { FAIRNESS } from '../src/data/play.js';

const RIG = { cols: 4, rows: 3, cells: [['hook', 'hook', 'magnet', 'hook'], [null, null, null, null], [null, null, null, null]] };
const STRONG = { maxStrain: 400, strainMult: 0.3 };

test('early on, no column gets a third danger in a row', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const run = createRun({ rig: RIG, mods: STRONG, seed, play: { encounters: false, guardians: false } });
    const streak = [0, 0, 0, 0];
    let guard = 0;
    while (run.state.depth < FAIRNESS.streakUntilDepth - 5 && run.state.status !== 'snapped' && guard++ < 900) {
      const evs = stepBeat(run);
      for (const e of evs) if (e.t === 'SPAWN') {
        e.lanes.forEach((it, l) => { streak[l] = it.kind === 'hazard' ? streak[l] + 1 : 0; assert.ok(streak[l] <= FAIRNESS.maxDangerStreak, `seed ${seed} lane ${l}`); });
      }
      if (run.state.status === 'choosing') chooseBoon(run, null);
    }
  }
});

test('peeking ahead never changes the drop', () => {
  const a = createRun({ rig: RIG, mods: STRONG, seed: 11, play: {} });
  const b = createRun({ rig: RIG, mods: STRONG, seed: 11, play: {} });
  const out = (r) => { const ev = []; for (let i = 0; i < 40 && r.state.status === 'running'; i++) ev.push(...stepBeat(r)); return JSON.stringify(ev); };
  for (let i = 0; i < 5; i++) { peekNext(a, 3); stepBeat(a); stepBeat(b); }
  assert.equal(out(a), out(b));
});

test('snaps in a row: a haul starts over, three snaps earn mercy', () => {
  assert.equal(nextSnapStreak(0, 'snapped'), 1);
  assert.equal(nextSnapStreak(2, 'hauled'), 0);
  assert.equal(nextSnapStreak(2, 'aborted'), 2);
  assert.equal(nextSnapStreak('x', 'snapped'), 1);
  assert.deepEqual(mercyOptions(2), {});
  assert.deepEqual(mercyOptions(3), { freeBrace: 1, snapLuck: 1 });
});

test('mercy gives a free Brace charge', () => {
  const plain = createRun({ rig: RIG, mods: STRONG, seed: 4, play: {} });
  const kind = createRun({ rig: RIG, mods: STRONG, seed: 4, play: mercyOptions(3) });
  assert.equal(kind.play.abil.brace.charges, plain.play.abil.brace.charges + 1);
  assert.ok(kind.mods.luck > plain.mods.luck);
});
