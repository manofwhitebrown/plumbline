import test from 'node:test';
import assert from 'node:assert/strict';
import { getPart, allParts, partsByFamily, validatePartDef, detectCombos } from '../src/engine/parts/index.js';
import { getTwist, todaysTwist } from '../src/engine/twists.js';

test('registry: every part is valid and ids are unique', () => {
  const list = allParts();
  assert.ok(list.length >= 24);
  const ids = new Set(list.map((p) => p.id));
  assert.equal(ids.size, list.length);
  for (const p of list) assert.deepEqual(validatePartDef(p), { ok: true, errors: [] }, p.id);
});

test('getPart is safe with bad ids', () => {
  for (const bad of [null, undefined, 'nonsense', 5, {}, '__proto__', 'constructor']) assert.equal(getPart(bad), null);
  assert.equal(getPart('hook').id, 'hook');
  assert.equal(partsByFamily('collector').length, 4);
});

test('detectCombos is safe with bad rigs', () => {
  for (const bad of [null, undefined, {}, { cols: 4, rows: 3 }, { cols: 4, rows: 3, cells: 'x' }]) assert.deepEqual(detectCombos(bad), []);
});

test('twists: 8 exist and the daily pick is stable', () => {
  assert.equal(getTwist('nope'), null);
  assert.equal(getTwist(null), null);
  assert.equal(getTwist('lucky_day').name, 'Lucky Day');
  assert.equal(todaysTwist('2026-11-18'), todaysTwist('2026-11-18'));
  assert.equal(todaysTwist('garbage'), null);
});
