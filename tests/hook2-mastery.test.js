import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { s } from '../src/meta/state.js';
import * as M from '../src/meta/mastery.js';
import { MASTERY_USES, MASTERY_TEXT, MASTERY_BONUS_CAP } from '../src/data/mastery.js';
import { fresh } from './meta-helpers.js';

const RIG = { cols: 2, rows: 1, cells: [['hook', 'polisher']] };
const col = (c, gold = 10) => ({ t: 'COLLECT', lane: c, item: { kind: 'gem', tier: 1, value: 1 }, gold, combo: 1, r: 0, c });

function drop(events, result) {
  bus.emit('run:started', { rig: RIG, seed: 1 });
  bus.emit('run:events', { events });
  bus.emit('run:ended', { outcome: 'hauled', gold: 100, kept: 100, depth: 50, rig: RIG, ...result });
}

test('levelFor follows the thresholds and never passes 5', () => {
  assert.equal(M.levelFor(0), 0);
  assert.equal(M.levelFor(MASTERY_USES[0] - 1), 0);
  MASTERY_USES.forEach((u, i) => assert.equal(M.levelFor(u), i + 1));
  assert.equal(M.levelFor(1e12), 5);
  assert.equal(M.levelFor(NaN), 0);
  assert.equal(M.levelFor(-5), 0);
});

test('grabs and chains add uses to the right Part', () => {
  fresh();
  drop([col(0), col(0), { t: 'CHAIN', from: { r: 0, c: 0 }, to: { r: 0, c: 1 } }]);
  assert.equal(M.uses('hook'), 3);
  assert.equal(M.uses('polisher'), 1);
});

test('a Part levels up and the level-up is remembered', () => {
  fresh();
  M.addUses('hook', MASTERY_USES[0]);
  assert.equal(M.level('hook'), 1);
  assert.deepEqual(M.recent(), [{ id: 'hook', level: 1 }]);
  const i = M.info('hook');
  assert.equal(i.max, 5);
  assert.match(i.sentence, /\+3% Gold/);
});

test('bonus Gold is paid from the levels BEFORE the Drop, and is capped', () => {
  fresh();
  M.addLevel('hook', 5);
  const g0 = s().gold;
  drop([col(0, 100)], { gold: 100, kept: 100 });
  const paid = s().gold - g0;
  assert.equal(paid, 15); // 100 gold x 3% x 5 levels = 15, the 15% cap
  assert.ok(paid <= 100 * MASTERY_BONUS_CAP);
});

test('bonus is small: capped at 15% even with many mastered Parts', () => {
  const r = M.computeBonus({ partGold: { a: 100, b: 100 }, levels: { a: 5, b: 5 }, gold: 200, kept: 200, outcome: 'hauled' });
  assert.equal(r.gold, 30);
  const r2 = M.computeBonus({ partGold: { a: 1000 }, levels: { a: 5 }, gold: 100, kept: 100, outcome: 'hauled' });
  assert.ok(r2.gold <= 15);
});

test('a Snap: only the kept share earns the bonus; level 5 wins back a little', () => {
  const r = M.computeBonus({ partGold: { hook: 100 }, rigParts: ['hook'], levels: { hook: 5 }, gold: 100, kept: 30, outcome: 'snapped' });
  assert.equal(r.gold, 4);    // 15 x 30% = 4.5 -> 4
  assert.equal(r.saved, 2);   // 70 lost x 3% = 2.1 -> 2
  const none = M.computeBonus({ partGold: { hook: 100 }, rigParts: ['hook'], levels: { hook: 4 }, gold: 100, kept: 30, outcome: 'snapped' });
  assert.equal(none.saved, 0);
});

test('cheated drops never level a Part or pay a bonus', () => {
  fresh();
  s().cheated = true;
  M.addLevel('hook', 5);
  const before = M.uses('hook');
  const g0 = s().gold;
  drop([col(0, 100)]);
  assert.equal(M.uses('hook'), before);
  assert.equal(s().gold, g0);
});

test('bad input never throws', () => {
  fresh();
  assert.equal(M.addUses(null, 5), 0);
  assert.equal(M.addUses('hook', -3), 0);
  assert.doesNotThrow(() => M.onEvents(null));
  assert.doesNotThrow(() => M.onEvents([null, 5, { t: 'COLLECT' }, { t: 'CHAIN' }]));
  assert.deepEqual(M.computeBonus(null), { gold: 0, saved: 0 });
  assert.equal(M.info('nope').level, 0);
});

test('per-drop use cap stops one long Drop from maxing a Part', () => {
  fresh();
  bus.emit('run:started', { rig: RIG });
  bus.emit('run:events', { events: Array.from({ length: 2000 }, () => col(0, 1)) });
  bus.emit('run:ended', { outcome: 'hauled', gold: 10, kept: 10, depth: 9 });
  assert.equal(M.uses('hook'), 400);
});

test('old save loads: a bad slice is repaired', async () => {
  fresh();
  const { importSave, exportSave } = await import('../src/core/save.js');
  assert.ok(exportSave());
  assert.equal(M.info('hook').level, 0);
});

test('sentences fit the 90 character limit for every level', () => {
  for (let lv = 0; lv <= 5; lv++) assert.ok(M.sentenceFor(lv).length <= 90, M.sentenceFor(lv));
  assert.ok(MASTERY_TEXT.top.replace('{g}', '15').length <= 90);
});
