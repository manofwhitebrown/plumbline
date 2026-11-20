import test from 'node:test';
import assert from 'node:assert/strict';
import { cardModel, skillModel, bannerFor, guardianFrac, secondsLeft } from '../src/ui/logic/playModel.js';

test('card model: rarity words, tag names, rig boost text, safe on junk', () => {
  const c = cardModel({ id: 'x', name: 'Wide Grip', rarity: 'rare', tags: ['collector'], desc: 'd', power: 1.3 });
  assert.equal(c.rarityLabel, 'Rare'); assert.equal(c.tags[0].label, 'Collector'); assert.equal(c.boost, '+30% for your rig');
  assert.equal(cardModel({ id: 'y', power: 1 }).boost, '');
  assert.equal(cardModel(null).rarity, 'common'); assert.equal(cardModel(undefined).name, 'Boon');
  assert.equal(cardModel({ cost: 12.9 }).cost, 12);
});

test('skill model: sweep fills as the cooldown runs down; ready shows full', () => {
  assert.equal(skillModel({ id: 'brace', ready: false, cd: 30, total: 40 }).fill, 0.25);
  assert.equal(skillModel({ id: 'brace', ready: true, cd: 0, total: 0 }).fill, 1);
  assert.equal(skillModel({ id: 'surge', ready: true, charges: 2, max: 2 }).label, 'x2');
  assert.equal(skillModel({ id: 'surge', ready: true, charges: 1, max: 1 }).label, '');
  assert.equal(skillModel({ left: 3 }).active, true);
  assert.equal(skillModel(null).fill, 0);
});

test('banners: warnings and wins have words; quiet events have none', () => {
  assert.equal(bannerFor({ t: 'ENCOUNTER_WARN', text: 'Cave-In! Brace!' }).kind, 'warn');
  assert.equal(bannerFor({ t: 'ENCOUNTER_END', id: 'gem_vein', success: true }).text, 'A rich vein!');
  assert.equal(bannerFor({ t: 'ENCOUNTER_END', id: 'gem_vein', success: false }), null);
  assert.ok(bannerFor({ t: 'GUARDIAN_DOWN', name: 'Stone Warden', won: true }).text.includes('falls'));
  assert.equal(bannerFor({ t: 'BEAT' }), null); assert.equal(bannerFor(null), null); assert.equal(bannerFor({}), null);
});

test('guardian bar and picker timer stay in range', () => {
  assert.equal(guardianFrac({ hp: 50, maxHp: 100 }), 0.5); assert.equal(guardianFrac({ hp: -5, maxHp: 100 }), 0); assert.equal(guardianFrac(null), 0);
  assert.equal(secondsLeft(0, 2000, 6), 4); assert.equal(secondsLeft(0, 99999, 6), 0);
});
