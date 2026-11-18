// Goal text is built from the player's best depth, so we try many depths, up to ten million metres.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES } from '../src/data/goals.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

const BEST = [0, 1, 29, 59, 60, 99, 100, 149, 150, 250, 450, 700, 999, 5000, 99999, 123456, 1e6, 1e7];

test('goal text fits 28 characters for every template, level and best depth', () => {
  const pairs = [];
  for (const t of TEMPLATES) {
    for (const level of [0, 1, 2]) {
      for (const best of BEST) {
        const g = t.make(best, level);
        pairs.push([`${t.kind} level ${level} best ${best}`, g.text]);
      }
    }
  }
  assert.ok(pairs.length > 100);
  checkLimit('goal text', pairs, LIMITS.goalText);
});
test('goal text never shows NaN, undefined or Infinity', () => {
  for (const t of TEMPLATES) for (const best of [0, NaN, undefined, -1, 99999]) for (const level of [0, 1, 2]) {
    const text = t.make(Number.isFinite(best) ? best : 0, level).text;
    assert.doesNotMatch(text, /NaN|undefined|Infinity|null/);
  }
});
