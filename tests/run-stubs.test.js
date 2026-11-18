import test from 'node:test';
import assert from 'node:assert/strict';
import { session, rigs, biomes, loot } from '../src/run/index.js';

test('stub session has every public function', () => {
  for (const name of ['start', 'haul', 'pause', 'resume', 'abort', 'getView']) {
    assert.equal(typeof session[name], 'function');
  }
  assert.equal(session.getView().status, 'idle');
});

test('stub rigs have every public function', () => {
  for (const name of ['getRig', 'place', 'remove', 'swap', 'clear', 'validate', 'preview']) {
    assert.equal(typeof rigs[name], 'function');
  }
  assert.equal(rigs.getRig().cells[2][0], 'hook');
});

test('biomes and loot give valid answers', () => {
  assert.equal(biomes.byDepth(NaN).id, 'clay');
  assert.ok(loot.table('clay', 0).length > 0);
});
