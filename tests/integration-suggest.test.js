import test from 'node:test';
import assert from 'node:assert/strict';
import { suggest, emptyRig } from '../src/tutorial/suggest.js';
import { fakeDeps } from './engine-fakes.js';

const fakeGet = (id) => fakeDeps.getPart(id);
const OPTS = { maxEvals: 400, budgetMs: 60000, deps: fakeDeps, getPart: fakeGet };

function counts(rig) {
  const out = {};
  for (const row of rig.cells) for (const id of row) if (id) out[id] = (out[id] || 0) + 1;
  return out;
}
function assertValid(rig, mods, owned) {
  assert.ok(rig.cols === (mods.cols >= 5 ? 5 : 4));
  assert.ok(rig.rows === (mods.rows >= 4 ? 4 : 3));
  assert.equal(rig.cells.length, rig.rows);
  for (const row of rig.cells) assert.equal(row.length, rig.cols);
  const c = counts(rig);
  for (const id of Object.keys(c)) assert.ok((owned[id] || 0) >= c[id], 'too many ' + id);
}

test('suggest: empty rig when nothing is owned or input is bad', () => {
  for (const owned of [{}, [], null, undefined, 5, { hook: 0 }, { ghost: 2 }]) {
    const r = suggest.bestRig({ cols: 4, rows: 3 }, owned, OPTS);
    assert.deepEqual(r, emptyRig(4, 3));
  }
  assert.deepEqual(suggest.bestRig(null, null), emptyRig(4, 3));
  assert.deepEqual(suggest.bestRig({ cols: 9, rows: 'x' }, { hook: 1 }, { getPart: () => { throw new Error('boom'); } }), emptyRig(4, 3));
});

test('suggest: valid rig for every size and owned counts', () => {
  const owned = { hook: 2, polisher: 1, plate: 1, oilcan: 1 };
  for (const [cols, rows] of [[4, 3], [5, 3], [4, 4], [5, 4]]) {
    const mods = { cols, rows };
    const r = suggest.bestRig(mods, owned, OPTS);
    assertValid(r, mods, owned);
    assert.ok(counts(r).hook >= 1, 'uses a hook');
  }
});

test('suggest: deterministic', () => {
  const owned = { hook: 2, polisher: 1, splitter: 1 };
  const a = suggest.bestRig({ cols: 4, rows: 3 }, owned, OPTS);
  const b = suggest.bestRig({ cols: 4, rows: 3 }, owned, OPTS);
  assert.deepEqual(a, b);
});

test('suggest: accepts a list of ids', () => {
  const r = suggest.bestRig({ cols: 4, rows: 3 }, ['hook', 'hook', 'polisher'], OPTS);
  assertValid(r, { cols: 4, rows: 3 }, { hook: 2, polisher: 1 });
});

test('suggest: respects the time budget', () => {
  const t = Date.now();
  const r = suggest.bestRig({ cols: 5, rows: 4 }, { hook: 2, polisher: 1, plate: 1, splitter: 1, oilcan: 1 }, { budgetMs: 150, deps: fakeDeps, getPart: fakeGet });
  assert.ok(Date.now() - t < 600);
  assert.equal(r.cols, 5);
});
