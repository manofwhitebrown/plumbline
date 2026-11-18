import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meta } from '../src/meta/index.js';
import { fresh } from './meta-helpers.js';

test('every contract function exists and gives safe values on a fresh save', () => {
  fresh();
  assert.equal(meta.gold(), 0);
  assert.equal(meta.shards(), 0);
  assert.equal(meta.coreDust(), 0);
  assert.deepEqual(meta.ownedParts(), { hook: 1 });
  assert.equal(typeof meta.getMods(), 'object');
  assert.equal(meta.crew.perSecond(), 0);
  assert.equal(meta.offline.peek(), null);
  assert.equal(meta.collapse.available(), false);
  assert.equal(meta.collapse.preview().coreDustGain, 0);
  assert.ok(Array.isArray(meta.upgrades.list()));
  assert.ok(Array.isArray(meta.crew.list()));
  assert.ok(Array.isArray(meta.quests.list()));
  assert.equal(meta.achievements.list().length, 30);
  assert.ok(Array.isArray(meta.codex.list()));
  assert.equal(typeof meta.stats.get(), 'object');
  assert.equal(typeof meta.daily.state(), 'object');
  meta.tick(100);
});

test('bad input fails soft', () => {
  fresh();
  assert.equal(meta.addGold(NaN), 0);
  assert.equal(meta.addGold(-5), 0);
  assert.equal(meta.addGold(Infinity), 0);
  assert.equal(meta.spendGold(-1), false);
  assert.equal(meta.spendGold(undefined), false);
  assert.equal(meta.spendShards(NaN), false);
  assert.equal(meta.buyPart(null).ok, false);
  assert.equal(meta.buyPart('nope').ok, false);
  assert.equal(meta.crew.buy('nope').ok, false);
  assert.equal(meta.upgrades.buy('nope').ok, false);
  assert.equal(meta.quests.claim('nope').ok, false);
  meta.tick(NaN); meta.tick(-5); meta.tick(1e12);
  assert.ok(Number.isFinite(meta.gold()));
});
