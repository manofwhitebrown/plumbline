// LAYOUT-1 gate: the report exists, has no failing row, and the runner covers every screen id.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = readFileSync(new URL('../docs/layout/LAYOUT-1.md', import.meta.url), 'utf8');
const runner = readFileSync(new URL('../docs/layout/layout1-check.mjs', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/ui/shell.js', import.meta.url), 'utf8');

test('layout report has no failing table cell', () => {
  const cells = report.split('\n').filter((l) => l.startsWith('|'));
  assert.ok(cells.length > 20, 'tables are there');
  assert.ok(!cells.some((l) => /\bFAIL\b|\bOPEN\b/.test(l)), 'no FAIL or OPEN cell');
});

test('layout runner covers every screen id of the shell', () => {
  const ids = /SCREEN_IDS = \[([^\]]*)\]/.exec(shell)[1].match(/'([a-z]+)'/g).map((x) => x.replace(/'/g, ''));
  for (const id of ids) assert.ok(runner.includes(id), `runner mentions ${id}`);
});
