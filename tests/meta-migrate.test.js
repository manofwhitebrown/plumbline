import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, defaults, repair, META_VERSION } from '../src/meta/state.js';

// A save from the first prototype (version 0).
const V0 = {
  gold: 1234, shards: 56, coreDust: 3, best: 410, lifetimeGold: 98000,
  parts: ['hook', 'magnet', 'magnet'],
  crew: { winch: 12, smithy: 3 },
  upgrades: { rope: 2 },
  stats: { drops: 20, hauls: 11, snaps: 9 },
};

test('a v0 save upgrades with no data loss', () => {
  const out = repair(migrate(V0, 0));
  assert.equal(out.gold, 1234);
  assert.equal(out.shards, 56);
  assert.equal(out.coreDust, 3);
  assert.equal(out.coreDustTotal, 3);
  assert.equal(out.bestDepth, 410);
  assert.equal(out.goldThisCollapse, 98000);
  assert.equal(out.stats.goldEarned, 98000);
  assert.deepEqual(out.parts, { hook: 1, magnet: 2 });
  assert.deepEqual(out.crew, { winch: 12, smithy: 3 });
  assert.deepEqual(out.upgrades, { rope: 2 });
  assert.equal(out.stats.drops, 20);
  assert.equal(out.stats.hauls, 11);
  assert.equal(out.stats.snaps, 9);
  // every new field exists
  for (const k of Object.keys(defaults())) assert.ok(k in out, `missing ${k}`);
  assert.equal(out.cheated, false);
});

test('migrating the current version keeps everything and adds nothing odd', () => {
  const now = { ...defaults(), gold: 5, bestDepth: 77 };
  const out = migrate(now, META_VERSION);
  assert.equal(out.gold, 5);
  assert.equal(out.bestDepth, 77);
});

test('garbage saves become safe defaults', () => {
  for (const bad of [null, undefined, 5, 'x', [], NaN]) {
    const out = repair(migrate(bad, 0));
    assert.equal(out.gold, 0);
    assert.deepEqual(out.parts, { hook: 1 });
  }
});

test('repair removes bad numbers and cheat settings on a clean save', () => {
  const bad = { ...defaults(), gold: NaN, shards: -5, bestDepth: Infinity, crew: { winch: -3, cart: 'x', lamp: 4.9 }, cheatMods: { noSnap: true }, cheatStartDepth: 900 };
  const out = repair(bad);
  assert.equal(out.gold, 0);
  assert.equal(out.shards, 0);
  assert.ok(Number.isFinite(out.bestDepth));
  assert.deepEqual(out.crew, { lamp: 4 });
  assert.equal(out.cheatMods, null);
  assert.equal(out.cheatStartDepth, 0);
});
