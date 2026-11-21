import test from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, relicSvg } from '../src/ui/screens/wallShapes.js';
import { RELICS } from '../src/data/relics.js';
import { wallModel, looksModel } from '../src/ui/screens/wallModel.js';
import { COSMETICS } from '../src/data/cosmetics.js';
import * as book from '../src/meta/relicBook.js';
import * as looks from '../src/meta/cosmetics.js';
import { s } from '../src/meta/state.js';

test('every relic has a drawn shape', () => {
  for (const r of RELICS) assert.ok(SHAPES[r.shape], 'shape ' + r.shape + ' for ' + r.id);
  assert.match(relicSvg('bowl', '#ffb454', false, 40), /<svg/);
  assert.match(relicSvg('nonsense', 'bad', true), /1c2236/); // unknown shape and colour fail soft
});

test('wall model: 36 cards in six Biome groups, hidden ones say ??? and give a hint', () => {
  const m = wallModel();
  assert.equal(m.groups.length, 6);
  assert.equal(m.groups.reduce((n, g) => n + g.cards.length, 0), 36);
  const hid = m.groups[0].cards[0];
  assert.equal(hid.found, false); assert.equal(hid.name, '???'); assert.match(hid.line, /Hides in/);
  assert.match(m.nextLine, /10 more relics for \+1% Gold/);
  assert.equal(m.total, 36);
});

test('wall model: finding relics moves the count and the next bonus line', () => {
  s().cheated = false;
  for (const r of RELICS.slice(0, 9)) book.record(r.id);
  let m = wallModel();
  assert.equal(m.found, 9);
  assert.match(m.nextLine, /1 more relic for \+1% Gold/);
  book.record(RELICS[9].id);
  m = wallModel();
  assert.equal(m.bonuses[0].reached, true);
  assert.match(m.nextLine, /10 more relics for \+1% better gems/);
  assert.deepEqual(book.wallMods(), { gold: 0.01, luck: 0 });
  for (const r of RELICS) book.record(r.id);
  m = wallModel();
  assert.equal(m.found, 36);
  assert.equal(m.nextLine, 'Every Wall bonus is yours.');
});

test('looks model: three groups, free ones worn, shard ones can be bought', () => {
  const m = looksModel();
  assert.equal(m.groups.length, 3);
  assert.equal(m.groups.reduce((n, g) => n + g.items.length, 0), COSMETICS.length);
  assert.ok(m.groups.every((g) => g.items.some((i) => i.worn)));
  s().shards = 100;
  const gilded = looksModel().groups[0].items.find((i) => i.id === 'bkt_gilded');
  assert.equal(gilded.canBuy, true);
  assert.equal(looks.buy('bkt_gilded').ok, true);
  assert.equal(s().shards, 40);
  assert.equal(looks.equip('bkt_gilded'), true);
  assert.equal(looksModel().groups[0].items.find((i) => i.id === 'bkt_gilded').worn, true);
});
