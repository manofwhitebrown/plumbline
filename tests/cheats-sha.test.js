import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../src/cheats/sha256.js';

test('sha256 matches node crypto for many inputs', () => {
  const inputs = ['', 'abc', 'plumbline:test', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65), 'é☃😀'.repeat(50)];
  for (const t of inputs) assert.equal(sha256Hex(t), createHash('sha256').update(t).digest('hex'));
});
