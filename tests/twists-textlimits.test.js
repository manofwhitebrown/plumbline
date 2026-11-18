// Daily twists are not in the LAYOUT_CHECK table. We use the crew/quest limits (name 22, description 80).
import test from 'node:test';
import assert from 'node:assert/strict';
import { TWIST_DATA, TWIST_ORDER } from '../src/data/twists.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

const twists = Object.entries(TWIST_DATA);

test('every twist in the order list has data', () => {
  for (const id of TWIST_ORDER) assert.ok(TWIST_DATA[id], id);
  assert.equal(twists.length, TWIST_ORDER.length);
});
test('twist names fit 22 characters', () => checkLimit('twist name', twists.map(([id, t]) => [id, t.name]), LIMITS.listName));
test('twist descriptions fit 80 characters', () => checkLimit('twist description', twists.map(([id, t]) => [id, t.desc]), LIMITS.listDesc));
