// NEW-5: ?debug=1&fixture=... test states fill the in-memory save only and always give sane numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { _configure, useMemoryOnly, getSlice, registerSlice, resetAll } from '../src/core/save.js';
import { makeMemoryStorage } from '../src/core/storage.js';
import { meta } from '../src/meta/index.js';
import { s, META_VERSION, defaults, migrate } from '../src/meta/state.js';
import '../src/tutorial/index.js';
import { loadFixture, FIXTURES } from '../src/cheats/fixtures.js';
import { allParts } from '../src/engine/parts/index.js';

function boot() { resetAll(); s(); }
const finite = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;

test('fixtures: unknown name is refused, empty changes nothing', () => {
  boot();
  assert.equal(loadFixture('nope'), false);
  assert.equal(loadFixture('empty'), true);
  assert.equal(s().gold, 0);
  assert.equal(getSlice('tutorial').done, false, 'empty = new player, tutorial may start');
});

for (const name of ['busy', 'extreme']) {
  test(`fixtures: ${name} gives sane numbers and turns the tutorial off`, () => {
    boot();
    assert.equal(loadFixture(name), true);
    const st = s();
    for (const k of ['gold', 'shards', 'coreDust', 'bestDepth']) assert.ok(finite(st[k]), k);
    for (const k of Object.keys(st.stats)) assert.ok(finite(st.stats[k]), 'stat ' + k);
    assert.ok(Object.keys(meta.ownedParts()).length >= 12);
    assert.equal(getSlice('tutorial').done, true);
    const m = meta.getMods();
    for (const k of ['maxStrain', 'keepOnSnap', 'goldMult', 'strainMult', 'luck']) assert.ok(finite(m[k]), 'mod ' + k);
    assert.equal(st.cheated, false, 'a fixture is not a cheat');
    assert.ok(meta.quests.list().length > 0);
  });
}

test('fixtures: extreme owns every part, biggest bucket, depth 99999', () => {
  boot(); loadFixture('extreme');
  assert.equal(Object.keys(meta.ownedParts()).length, allParts().length);
  const m = meta.getMods();
  assert.equal(m.cols, 5); assert.equal(m.rows, 4);
  assert.equal(s().bestDepth, 99999);
});

test('fixtures: useMemoryOnly never reaches the real storage', () => {
  const real = makeMemoryStorage(); let writes = 0;
  const spy = { ...real, setItem: (k, v) => { writes++; real.setItem(k, v); } };
  _configure({ storage: spy });
  useMemoryOnly(); // what main.js does first when a fixture is asked for
  registerSlice('meta', { version: META_VERSION, defaults: defaults(), migrate });
  registerSlice('tutorial', { version: 1, defaults: { done: false, skipped: false, stepId: '' } });
  s(); loadFixture('busy');
  meta.addGold(5);
  assert.equal(writes, 0);
  assert.deepEqual(FIXTURES, ['empty', 'busy', 'extreme']);
});
