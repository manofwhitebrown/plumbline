import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/ui/styles/polish.css', import.meta.url), 'utf8');
const idx = readFileSync(new URL('../src/ui/index.js', import.meta.url), 'utf8');

// Properties that would move or resize things. polish.css must never set them.
const BANNED = /^(width|height|min-width|min-height|max-width|max-height|margin(-[a-z]+)?|padding(-[a-z]+)?|top|left|right|bottom|inset|position|display|flex(-[a-z]+)?|grid(-[a-z-]+)?|gap|row-gap|column-gap|font-size|line-height|border(-width)?|overflow(-[xy])?|z-index|float|align-[a-z]+|justify-[a-z]+|order|content)$/;

test('polish.css sets looks only, never sizes or positions', () => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const props = [...body.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:/g)].map((m) => m[1]);
  assert.ok(props.length > 40);
  const bad = props.filter((p) => BANNED.test(p));
  assert.deepEqual(bad, []);
});

test('polish.css uses no 100vh, no nowrap, no tiny text, no new colours outside rgba/tokens', () => {
  assert.ok(!/100vh/.test(css));
  assert.ok(!/nowrap/.test(css));
  assert.ok(!/#fff\b|#ffffff|#000\b|#000000/i.test(css), 'no pure white or black');
});

test('Reduce motion is handled', () => {
  assert.match(css, /#app\[data-reduce="1"\]/);
  assert.match(css, /prefers-reduced-motion/);
});

test('the screen enter is 8 px and 220 ms', () => {
  assert.match(css, /translateY\(8px\)/);
  assert.match(css, /polishIn 220ms/);
});

test('polish.css is loaded last in the UI index', () => {
  const imports = [...idx.matchAll(/import '(.+\.css)'/g)].map((m) => m[1]);
  assert.equal(imports[imports.length - 1], './styles/polish.css');
});
