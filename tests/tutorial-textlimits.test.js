// Tutorial tips are shown in a tooltip that is at most 320px wide. We keep each tip to 60 characters (the toast limit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEPS } from '../src/tutorial/steps.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

test('tutorial tips fit 60 characters', () => checkLimit('tutorial line', STEPS.map((s) => [s.id, s.text]), LIMITS.toast));
test('tutorial tips are in docs/WORDS.md or only use allowed words', () => {
  for (const s of STEPS) assert.doesNotMatch(s.text, /\b(beat|lane|tick|entity|seed|slice|payload|debug|NaN|undefined|null)\b/i, s.id);
});
test('tutorial lines in docs/WORDS.md fit 60 characters', () => {
  const words = readFileSync('docs/WORDS.md', 'utf8');
  const lines = [...words.matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => [`WORDS line ${m[1].slice(0, 12)}`, m[1].trim()]);
  assert.ok(lines.length >= 6);
  checkLimit('tutorial line', lines, LIMITS.toast);
});
