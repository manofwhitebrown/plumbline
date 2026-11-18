import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../tools/check-secrets.js';

test('secret scan finds a fake token and ignores normal text', () => {
  const fake = ['github', '_pat_', 'A'.repeat(30)].join('');
  assert.ok(scanText(`token=${fake}`).length > 0);
  assert.equal(scanText('just a normal line of text').length, 0);
});
