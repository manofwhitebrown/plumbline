import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meta } from '../src/meta/index.js';
import { s } from '../src/meta/state.js';
import { setTimeSource } from '../src/meta/time.js';
import { fresh, T0 } from './meta-helpers.js';

const HOUR = 3600000;

// 10 winch hands = 20 gold per second (milestone x2).
function withCrew() {
  const clock = fresh();
  meta.addGold(1e6);
  assert.equal(meta.crew.buy('winch', 10).ok, true);
  assert.equal(meta.crew.perSecond(), 20);
  meta.tick(100); // stamps "last seen"
  return clock;
}

test('0 ms and 59 s away give nothing', () => {
  const clock = withCrew();
  assert.equal(meta.offline.peek(), null);
  clock.advance(59000);
  assert.equal(meta.offline.peek(), null);
});

test('1 minute is the start', () => {
  const clock = withCrew();
  clock.advance(60000);
  const p = meta.offline.peek();
  assert.equal(p.ms, 60000);
  assert.equal(p.gold, 60 * 20 * 0.6);
});

test('1 hour pays 60% of crew income', () => {
  const clock = withCrew();
  clock.advance(HOUR);
  const p = meta.offline.peek();
  assert.equal(p.ms, HOUR);
  assert.equal(p.gold, 3600 * 20 * 0.6);
});

test('30 hours is capped at 8 hours', () => {
  const clock = withCrew();
  clock.advance(30 * HOUR);
  const p = meta.offline.peek();
  assert.equal(p.ms, 8 * HOUR);
  assert.equal(p.gold, 8 * 3600 * 20 * 0.6);
});

test('the Vault upgrade raises the cap by 1 hour a level', () => {
  const clock = withCrew();
  meta.addGold(1e9);
  assert.equal(meta.upgrades.buy('vault').ok, false, 'needs depth first');
  s().bestDepth = 100;
  assert.equal(meta.upgrades.buy('vault').ok, true);
  clock.advance(30 * HOUR);
  assert.equal(meta.offline.peek().ms, 9 * HOUR);
});

test('clock moved backwards: no gold, never negative', () => {
  const clock = withCrew();
  clock.advance(-5 * HOUR);
  assert.equal(meta.offline.peek(), null);
  meta.tick(100);
  clock.advance(HOUR);
  assert.equal(meta.offline.peek().ms, HOUR, 'counts again from the new time');
});

test('a last-seen time in the future is ignored', () => {
  const clock = withCrew();
  s().lastSeen = clock.now + 3 * 24 * HOUR;
  assert.equal(meta.offline.peek(), null);
  assert.ok(s().lastSeen <= clock.now);
});

test('huge jumps are capped; broken clocks are safe', () => {
  const clock = withCrew();
  clock.advance(1e15);
  assert.equal(meta.offline.peek().ms, 8 * HOUR);
  setTimeSource(() => NaN, 0);
  assert.doesNotThrow(() => meta.offline.peek());
  setTimeSource(() => Infinity, 0);
  assert.doesNotThrow(() => meta.offline.peek());
  assert.ok(Number.isFinite(meta.gold()));
});

test('claim pays exactly once and survives a second peek', () => {
  const clock = withCrew();
  clock.advance(2 * HOUR);
  const p = meta.offline.peek();
  assert.deepEqual(meta.offline.peek(), p, 'same answer when asked twice');
  const before = meta.gold();
  const c = meta.offline.claim();
  assert.equal(c.ok, true);
  assert.equal(meta.gold(), before + p.gold);
  assert.equal(meta.offline.claim().ok, false);
  assert.equal(meta.offline.peek(), null);
  assert.equal(meta.gold(), before + p.gold);
});

test('no crew means nothing to claim', () => {
  const clock = fresh();
  meta.tick(100);
  clock.advance(5 * HOUR);
  assert.equal(meta.offline.peek(), null);
  assert.equal(meta.offline.claim().ok, false);
});

test('meta.tick adds income for real time, capped at 1 s a call', () => {
  withCrew();
  const g = meta.gold();
  meta.tick(500);
  assert.equal(meta.gold(), g + 10);
  meta.tick(60000);
  assert.equal(meta.gold(), g + 10 + 20);
  meta.tick(-1000); meta.tick(NaN);
  assert.equal(meta.gold(), g + 30);
});

test('init works out away income so the first tick cannot lose it', () => {
  const clock = withCrew();
  clock.advance(2 * HOUR);
  meta.init();
  meta.tick(1000);
  meta.tick(1000);
  const p = meta.offline.peek();
  assert.ok(p, 'away income is still waiting');
  assert.equal(p.ms, 2 * HOUR);
  assert.equal(p.gold, 2 * 3600 * 20 * 0.6);
  const before = meta.gold();
  assert.equal(meta.offline.claim().gold, p.gold);
  assert.equal(meta.gold(), before + p.gold);
});
