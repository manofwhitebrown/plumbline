import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meta } from '../src/meta/index.js';
import { s } from '../src/meta/state.js';
import { bus } from '../src/core/bus.js';
import { bump, top } from '../src/meta/stats.js';
import { check } from '../src/meta/achievements.js';
import { fresh, DAY } from './meta-helpers.js';

// ---------- daily ----------
test('daily streak: day 1 to 7, then back to day 1', () => {
  const clock = fresh();
  const days = [];
  for (let i = 0; i < 9; i++) {
    const st = meta.daily.state();
    assert.equal(st.canClaim, true);
    const r = meta.daily.claim();
    assert.equal(r.ok, true);
    days.push(r.day);
    assert.ok(r.shards > 0 && Number.isFinite(r.gold) && r.gold > 0);
    clock.advance(DAY);
  }
  assert.deepEqual(days, [1, 2, 3, 4, 5, 6, 7, 1, 2]);
});

test('daily: claim only once per day, resets at the next midnight', () => {
  const clock = fresh();
  assert.equal(meta.daily.claim().ok, true);
  assert.equal(meta.daily.claim().ok, false);
  assert.equal(meta.daily.state().canClaim, false);
  assert.ok(meta.daily.state().nextInMs > 0 && meta.daily.state().nextInMs <= DAY);
  clock.advance(DAY);
  assert.equal(meta.daily.claim().ok, true);
});

test('daily: a missed day starts over at day 1', () => {
  const clock = fresh();
  meta.daily.claim(); clock.advance(DAY);
  meta.daily.claim(); clock.advance(DAY);
  assert.equal(meta.daily.claim().day, 3);
  clock.advance(2 * DAY); // skipped a day
  assert.equal(meta.daily.state().day, 1);
  assert.equal(meta.daily.claim().day, 1);
});

test('daily: a clock moved backwards never pays again', () => {
  const clock = fresh();
  meta.daily.claim();
  const gold = meta.gold();
  clock.advance(-DAY);
  assert.equal(meta.daily.state().canClaim, false);
  assert.equal(meta.daily.claim().ok, false);
  clock.advance(-5 * DAY);
  assert.equal(meta.daily.claim().ok, false);
  clock.advance(5 * DAY);
  assert.equal(meta.daily.claim().ok, false, 'back at the same day: still claimed');
  assert.equal(meta.gold(), gold);
});

test('daily: a clock moved forward 5 days pays one day-1 reward, once', () => {
  const clock = fresh();
  meta.daily.claim(); clock.advance(DAY); meta.daily.claim();
  clock.advance(5 * DAY);
  const r = meta.daily.claim();
  assert.equal(r.ok, true);
  assert.equal(r.day, 1);
  assert.equal(meta.daily.claim().ok, false);
});

test('daily: reward view lists 7 days with the right status', () => {
  const clock = fresh();
  meta.daily.claim(); clock.advance(DAY);
  const st = meta.daily.state();
  assert.equal(st.rewards.length, 7);
  assert.equal(st.rewards[0].status, 'claimed');
  assert.equal(st.rewards[1].status, 'next');
  assert.equal(st.rewards[2].status, 'upcoming');
});

// ---------- quests ----------
test('3 quests a day, same all day, new tomorrow', () => {
  const clock = fresh();
  const a = meta.quests.list();
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((q) => q.id)).size, 3);
  assert.deepEqual(meta.quests.list().map((q) => q.id), a.map((q) => q.id));
  clock.advance(DAY);
  const b = meta.quests.list();
  assert.equal(b.length, 3);
  assert.notDeepEqual(b.map((q) => q.id), a.map((q) => q.id));
});

test('a clock moved backwards keeps the same quests', () => {
  const clock = fresh();
  const a = meta.quests.list().map((q) => q.id);
  clock.advance(-3 * DAY);
  assert.deepEqual(meta.quests.list().map((q) => q.id), a);
});

test('quest progress, finish and claim once', () => {
  fresh();
  const q = meta.quests.list()[0];
  assert.equal(q.done, false);
  assert.equal(meta.quests.claim(q.id).ok, false, 'not finished');
  const statFor = { q_gems25: 'gems', q_gems80: 'gems', q_ore20: 'ore', q_depth100: 'maxDepthRun', q_depth250: 'maxDepthRun',
    q_depth500: 'maxDepthRun', q_drops5: 'drops', q_hauls3: 'hauls', q_combo10: 'maxCombo', q_combo25: 'maxCombo',
    q_chains20: 'chains', q_block5: 'blocked', q_crew5: 'crewBought', q_part1: 'partsBought', q_gold5k: 'goldEarned',
    q_gold1m: 'goldEarned', q_relic1: 'relics' };
  const stat = statFor[q.id];
  assert.ok(stat, `test knows quest ${q.id}`);
  if (['maxDepthRun', 'maxCombo'].includes(stat)) top(stat, q.target, stat === 'maxDepthRun' ? 'depth' : 'combo');
  else if (stat === 'goldEarned') meta.addGold(q.target);
  else bump(stat, q.target);
  const done = meta.quests.list()[0];
  assert.equal(done.done, true);
  assert.equal(done.canClaim, true);
  const shards = meta.shards();
  assert.equal(meta.quests.claim(q.id).ok, true);
  assert.equal(meta.shards(), shards + q.shards);
  assert.equal(meta.quests.claim(q.id).ok, false, 'second claim does nothing');
  assert.equal(meta.shards(), shards + q.shards);
  assert.equal(meta.quests.list()[0].claimed, true);
});

// ---------- achievements ----------
test('there are 30 achievements, each with a plain description and a reward', () => {
  fresh();
  const list = meta.achievements.list();
  assert.equal(list.length, 30);
  for (const a of list) assert.ok(a.name && a.desc && a.shards > 0 && a.target > 0);
  assert.equal(new Set(list.map((a) => a.id)).size, 30);
});

test('an achievement unlocks once, pays once and sends one event', () => {
  fresh();
  const seen = [];
  const off = bus.on('achievement:unlocked', (p) => seen.push(p.id));
  meta.addGold(1500);
  const first = check();
  assert.deepEqual(first, ['a_gold1k']);
  assert.equal(meta.shards(), 3);
  assert.deepEqual(check(), []);
  meta.addGold(10);
  assert.deepEqual(check(), []);
  assert.equal(meta.shards(), 3);
  assert.deepEqual(seen, ['a_gold1k']);
  assert.equal(meta.achievements.list().find((a) => a.id === 'a_gold1k').unlocked, true);
  off();
});

test('several achievements can unlock together', () => {
  fresh();
  s().stats.hauls = 30; s().stats.drops = 12; s().bestDepth = 260;
  const got = check().sort();
  assert.deepEqual(got, ['a_depth100', 'a_depth250', 'a_drops10', 'a_haul1', 'a_haul25'].sort());
});

// ---------- codex ----------
test('codex records once and sends one event', () => {
  fresh();
  const seen = [];
  const off = bus.on('codex:new', (p) => seen.push(p.id));
  assert.equal(meta.codex.record('biome:quartz'), true);
  assert.equal(meta.codex.record('biome:quartz'), false);
  assert.equal(meta.codex.has('biome:quartz'), true);
  assert.deepEqual(seen, ['biome:quartz']);
  for (const bad of [null, undefined, 5, '', {}, 'x'.repeat(500)]) assert.equal(meta.codex.record(bad), false);
  off();
});

test('codex lists parts, combos, biomes and relics; unfound entries are hidden', () => {
  fresh();
  const list = meta.codex.list();
  const kinds = new Set(list.map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), ['biome', 'combo', 'part', 'relic']);
  const hook = list.find((e) => e.id === 'part:hook');
  assert.equal(hook.found, true, 'owned parts count as found');
  const clay = list.find((e) => e.id === 'biome:clay');
  assert.equal(clay.found, false);
  assert.equal(clay.name, '???');
  meta.codex.record('biome:clay');
  assert.equal(meta.codex.list().find((e) => e.id === 'biome:clay').name, 'Clay');
  assert.ok(meta.codex.progress().fraction > 0 && meta.codex.progress().fraction < 1);
});

test('finding a combo can unlock a part', () => {
  fresh();
  meta.addGold(1e6);
  assert.equal(meta.partStatus('prism').state, 'locked');
  assert.equal(meta.buyPart('prism').ok, false);
  meta.codex.record('combo:twin_hooks');
  assert.equal(meta.partStatus('prism').state, 'buyable');
  assert.equal(meta.buyPart('prism').ok, true);
});
