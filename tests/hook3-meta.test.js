import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './meta-helpers.js';
import { bus } from '../src/core/bus.js';
import { s, markCheated } from '../src/meta/state.js';
import * as book from '../src/meta/relicBook.js';
import * as cos from '../src/meta/cosmetics.js';
import { RELICS } from '../src/data/relics.js';
import { exportSave, importSave } from '../src/core/save.js';

const ids = (n) => RELICS.slice(0, n).map((r) => r.id);

test('relic book: a Drop that ends files its relics once; unknown ids are ignored', () => {
  fresh();
  bus.emit('run:ended', { play: { relics: [RELICS[0].id, RELICS[0].id, 'nope', 5, RELICS[7].id] } });
  assert.equal(book.earnedCount(), 2);
  assert.equal(book.record(RELICS[0].id), false, 'first time only');
  const w = book.wall();
  assert.equal(w.found, 2); assert.equal(w.total, 36); assert.equal(w.next.at, 10);
  const l = book.list();
  assert.equal(l.length, 36);
  assert.equal(l[0].name, RELICS[0].name); assert.equal(l[1].name, '???');
  assert.ok(l[1].line.length > 0 && l[1].line !== RELICS[1].hint, 'hidden ones show a Biome hint, not the real sentence');
});

test('relic book: new finds make a gold dot until seen', () => {
  fresh();
  book.record(RELICS[3].id);
  assert.equal(book.unseenCount(), 1);
  assert.equal(book.list()[3].isNew, true);
  book.markSeen(RELICS[3].id);
  assert.equal(book.unseenCount(), 0);
  book.recordMany(ids(5)); book.markAllSeen();
  assert.equal(book.unseenCount(), 0);
});

test('relic book: wall bonus at 10, 20 and 36 and nothing before', () => {
  fresh();
  book.recordMany(ids(9)); assert.deepEqual(book.wallMods(), { gold: 0, luck: 0 });
  book.recordMany(ids(10)); assert.deepEqual(book.wallMods(), { gold: 0.01, luck: 0 });
  book.recordMany(ids(20)); assert.deepEqual(book.wallMods(), { gold: 0.01, luck: 0.01 });
  book.recordMany(ids(36)); assert.deepEqual(book.wallMods(), { gold: 0.03, luck: 0.01 });
  assert.ok(book.wall().bonuses.every((b) => b.reached) && book.wall().next === null);
});

test('relic book: cheated saves find nothing; cheat relics show but never count', () => {
  fresh();
  markCheated();
  assert.equal(book.record(RELICS[0].id), false);
  bus.emit('run:ended', { play: { relics: ids(12) } });
  assert.equal(book.earnedCount(), 0);
  assert.equal(book.recordAllCheat(), 36);
  assert.equal(book.count(), 36); assert.equal(book.earnedCount(), 0);
  assert.deepEqual(book.wallMods(), { gold: 0, luck: 0 });
  assert.equal(book.list().every((x) => x.found), true);
});

test('relic book: save migration keeps real data, drops junk, accepts old shapes', () => {
  const m = book.migrate({ found: { [RELICS[0].id]: 5, zzz: 9 }, seen: { [RELICS[0].id]: 1 }, extra: 1 }, 1);
  assert.deepEqual(Object.keys(m.found), [RELICS[0].id]); assert.deepEqual(m.cheat, {}); assert.equal(m.seen[RELICS[0].id], true);
  assert.deepEqual(Object.keys(book.migrate([RELICS[2].id, 'bad'], 0).found), [RELICS[2].id]);
  assert.deepEqual(book.migrate(null, 0), book.defaults());
  assert.deepEqual(book.migrate('x', 0), book.defaults());
});

test('cosmetics: free looks are owned and worn from the start', () => {
  fresh();
  assert.deepEqual(cos.equippedIds(), { bucket: 'bkt_oak', rope: 'rp_hemp', well: 'wl_dusk' });
  assert.equal(cos.ownedCount(), 3);
  assert.equal(cos.equip('bkt_copper'), false, 'cannot wear what you do not own');
});

test('cosmetics: relics and achievements unlock looks by themselves', () => {
  fresh();
  book.recordMany(ids(6));
  assert.equal(cos.isOwned('bkt_copper'), true);
  assert.equal(cos.isOwned('rp_ember'), false);
  assert.equal(cos.status('bkt_copper').isNew, true);
  assert.equal(cos.equip('bkt_copper'), true);
  assert.equal(cos.equipped('bucket').id, 'bkt_copper');
  assert.equal(cos.status('bkt_copper').isNew, false);
  s().achievements.a_combo15 = 1; bus.emit('achievement:unlocked', { id: 'a_combo15' });
  assert.equal(cos.isOwned('rp_star'), true);
  book.recordMany(ids(20)); assert.equal(cos.isOwned('wl_rose'), true);
});

test('cosmetics: Shard looks are bought once and cost Shards', () => {
  fresh();
  assert.deepEqual(cos.buy('rp_blue'), { ok: false, reason: 'shards' });
  s().shards = 100;
  assert.deepEqual(cos.buy('rp_blue'), { ok: true });
  assert.equal(s().shards, 70);
  assert.equal(cos.buy('rp_blue').ok, false, 'no double buy'); assert.equal(s().shards, 70);
  assert.equal(cos.buy('bkt_copper').ok, false, 'relic looks are not for sale');
  assert.equal(cos.buy('nope').ok, false);
});

test('cosmetics: cheated saves cannot earn or buy; the cheat opens them only while cheated', () => {
  fresh();
  s().shards = 500; markCheated();
  book.record(RELICS[0].id); // blocked
  assert.deepEqual(cos.buy('rp_blue'), { ok: false, reason: 'cheated' });
  assert.equal(s().shards, 500);
  s().achievements.a_combo15 = 1; assert.deepEqual(cos.evaluate(), []);
  assert.equal(cos.isOwned('rp_star'), false);
  cos.setCheatAll();
  assert.ok(cos.list().every((c) => c.owned));
  assert.equal(cos.equip('bkt_gilded'), true);
  assert.equal(cos.equipped('bucket').id, 'bkt_gilded');
});

test('cosmetics: a look that is no longer owned falls back to the free one; bad saves repair', () => {
  fresh();
  const m = cos.migrate({ owned: { bkt_copper: 1, zzz: 1 }, equipped: { bucket: 'rp_hemp', rope: 'rp_ember', well: 'nope' }, seen: { bkt_copper: 1 } }, 1);
  assert.deepEqual(Object.keys(m.owned), ['bkt_copper']);
  assert.deepEqual(m.equipped, { bucket: 'bkt_oak', rope: 'rp_ember', well: 'wl_dusk' }, 'wrong kind and unknown ids are dropped');
  assert.deepEqual(cos.migrate(7, 0), cos.defaults());
  assert.equal(cos.equipped('rope').id, 'rp_hemp', 'rope ember is not owned in this save');
});

test('save round trip keeps the book and the looks', () => {
  fresh();
  book.recordMany(ids(7)); cos.equip('bkt_copper');
  const text = exportSave();
  fresh();
  assert.equal(book.earnedCount(), 0);
  const r = importSave(text);
  assert.equal(r.ok, true);
  assert.equal(book.earnedCount(), 7);
  assert.equal(cos.equipped('bucket').id, 'bkt_copper');
});
