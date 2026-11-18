import test from 'node:test';
import assert from 'node:assert/strict';
import { PART_DATA } from '../src/data/parts.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

const parts = Object.entries(PART_DATA);

test('there are parts to check', () => assert.ok(parts.length >= 26));
test('part names fit 14 characters', () => checkLimit('part name', parts.map(([id, p]) => [id, p.name]), LIMITS.partName));
test('part descriptions fit 90 characters', () => checkLimit('part description', parts.map(([id, p]) => [id, p.desc]), LIMITS.partDesc));
test('part names are different from each other', () => {
  const names = parts.map(([, p]) => p.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
});
