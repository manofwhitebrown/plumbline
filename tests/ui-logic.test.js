import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countValue, createCounter, easeOutCubic } from '../src/ui/logic/countup.js';
import { dangerLevel, strainFraction } from '../src/ui/logic/danger.js';
import { affordText, bulkCost, maxAffordable, buyCount } from '../src/ui/logic/afford.js';
import * as rs from '../src/ui/logic/rigState.js';

test('count-up finishes exactly on target', () => {
  assert.equal(countValue(0, 1234.5, 1), 1234.5);
  assert.equal(countValue(0, 1234.5, 5), 1234.5);
  assert.equal(countValue(0, 100, NaN), 100);
  assert.ok(countValue(0, 100, 0.5) > 50);
  assert.equal(easeOutCubic(-3), 0);
  const c = createCounter(0);
  c.setTarget(500, 0, 400);
  assert.equal(c.update(200) < 500, true);
  assert.equal(c.update(400), 500);
  assert.equal(c.done, true);
  c.setTarget(Infinity, 0, 100);
  assert.equal(c.update(1000), 0);
});

test('danger thresholds', () => {
  assert.equal(dangerLevel(0, 100), 0);
  assert.equal(dangerLevel(49, 100), 0);
  assert.equal(dangerLevel(50, 100), 1);
  assert.equal(dangerLevel(75, 100), 2);
  assert.equal(dangerLevel(90, 100), 3);
  assert.equal(dangerLevel(500, 100), 3);
  assert.equal(dangerLevel(NaN, 100), 0);
  assert.equal(dangerLevel(5, 0), 0);
  assert.equal(strainFraction(-4, 100), 0);
});

test('affordability text says how much is missing', () => {
  assert.deepEqual(affordText(100, 100, 'gold'), { ok: true, text: '' });
  assert.equal(affordText(220, 100, 'gold').text, 'Need 120 more gold');
  assert.equal(affordText(NaN, 100, 'gold').ok, false);
  assert.equal(affordText(10, undefined, 'gold').text, 'Need 10 more gold');
});

test('bulk buy math', () => {
  assert.equal(bulkCost(10, 0, 1), 10);
  const ten = bulkCost(10, 0, 10);
  assert.ok(Math.abs(ten - 10 * (Math.pow(1.15, 10) - 1) / 0.15) < 1e-9);
  assert.equal(bulkCost(10, 0, 0), 0);
  assert.equal(bulkCost(-5, 0, 3), 0);
  assert.equal(maxAffordable(10, 0, 9), 0);
  assert.equal(maxAffordable(10, 0, 10), 1);
  assert.equal(maxAffordable(10, 0, Infinity, 1.15, 50), 50);
  assert.equal(buyCount('max', 10, 0, 5), 1);
  assert.equal(buyCount(10, 10, 0, 5), 10);
});

test('rig: tap part then cell places it', () => {
  let s = rs.initial();
  let out = rs.tapPart(s, 'hook', 2, 0);
  assert.equal(out.state.mode, 'part');
  out = rs.tapCell(out.state, 1, 2, null);
  assert.deepEqual(out.effect, { type: 'place', r: 1, c: 2, partId: 'hook' });
  assert.equal(out.state.mode, 'idle');
});

test('rig: no spare copy is denied, same part taps cancel', () => {
  const out = rs.tapPart(rs.initial(), 'hook', 1, 1);
  assert.equal(out.effect.type, 'deny');
  const picked = rs.tapPart(rs.initial(), 'hook', 1, 0).state;
  assert.equal(rs.tapPart(picked, 'hook', 1, 0).state.mode, 'idle');
  assert.equal(rs.tapPart(rs.initial(), null, 1, 0).effect.type, 'none');
});

test('rig: tap placed part opens sheet, move then swap', () => {
  const idle = rs.initial();
  const out = rs.tapCell(idle, 0, 0, 'hook');
  assert.equal(out.effect.type, 'openSheet');
  const moving = rs.startMove(idle, 0, 0);
  const swap = rs.tapCell(moving, 1, 1, null);
  assert.deepEqual(swap.effect, { type: 'swap', a: { r: 0, c: 0 }, b: { r: 1, c: 1 } });
  assert.equal(rs.tapCell(moving, 0, 0, 'hook').effect.type, 'none');
  assert.equal(rs.tapCell(idle, 'x', 1, 'hook').effect.type, 'none');
});

test('rig: drag and drop', () => {
  assert.equal(rs.drop({ kind: 'tray', partId: 'hook' }, 0, 1).type, 'place');
  assert.equal(rs.drop({ kind: 'cell', r: 0, c: 0 }, 0, 0).type, 'none');
  assert.equal(rs.drop({ kind: 'cell', r: 0, c: 0 }, 2, 3).type, 'swap');
  assert.equal(rs.drop(null, 0, 0).type, 'none');
  assert.equal(rs.glowCells({ cells: [[null, 'a']] }, 'hook').length, 2);
  assert.equal(rs.glowCells(null, 'hook').length, 0);
});
