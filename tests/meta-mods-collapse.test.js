import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meta } from '../src/meta/index.js';
import { s, repair } from '../src/meta/state.js';
import { setLevel } from '../src/meta/upgrades.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { record } from '../src/meta/codex.js';
import { fresh } from './meta-helpers.js';

function checkMods(m) {
  for (const [k, v] of Object.entries(m)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} is not finite`);
  assert.ok(m.maxStrain >= 100 && m.maxStrain <= 1000);
  assert.ok(m.keepOnSnap >= 0.3 && m.keepOnSnap <= 0.6);
  assert.ok(m.goldMult >= 1);
  assert.ok(m.strainMult > 0 && m.strainMult <= 1);
  assert.ok(m.luck >= 0 && m.luck <= 1);
  assert.ok(m.startDepth >= 0);
  assert.ok([4, 5].includes(m.cols) && [3, 4].includes(m.rows));
  assert.ok(Array.isArray(m.unlockedParts) && m.unlockedParts.includes('hook'));
}

test('getMods on a fresh save is the plain starter set', () => {
  fresh();
  assert.deepEqual(meta.getMods(), {
    maxStrain: 100, keepOnSnap: 0.3, goldMult: 1, strainMult: 1, luck: 0, startDepth: 0,
    cols: 4, rows: 3, unlockedParts: ['hook'], twist: null, cheat: null,
  });
});

test('getMods with every upgrade maxed stays in range', () => {
  fresh();
  for (const u of UPGRADES) setLevel(u.id, u.max);
  const m = meta.getMods();
  checkMods(m);
  assert.equal(m.keepOnSnap, 0.6);
  assert.equal(m.maxStrain, 1000);
  assert.equal(m.cols, 5); assert.equal(m.rows, 4);
  assert.equal(m.strainMult, 0.68);
});

test('getMods survives broken saved values', () => {
  fresh();
  const st = s();
  st.upgrades = { rope: 1e99, grease: NaN, mender: -4, bucket: 'x', lantern: Infinity, ghost: 5 };
  st.coreDustTotal = NaN; st.coreDust = -3; st.gold = Infinity; st.shards = 'lots';
  st.parts = { hook: 'many', magnet: -2, fake_part: 9 };
  st.cheated = false; st.cheatMods = { noSnap: true };
  repair(st);
  checkMods(meta.getMods());
  assert.equal(meta.getMods().cheat, null, 'cheat settings are ignored when not cheated');
  assert.equal(st.gold, 0);
  assert.equal(st.shards, 0);
});

test('getMods includes owned parts and the daily twist only when switched on', () => {
  fresh();
  meta.addGold(1e6);
  s().parts.magnet = 1;
  assert.deepEqual(meta.getMods().unlockedParts.sort(), ['hook', 'magnet']);
  assert.equal(meta.getMods().twist, null);
  meta.daily.setTwist(true);
  assert.equal(typeof meta.getMods().twist, 'string');
  meta.daily.setTwist(false);
  assert.equal(meta.getMods().twist, null);
});

test('upgrades: buy, gate, currency, max level', () => {
  fresh();
  assert.equal(meta.upgrades.buy('rope').ok, false, 'no gold yet');
  meta.addGold(1e11); // [ECONOMY-2] the full rope ladder now costs about 9e9
  const r = meta.upgrades.buy('rope');
  assert.equal(r.ok, true);
  assert.equal(meta.getMods().maxStrain, 145);
  assert.equal(meta.upgrades.buy('mender').ok, false, 'needs depth');
  assert.match(meta.upgrades.buy('mender').error, /Depth/);
  for (let i = 0; i < 20; i++) meta.upgrades.buy('rope');
  assert.equal(meta.upgrades.info('rope').maxed, true);
  assert.equal(meta.upgrades.buy('rope').ok, false);
  assert.equal(meta.upgrades.info('rope').cost, null);
  assert.equal(meta.upgrades.buy('loadouts').ok, false, 'costs Shards');
  meta.addShards(100);
  assert.equal(meta.upgrades.buy('loadouts').ok, true);
  assert.equal(meta.upgrades.loadoutSlots(), 4);
});

test('auto-haul needs the upgrade, then keeps a safe percent', () => {
  fresh();
  assert.equal(meta.upgrades.setAutoHaul(70).ok, false);
  assert.equal(meta.upgrades.autoHaul(), 0);
  s().bestDepth = 100; meta.addShards(500);
  assert.equal(meta.upgrades.buy('autohaul').ok, true);
  assert.equal(meta.upgrades.setAutoHaul(70).pct, 70);
  assert.equal(meta.upgrades.autoHaul(), 70);
  assert.equal(meta.upgrades.setAutoHaul(5).pct, 30);
  assert.equal(meta.upgrades.setAutoHaul(999).pct, 95);
  assert.equal(meta.upgrades.setAutoHaul(0).pct, 0);
});

function readyForCollapse(gold = 8e7, depth = 600) {
  const st = s();
  st.bestDepth = depth; st.goldThisCollapse = gold; st.gold = 777;
  st.crew = { winch: 30, smithy: 12 }; st.managers = { winch: 1 };
  st.parts = { hook: 1, magnet: 1, net: 1 };
  st.upgrades = { rope: 3, deepstart: 2, cd_snap: 1 };
  st.shards = 42;
}

test('Collapse is locked until 500 m and 20M gold', () => {
  fresh();
  readyForCollapse(19999999, 600);
  assert.equal(meta.collapse.available(), false);
  assert.equal(meta.collapse.preview().coreDustGain, 0);
  assert.equal(meta.collapse.do().ok, false);
  assert.equal(s().gold, 777, 'nothing changed');
  readyForCollapse(8e7, 499);
  assert.equal(meta.collapse.available(), false);
  readyForCollapse(2e7, 500);
  assert.equal(meta.collapse.available(), true);
  assert.equal(meta.collapse.preview().coreDustGain, 2); // sqrt(2e7 / 1e7) * 1.5 = 2.1
});

test('Collapse preview equals the real gain', () => {
  fresh();
  readyForCollapse(4e7, 600);
  const preview = meta.collapse.preview();
  assert.equal(preview.coreDustGain, Math.floor(Math.sqrt(4) * 1.6));
  const before = meta.coreDust();
  const r = meta.collapse.do();
  assert.equal(r.ok, true);
  assert.equal(r.coreDustGain, preview.coreDustGain);
  assert.equal(meta.coreDust(), before + preview.coreDustGain);
});

test('Collapse resets gold, crew, parts and gold upgrades, and keeps the rest', () => {
  fresh();
  readyForCollapse();
  record('biome:clay');
  meta.collapse.do();
  const st = s();
  assert.equal(st.gold, 0);
  assert.equal(st.goldThisCollapse, 0);
  assert.deepEqual(st.crew, {});
  assert.deepEqual(st.managers, {});
  assert.deepEqual(st.parts, { hook: 1 });
  assert.equal(st.upgrades.rope, undefined, 'gold upgrade reset');
  assert.equal(st.upgrades.deepstart, 2, 'shard upgrade kept');
  assert.equal(st.upgrades.cd_snap, 1, 'core dust upgrade kept');
  assert.equal(st.shards, 42);
  assert.equal(st.bestDepth, 600);
  assert.equal(st.stats.collapses, 1);
  assert.equal(meta.codex.has('biome:clay'), true);
  checkMods(meta.getMods());
  assert.equal(meta.getMods().goldMult, 1 + 0.1 * meta.coreDust());
});

test('Core Dust upgrades: start parts, crew memory', () => {
  fresh();
  readyForCollapse();
  s().coreDust = 50; s().coreDustTotal = 50;
  assert.equal(meta.upgrades.buy('cd_start').ok, true);
  assert.equal(meta.upgrades.buy('cd_crew').ok, true);
  meta.collapse.do();
  assert.deepEqual(Object.keys(s().parts).sort(), ['hook', 'magnet']);
  assert.deepEqual(s().crew, { winch: 2, smithy: 2 });
  checkMods(meta.getMods());
});

test('pressing Collapse twice only works once', () => {
  fresh();
  readyForCollapse();
  const first = meta.collapse.do();
  const dust = meta.coreDust();
  const second = meta.collapse.do();
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(meta.coreDust(), dust);
  assert.equal(s().stats.collapses, 1);
});

test('getMods after several Collapses stays in range', () => {
  fresh();
  for (let i = 0; i < 5; i++) { readyForCollapse(1e12, 2000); meta.collapse.do(); checkMods(meta.getMods()); }
  assert.equal(s().stats.collapses, 5);
});
