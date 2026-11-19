import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCheats } from '../src/cheats/index.js';
import { createGate } from '../src/cheats/gate.js';
import { sha256Hex } from '../src/cheats/sha256.js';
import { meta } from '../src/meta/index.js';
import { s } from '../src/meta/state.js';
import { check } from '../src/meta/achievements.js';
import { record } from '../src/meta/codex.js';
import { onRunEnded } from '../src/meta/runhooks.js';
import { fresh } from './meta-helpers.js';

const PW = 'throwaway-test-pw-91';

function unlockedCheats() {
  const c = makeCheats(createGate({ expectedHash: sha256Hex('plumbline:' + PW) }));
  c.reveal();
  assert.equal(c.tryPassword(PW), true);
  return c;
}

function allFinite(o, path = '') {
  if (typeof o === 'number') assert.ok(Number.isFinite(o), `${path} is not finite: ${o}`);
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) allFinite(o[k], `${path}.${k}`);
}

function assertSane() {
  const m = meta.getMods();
  allFinite(m, 'mods');
  assert.ok(m.keepOnSnap <= 0.6 && m.keepOnSnap >= 0.3);
  assert.ok(m.luck >= 0 && m.luck <= 1);
  assert.ok([4, 5].includes(m.cols) && [3, 4].includes(m.rows));
  for (const v of [meta.gold(), meta.shards(), meta.coreDust(), meta.crew.perSecond()]) assert.ok(Number.isFinite(v) && v >= 0);
  allFinite(meta.stats.get(), 'stats');
}

test('every cheat in the menu runs, keeps values finite, and flags the save', () => {
  fresh();
  const c = unlockedCheats();
  const ids = c.list().flatMap((g) => g.items.filter((i) => !i.needsConfirm).map((i) => i.id));
  assert.ok(ids.length >= 45, `expected a full menu, got ${ids.length}`);
  assert.equal(meta.isCheated(), false);
  for (const id of ids) {
    const r = c.run(id);
    assert.equal(r.ok, true, `${id} failed: ${r.text}`);
    assert.ok(typeof r.text === 'string' && r.text.length > 0, `${id} gave no message`);
    assertSane();
  }
  assert.equal(meta.isCheated(), true);
});

test('the menu has every group from the mission', () => {
  fresh();
  const c = unlockedCheats();
  assert.deepEqual(c.list().map((g) => g.group), ['Money', 'Parts and Rig', 'Upgrades', 'Run helpers', 'Time', 'Progress', 'Tools']);
  assert.ok(c.list().every((g) => g.items.length > 0));
});

test('money cheats change the right numbers', () => {
  fresh();
  const c = unlockedCheats();
  c.run('gold_1k'); assert.equal(meta.gold(), 1000);
  c.run('gold_1m'); assert.equal(meta.gold(), 1_001_000);
  c.run('gold_x1000'); assert.equal(meta.gold(), 1_001_000_000);
  c.run('shards_100'); assert.equal(meta.shards(), 100);
  c.run('core_10'); assert.equal(meta.coreDust(), 10);
  assert.equal(meta.getMods().goldMult, 2);
  c.run('gold_zero'); assert.equal(meta.gold(), 0);
  // cheat gold never counts as earned
  assert.equal(meta.stats.get().goldEarned, 0);
});

test('parts, bucket and upgrade cheats', () => {
  fresh();
  const c = unlockedCheats();
  c.run('parts_all');
  assert.ok(Object.keys(meta.ownedParts()).length >= 5);
  c.run('parts_x5');
  assert.equal(meta.ownedParts().magnet, 5);
  c.run('bucket_big');
  assert.equal(meta.getMods().cols, 5);
  assert.equal(meta.getMods().rows, 4);
  c.run('upg_max');
  assert.equal(meta.getMods().keepOnSnap, 0.6);
  assert.equal(meta.getMods().maxStrain, 1000);
  c.run('upg_reset');
  assert.equal(meta.getMods().maxStrain, 100);
  assert.equal(meta.getMods().cols, 4);
  c.run('parts_clear');
  assert.deepEqual(meta.ownedParts(), { hook: 1 });
});

test('run helpers go into mods.cheat only when cheated', () => {
  fresh();
  const c = unlockedCheats();
  assert.equal(meta.getMods().cheat, null);
  c.run('no_snap'); c.run('speed_4'); c.run('biome_magma'); c.run('gold_x10'); c.run('start_500');
  const m = meta.getMods();
  assert.equal(m.cheat.noSnap, true);
  assert.equal(m.cheat.speedMult, 4);
  assert.equal(m.cheat.forceBiome, 'magma');
  assert.equal(m.cheat.goldMult, 10);
  assert.equal(m.startDepth, 500);
  c.run('no_snap');
  assert.equal(meta.getMods().cheat.noSnap, false);
  const on = c.list().find((g) => g.group === 'Run helpers').items.find((i) => i.id === 'speed_4');
  assert.equal(on.on, true);
});

test('time and progress cheats', () => {
  fresh();
  const c = unlockedCheats();
  meta.addGold(1e6); meta.crew.buy('winch', 'max');
  assert.ok(meta.crew.perSecond() > 0);
  c.run('away_8h');
  const off = meta.offline.peek();
  assert.ok(off && off.gold > 0);
  c.run('quests_all');
  assert.ok(meta.quests.list().every((q) => q.done));
  c.run('collapse_ready');
  assert.equal(meta.collapse.available(), true);
  c.run('codex_all');
  assert.equal(meta.codex.progress().fraction, 1);
  c.run('ach_all');
  assert.ok(meta.achievements.list().every((a) => a.unlocked));
  c.run('best_1000');
  assert.equal(meta.stats.get().bestDepth, 1000);
  const before = meta.daily.state().canClaim;
  if (!before) assert.equal(c.run('daily_again').ok, true);
  assert.equal(meta.daily.state().canClaim, true);
});

test('cheated flag blocks records, achievements and codex finds', () => {
  fresh();
  const c = unlockedCheats();
  c.run('gold_1k');
  assert.equal(meta.isCheated(), true);
  onRunEnded({ outcome: 'hauled', depth: 321, partsUsed: ['hook'] });
  assert.equal(meta.stats.get().bestDepth, 0, 'no new best depth');
  assert.deepEqual(check(), [], 'no achievements');
  assert.equal(meta.achievements.list().some((a) => a.unlocked), false);
  assert.equal(record('biome:clay'), false, 'no codex find');
  assert.equal(meta.codex.has('biome:clay'), false);
});

test('tools do not mark the save; reset needs two presses', () => {
  fresh();
  const c = unlockedCheats();
  for (const id of ['tool_fps', 'tool_log', 'tool_export']) assert.equal(c.run(id).ok, true);
  assert.equal(meta.isCheated(), false);
  assert.equal(c.run('tool_log').data.length <= 50, true);
  meta.addGold(500);
  const first = c.run('reset_all');
  assert.equal(first.needsConfirm, true);
  assert.equal(meta.gold(), 500, 'first press changes nothing');
  assert.equal(c.run('reset_all').ok, true);
  assert.equal(meta.gold(), 0);
  assert.equal(c.isUnlocked(), false, 'panel locks again after a wipe');
});

test('clear cheat flag and reset works without the password', () => {
  fresh();
  const c = unlockedCheats();
  c.run('gold_1m');
  assert.equal(meta.isCheated(), true);
  c.lock();
  assert.equal(c.clearFlagAndReset().ok, true);
  assert.equal(meta.isCheated(), false);
  assert.equal(meta.gold(), 0);
});

test('locked menu refuses everything', () => {
  fresh();
  const c = makeCheats(createGate({ expectedHash: sha256Hex('plumbline:' + PW) }));
  assert.equal(c.run('gold_1m').ok, false);
  assert.equal(meta.gold(), 0);
  assert.equal(meta.isCheated(), false);
});

test('state stays valid after cheat use (cheatMods are sane)', () => {
  fresh();
  const c = unlockedCheats();
  c.run('speed_2'); c.run('gold_x10');
  const st = s();
  assert.equal(st.cheated, true);
  assert.ok(st.cheatMods && Number.isFinite(st.cheatMods.speedMult));
});
