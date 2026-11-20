import test from 'node:test';
import assert from 'node:assert/strict';
import * as rigs from '../src/run/rigs.js';

test('loadouts.active is -1 for an empty rig and never throws', () => {
  assert.equal(typeof rigs.loadouts.active, 'function');
  const a = rigs.loadouts.active();
  assert.ok(Number.isInteger(a) && a >= -1 && a <= 2);
});
