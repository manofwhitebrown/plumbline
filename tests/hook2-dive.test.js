import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { s } from '../src/meta/state.js';
import * as D from '../src/meta/dive.js';
import { DIVE_CHEST, DIVE_TEXT } from '../src/data/dive.js';
import { fresh, DAY } from './meta-helpers.js';

function ready() { const c = fresh(); s().stats.drops = 5; return c; }
function dive(depth = 300, outcome = 'hauled') {
  const b = D.begin();
  assert.equal(b.ok, true);
  bus.emit('run:started', { seed: b.seed, rig: { cells: [] } });
  bus.emit('run:ended', { seed: b.seed, depth, outcome, gold: 1, kept: 1 });
  return b;
}

test('the seed is the same for everyone on the same day and differs by day', () => {
  assert.equal(D.seedForDay(20000), D.seedForDay(20000));
  assert.notEqual(D.seedForDay(20000), D.seedForDay(20001));
  const seen = new Set(); for (let i = 0; i < 365; i++) seen.add(D.seedForDay(20000 + i));
  assert.equal(seen.size, 365);
  assert.ok(Number.isInteger(D.seedForDay(NaN)));
});

test('locked until a few normal Drops are done', () => {
  fresh();
  const a = D.state();
  assert.equal(a.canPlay, false);
  assert.equal(a.why, DIVE_TEXT.locked);
  assert.equal(D.begin().ok, false);
  s().stats.drops = 3;
  assert.equal(D.state().canPlay, true);
});

test('one free try: after a Dive the button is closed until tomorrow', () => {
  const clock = ready();
  const b = dive(250);
  const st = D.state();
  assert.equal(st.canPlay, false);
  assert.equal(st.best, 250);
  assert.equal(D.begin().ok, false);
  clock.advance(DAY);
  assert.equal(D.state().canPlay, true);
  assert.equal(D.state().best, 0);
  assert.ok(b.seed !== D.state().seed);
});

test('the daily twist is on for the Dive only and put back afterwards', () => {
  ready();
  s().daily.twistOn = false;
  D.begin();
  assert.equal(s().daily.twistOn, true);
  const seed = D.state().seed;
  bus.emit('run:started', { seed });
  assert.equal(D.state().running, true);
  bus.emit('run:ended', { seed, depth: 100, outcome: 'snapped' });
  assert.equal(s().daily.twistOn, false);
  // and when the player had the twist on already, it stays on
  const c = fresh(); s().stats.drops = 5; s().daily.twistOn = true; c.advance(DAY);
  dive(50);
  assert.equal(s().daily.twistOn, true);
});

test('a Drop that does not start does not use the try', () => {
  ready();
  s().daily.twistOn = false;
  D.begin();
  assert.equal(D.cancel(), true);
  assert.equal(s().daily.twistOn, false);
  assert.equal(D.state().canPlay, true);
});

test('a normal Drop with another seed does not count as the Dive', () => {
  ready();
  D.begin();
  bus.emit('run:started', { seed: 12345 });
  bus.emit('run:ended', { seed: 12345, depth: 999, outcome: 'hauled' });
  assert.equal(D.state().best, 0);
  assert.equal(D.state().chest.state, 'none');
});

test('streak grows on consecutive days and resets after a missed day', () => {
  const clock = ready();
  dive(100); assert.equal(D.state().streak, 1);
  clock.advance(DAY); dive(100); assert.equal(D.state().streak, 2);
  clock.advance(DAY); dive(100); assert.equal(D.state().streak, 3);
  clock.advance(2 * DAY);
  assert.equal(D.state().streak, 0);       // shown as broken at once
  dive(100); assert.equal(D.state().streak, 1);
  assert.equal(D.state().bestStreak, 3);
});

test('chest: pays once, only after a Dive, with bounded rewards', () => {
  ready();
  assert.equal(D.claimChest().ok, false);
  dive(600);
  const sh = s().shards, g = s().gold;
  const r = D.claimChest();
  assert.equal(r.ok, true);
  assert.ok(s().shards - sh === r.shards && s().gold - g === r.gold && r.shards > 0 && r.gold > 0);
  assert.equal(D.claimChest().ok, false);
  const huge = D.chestFor(1e9, 1e9);
  assert.ok(huge.shards <= DIVE_CHEST.shardsCap && huge.goldMinutes <= DIVE_CHEST.goldMinutesCap);
});

test('an unopened chest is gone tomorrow but the streak stays', () => {
  const clock = ready();
  dive(100);
  clock.advance(DAY);
  assert.equal(D.state().chest.state, 'none');
  assert.equal(D.state().streak, 1);
});

test('a Dive cut off by closing the page is paid as a Snap through recovery', () => {
  ready();
  const b = D.begin();
  bus.emit('run:started', { seed: b.seed });
  bus.emit('run:recovered', { seed: b.seed, depth: 77 });
  assert.equal(D.state().best, 77);
  assert.equal(D.state().running, false);
});

test('a Dive left "running" too long is closed and the twist restored', () => {
  const clock = ready();
  s().daily.twistOn = false;
  const b = D.begin();
  bus.emit('run:started', { seed: b.seed });
  clock.advance(60 * 60 * 1000);
  assert.equal(D.state().running, false);
  assert.equal(s().daily.twistOn, false);
});

test('cheats: reset gives the try back; cheated Dives do not count', () => {
  ready();
  dive(200);
  D.cheatReset();
  assert.equal(D.state().canPlay, true);
  assert.equal(D.state().chest.state, 'none');
  s().cheated = true;
  const b = D.begin();            // a cheated save may still try the Dive (to test it)...
  assert.equal(b.ok, true);
  bus.emit('run:started', { seed: b.seed });
  bus.emit('run:ended', { seed: b.seed, depth: 900, outcome: 'hauled' });
  assert.equal(D.state().chest.state, 'none'); // ...but it earns nothing
  assert.equal(D.state().best, 0);
});

test('clock moved back never gives a second try', () => {
  const clock = ready();
  clock.advance(DAY); dive(100);
  clock.advance(-DAY);
  assert.equal(D.state().canPlay, false);
});

test('old save loads: damaged slice is repaired, state never has NaN', async () => {
  fresh();
  const { getSlice } = await import('../src/core/save.js');
  Object.assign(getSlice('dive'), { best: 'x', streak: -4, chest: 'bogus', day: NaN });
  const st = D.state();
  assert.ok(Number.isFinite(st.best) && Number.isFinite(st.streak) && Number.isFinite(st.chest.gold));
  assert.doesNotThrow(() => D.claimChest());
});

test('lines fit the 60 character limit', () => {
  for (const k of Object.keys(DIVE_TEXT)) assert.ok(DIVE_TEXT[k].length <= 60, k);
});
