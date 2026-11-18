import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtTime, fmtDepth, fmtPct } from '../src/core/format.js';

test('fmt: small numbers and rounding', () => {
  assert.equal(fmt(0), '0');
  assert.equal(fmt(7), '7');
  assert.equal(fmt(999), '999');
  assert.equal(fmt(999.4), '999');
  assert.equal(fmt(999.5), '1K');
  assert.equal(fmt(-0.2), '0');
  assert.equal(fmt(-5), '-5');
});

test('fmt: suffixes', () => {
  assert.equal(fmt(1000), '1K');
  assert.equal(fmt(1234), '1.2K');
  assert.equal(fmt(12345), '12.3K');
  assert.equal(fmt(123456), '123K');
  assert.equal(fmt(999960), '1M');
  assert.equal(fmt(3.4e6), '3.4M');
  assert.equal(fmt(5e9), '5B');
  assert.equal(fmt(1.5e33), '1.5Dc');
});

test('fmt: huge numbers use e style, bad input is safe', () => {
  assert.equal(fmt(1e40), '1e40');
  assert.equal(fmt(1.5e40), '1.5e40');
  assert.equal(fmt(1e308), '1e308');
  for (const bad of [NaN, undefined, null, 'abc', {}, [], Infinity, -Infinity]) {
    const s = fmt(bad);
    assert.ok(!/NaN|Infinity|undefined|null/.test(s), String(bad) + ' -> ' + s);
  }
  assert.equal(fmt('1500'), '1.5K');
});

test('fmtTime', () => {
  assert.equal(fmtTime(0), '0s');
  assert.equal(fmtTime(-5), '0s');
  assert.equal(fmtTime(NaN), '0s');
  assert.equal(fmtTime(45_000), '45s');
  assert.equal(fmtTime(12 * 60_000 + 5000), '12m 05s');
  assert.equal(fmtTime(2 * 3600_000 + 5 * 60_000), '2h 05m');
  assert.equal(fmtTime(3 * 86400_000 + 4 * 3600_000), '3d 04h');
  assert.equal(fmtTime(Infinity), '0s');
});

test('fmtDepth', () => {
  assert.equal(fmtDepth(412), '412 m');
  assert.equal(fmtDepth(412.9), '412 m');
  assert.equal(fmtDepth(1250), '1,250 m');
  assert.equal(fmtDepth(-3), '0 m');
  assert.equal(fmtDepth(NaN), '0 m');
});

test('fmtPct', () => {
  assert.equal(fmtPct(0.35), '35%');
  assert.equal(fmtPct(0.07), '7%');
  assert.equal(fmtPct(0.075), '7.5%');
  assert.equal(fmtPct(1), '100%');
  assert.equal(fmtPct(NaN), '0%');
  assert.equal(fmtPct(Infinity), '0%');
});
