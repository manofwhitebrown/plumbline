import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meta } from '../src/meta/index.js';
import { s, migrate, repair, defaults } from '../src/meta/state.js';
import { exportSave, importSave } from '../src/core/save.js';
import { fresh, T0 } from './meta-helpers.js';
import { setPartsProvider } from '../src/meta/partsApi.js';

const HOUR = 3600000;

test('save: export then import brings back the same game', () => {
  fresh();
  meta.addGold(5000);
  meta.addShards(12);
  s().parts.magnet = 1;
  s().bestDepth = 321;
  s().upgrades.rope = 3;
  const code = exportSave();
  assert.ok(code.startsWith('PL1.'));
  fresh();                                   // a different, empty game
  assert.equal(s().bestDepth, 0);
  const r = importSave(code);
  assert.equal(r.ok, true);
  assert.equal(s().gold, 5000);
  assert.equal(s().shards, 12);
  assert.equal(s().parts.magnet, 1);
  assert.equal(s().bestDepth, 321);
  assert.equal(s().upgrades.rope, 3);
});

test('save: bad codes change nothing and say why in plain words', () => {
  fresh();
  meta.addGold(77);
  for (const bad of ['', 'hello', 'PL1.', 'PL1.abc', 'PL1.abc.@@@@', null, 42, undefined]) {
    const r = importSave(bad);
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, 'string');
    assert.ok(!/undefined|null|NaN|exception/i.test(r.error), r.error);
  }
  const code = exportSave();
  const damaged = code.slice(0, -6) + 'AAAAAA';
  assert.equal(importSave(damaged).ok, false);
  assert.equal(s().gold, 77);
});

test('migration: an old stored save (version 0) loads with nothing lost', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/save-v0.json', import.meta.url), 'utf8'));
  const out = repair(migrate(old, 0));
  assert.equal(out.gold, 1234);
  assert.equal(out.bestDepth, 410);
  assert.deepEqual(out.parts, { hook: 1, magnet: 2 });
  assert.equal(out.crew.winch, 12);
  for (const k of Object.keys(defaults())) assert.ok(k in out, 'missing ' + k);
  // and it is safe to run it twice
  assert.deepEqual(repair(migrate(out, 1)), out);
});

test('migration: junk saves become a clean new game, never throw', () => {
  for (const junk of [null, undefined, 5, 'x', [], { gold: 'lots' }, { gold: NaN, parts: 7 }, { crew: { winch: -4 } }]) {
    let out;
    assert.doesNotThrow(() => { out = repair(migrate(junk, 0)); });
    assert.ok(Number.isFinite(out.gold) && out.gold >= 0);
    assert.ok(out.parts && out.parts.hook >= 1, 'always keeps a Hook');
  }
});

test('offline: away income waits, is claimed once, and is capped', () => {
  const clock = fresh();
  meta.addGold(1e6);
  assert.equal(meta.crew.buy('winch', 10).ok, true);
  meta.tick(100);
  clock.advance(2 * HOUR);
  const peek = meta.offline.peek();
  assert.ok(peek && peek.gold > 0);
  const before = meta.gold();
  const first = meta.offline.claim();
  assert.equal(first.ok, true);
  assert.ok(Math.abs(meta.gold() - before - first.gold) < 1e-6);
  assert.equal(meta.offline.claim().ok, false, 'no double claim');
  // a very long absence is capped, not infinite
  meta.tick(100);
  clock.advance(1000 * 24 * HOUR);
  const big = meta.offline.peek();
  assert.ok(big && Number.isFinite(big.gold) && big.gold < 1e12);
  // a clock that goes backwards pays nothing
  meta.offline.claim();
  meta.tick(100);
  clock.advance(-5 * HOUR);
  const back = meta.offline.peek();
  assert.ok(back === null || back.gold === 0);
});

test('collapse: needs depth and gold, resets the right things, keeps Core Dust', () => {
  fresh();
  assert.equal(meta.collapse.available(), false);
  assert.equal(meta.collapse.do().ok, false);
  s().bestDepth = 500;
  s().goldThisCollapse = 5e6;
  s().gold = 12345;
  s().parts = { hook: 1, magnet: 1 };
  s().upgrades = { rope: 2, deepstart: 1 };
  s().shards = 9;
  assert.equal(meta.collapse.available(), true);
  const preview = meta.collapse.preview();
  assert.ok(preview.coreDustGain >= 1);
  const r = meta.collapse.do();
  assert.equal(r.ok, true);
  assert.equal(meta.gold(), 0);
  assert.deepEqual(s().parts, { hook: 1 });
  assert.equal(s().upgrades.rope, undefined, 'gold upgrades reset');
  assert.equal(s().upgrades.deepstart, 1, 'shard upgrades stay');
  assert.equal(meta.shards(), 9);
  assert.equal(meta.coreDust(), r.coreDustGain);
  assert.equal(s().bestDepth, 500);
  assert.equal(meta.collapse.available(), false, 'cannot collapse twice in a row');
  assert.equal(meta.collapse.do().ok, false);
  assert.ok(meta.getMods().goldMult > 1, 'Core Dust makes gold worth more');
});

test('buying: parts and upgrades never take more gold than the player has', () => {
  fresh();
  meta.addGold(5);
  for (const id of ['magnet', 'net', 'ghost', null, 7]) assert.equal(meta.buyPart(id).ok, false);
  for (const u of meta.upgrades.list()) assert.equal(meta.upgrades.buy(u.id).ok === true, false);
  assert.equal(meta.gold(), 5);
  setPartsProvider(null);
});

test('every number from meta stays finite after a pile of odd calls', () => {
  fresh();
  for (const n of [NaN, Infinity, -Infinity, -5, 'x', null, undefined, {}, 1e308]) {
    meta.addGold(n); meta.addShards(n); meta.spendGold(n); meta.tick(n);
  }
  for (const v of [meta.gold(), meta.shards(), meta.coreDust(), meta.crew.perSecond()]) assert.ok(Number.isFinite(v) && v >= 0);
  const m = meta.getMods();
  for (const k of ['maxStrain', 'keepOnSnap', 'goldMult', 'strainMult', 'luck', 'startDepth']) assert.ok(Number.isFinite(m[k]), k);
  void T0;
});
