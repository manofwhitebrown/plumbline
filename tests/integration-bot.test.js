import test from 'node:test';
import assert from 'node:assert/strict';
import { playBot, STYLES, fmtT } from '../tools/bot.js';

test('bot: returns a full report for every style and never throws', () => {
  for (const style of Object.keys(STYLES)) {
    const r = playBot(style, { hours: 0.1, maxDrops: 30 });
    assert.ok(Array.isArray(r.problems));
    assert.ok(r.timeline && typeof r.timeline === 'object');
    assert.ok(Number.isFinite(r.timeline.goldPerHour) && r.timeline.goldPerHour >= 0);
    assert.ok(r.drops > 0);
  }
});

test('bot: time text is plain', () => {
  assert.equal(fmtT(null), 'not reached');
  assert.equal(fmtT(30), '30 s');
  assert.equal(fmtT(600), '10.0 min');
  assert.equal(fmtT(7200), '2.00 h');
});
