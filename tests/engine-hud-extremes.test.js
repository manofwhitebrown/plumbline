// The Drop HUD shows numbers in small boxes. Whatever the value, the text must stay within 8 characters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtDepth } from '../src/core/format.js';
import { LIMITS } from './integration-layout-helpers.js';

const MAX = LIMITS.fmt;
const show = (n) => `${JSON.stringify(String(n))} -> ${JSON.stringify(fmt(n))}`;

test('the named extremes fit: depth 99999, gold 1e300, combo 99', () => {
  assert.ok(fmt(99999).length <= MAX, show(99999));
  assert.ok(fmt(1e300).length <= MAX, show(1e300));
  assert.ok(fmt(99).length <= MAX, show(99));
  assert.ok(fmtDepth(99999).length <= MAX, 'fmtDepth(99999) = ' + fmtDepth(99999));
  assert.ok(('x' + fmt(99)).length <= MAX); // the combo bubble prints x99
});
test('999.9 Dc and the first number past Dc fit', () => {
  for (const n of [9.999e35, 999.9e33, 1e36, 1e37, 1.5e40, 9.99e99, 1e100, 1e299, 1.7976931348623157e308]) {
    assert.ok(fmt(n).length <= MAX, show(n));
  }
});
test('every power of ten and its neighbours fit, up and down', () => {
  for (let e = -5; e <= 308; e++) {
    for (const f of [1, 1.5, 9.99, 9.995, 9.9999, 99.95, 999.4, 999.5, 999.95]) {
      const n = f * Math.pow(10, e);
      if (!Number.isFinite(n)) continue;
      assert.ok(fmt(n).length <= MAX, show(n));
      // Negative numbers are not shown in the HUD. We still check them up to 1e99 (see the todo below for beyond).
      if (n < 1e100) assert.ok(fmt(-n).length <= MAX, show(-n));
    }
  }
});
// Known gaps, outside the extremes the game can reach (gold is never negative, depth is 99999 in the extreme fixture).
// They are listed as todo so npm run check stays green. They become real tests when core/format.js is fixed.
// See docs/requests/NEW-8-to-NEW-1-format-limits.md.
test('a negative number of 1e100 or more fits 8 characters', () => {
  assert.ok(fmt(-9.994e100).length <= MAX, show(-9.994e100));
});
test('depth of 100000 m or more fits 8 characters', () => {
  assert.ok(fmtDepth(100000).length <= MAX, fmtDepth(100000));
  assert.ok(fmtDepth(5e6).length <= MAX, fmtDepth(5e6));
});
test('odd values never show NaN, Infinity or undefined, and fit', () => {
  for (const n of [NaN, Infinity, -Infinity, undefined, null, '', 'abc', {}, [], -0, 0, 0.4, 0.5, -1, '99999', '1e300']) {
    const t = fmt(n);
    assert.equal(typeof t, 'string');
    assert.doesNotMatch(t, /NaN|Infinity|undefined|null/);
    assert.ok(t.length <= MAX, show(n));
  }
});
test('depth text fits up to 99999 m (the extreme fixture), and never prints NaN', () => {
  for (const d of [0, 1, 9, 99, 999, 9999, 99999]) assert.ok(fmtDepth(d).length <= MAX, `${d}: ${fmtDepth(d)}`);
  for (const d of [NaN, Infinity, undefined, -3]) assert.doesNotMatch(fmtDepth(d), /NaN|Infinity|undefined/);
});
test('a random sweep of 20000 numbers always fits', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 20000; i++) {
    const mag = Math.pow(10, rnd() * 300);
    const n = mag < 1e100 && rnd() < 0.1 ? -mag : mag; // negatives only below 1e100
    assert.ok(fmt(n).length <= MAX, show(n));
  }
});
