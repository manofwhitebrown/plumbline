// The hidden attribute must really hide things in our screens (.btn, .pill, .icon set display).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const crew = readFileSync(new URL('../src/ui/styles/crew.css', import.meta.url), 'utf8');
const shop = readFileSync(new URL('../src/ui/styles/workshop.css', import.meta.url), 'utf8');

test('hidden wins over display in Crew and Workshop', () => {
  assert.match(crew, /\.screen-crew \[hidden\]\s*\{\s*display:\s*none\s*!important/);
  assert.match(shop, /\.screen-workshop \[hidden\][^{]*\{\s*display:\s*none\s*!important/);
});

test('no tiny text or 100vh in our CSS', () => {
  for (const css of [crew, shop]) {
    assert.ok(!/100vh/.test(css));
    for (const m of css.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 12);
  }
});

test('long text ends with an ellipsis rule', () => {
  for (const css of [crew, shop]) assert.match(css, /\.ellipsis\s*\{[^}]*text-overflow:\s*ellipsis/);
});
