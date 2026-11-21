import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS_CHEATS } from '../src/cheats/catalog-looks.js';
import * as book from '../src/meta/relicBook.js';
import * as looks from '../src/meta/cosmetics.js';
import { COSMETICS } from '../src/data/cosmetics.js';
import { RELICS } from '../src/data/relics.js';
import { s } from '../src/meta/state.js';

const byId = (id) => LOOKS_CHEATS.find((c) => c.id === id);

test('looks cheats: two cheats in the Progress group with plain labels', () => {
  assert.deepEqual(LOOKS_CHEATS.map((c) => c.id), ['relics_all', 'looks_all']);
  for (const c of LOOKS_CHEATS) { assert.equal(c.group, 'Progress'); assert.ok(c.label.length < 60); assert.equal(typeof c.run, 'function'); }
});

test('relics_all shows all relics on the Wall but earns no bonus', () => {
  s().cheated = true;
  const msg = byId('relics_all').run();
  assert.match(msg, /relics shown|already on the Wall/);
  assert.equal(book.count(), RELICS.length);
  assert.equal(book.earnedCount(), 0);
  assert.deepEqual(book.wallMods(), { gold: 0, luck: 0 });
  assert.match(byId('relics_all').run(), /already on the Wall/);
});

test('looks_all opens every Look only while the save is cheated', () => {
  s().cheated = true;
  assert.match(byId('looks_all').run(), /unlocked/);
  for (const c of COSMETICS) assert.equal(looks.isOwned(c.id), true, c.id);
  assert.equal(looks.equip('bkt_gilded'), true);
  assert.match(byId('looks_all').run(), /already/);
  s().cheated = false;
  assert.equal(looks.isOwned('bkt_gilded'), false); // the cheat opens nothing on a clean save
});
