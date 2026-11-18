import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGate, LOCK_MS } from '../src/cheats/gate.js';
import { sha256Hex } from '../src/cheats/sha256.js';
import { matches, CHEAT_HASH } from '../src/cheats/hash.js';
import { cheats } from '../src/cheats/index.js';
import { fresh } from './meta-helpers.js';

// A throwaway password used only in tests. It is NOT the real one.
const TEST_PW = 'throwaway-test-pw-91';
const TEST_HASH = sha256Hex('plumbline:' + TEST_PW);

test('right test password unlocks, wrong does not', () => {
  fresh();
  const g = createGate({ expectedHash: TEST_HASH });
  g.reveal();
  assert.equal(g.tryPassword('nope'), false);
  assert.equal(g.isUnlocked(), false);
  assert.equal(g.tryPassword(TEST_PW), true);
  assert.equal(g.isUnlocked(), true);
  g.lock();
  assert.equal(g.isUnlocked(), false);
});

test('nothing works until the box is revealed', () => {
  fresh();
  const g = createGate({ expectedHash: TEST_HASH });
  assert.equal(g.tryPassword(TEST_PW), false);
  assert.equal(g.isUnlocked(), false);
});

test('5 wrong tries lock input for 30 seconds', () => {
  const clock = fresh();
  const g = createGate({ expectedHash: TEST_HASH });
  g.reveal();
  for (let i = 0; i < 5; i++) assert.equal(g.tryPassword('bad' + i), false);
  assert.ok(g.lockedForMs() > 0);
  assert.equal(g.tryPassword(TEST_PW), false, 'right password is ignored during lockout');
  clock.advance(LOCK_MS - 1000);
  assert.equal(g.tryPassword(TEST_PW), false);
  clock.advance(2000);
  assert.equal(g.tryPassword(TEST_PW), true);
});

test('bad input never throws and never unlocks', () => {
  fresh();
  const g = createGate({ expectedHash: TEST_HASH });
  g.reveal();
  for (const v of [null, undefined, NaN, 5, {}, [], '', 'x'.repeat(5000)]) assert.equal(g.tryPassword(v), false);
});

test('a fresh save starts locked and the real hash rejects the test password', () => {
  fresh();
  assert.equal(cheats.isUnlocked(), false);
  assert.deepEqual(cheats.list(), []);
  assert.equal(cheats.run('gold_1k').ok, false);
  assert.equal(matches(TEST_PW), false);
  assert.match(CHEAT_HASH, /^[0-9a-f]{64}$/);
});
