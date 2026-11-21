import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COSMETICS, LOOK_KINDS, DEFAULT_LOOKS, WALL_BONUSES, WALL_HINTS, WALL_TOTAL, cosmeticById } from '../src/data/cosmetics.js';
import { RELICS } from '../src/data/relics.js';
import { ACHIEVEMENTS } from '../src/data/rewards.js';

const FORBIDDEN = /\b(beat|lane|tick|entity|null|undefined|NaN|Infinity|seed|slice|bus|payload|debug|hazard|tier)\b/i;
const HEX = /^#[0-9a-f]{6}$/i;

test('hook3 data: about 12 looks, three kinds, one free default each', () => {
  assert.equal(COSMETICS.length, 12);
  for (const k of LOOK_KINDS) {
    const of = COSMETICS.filter((c) => c.kind === k);
    assert.ok(of.length >= 3, k);
    assert.equal(of.filter((c) => c.unlock.t === 'free').length, 1, 'one free look for ' + k);
    assert.equal(cosmeticById(DEFAULT_LOOKS[k]).unlock.t, 'free');
  }
  assert.equal(new Set(COSMETICS.map((c) => c.id)).size, COSMETICS.length);
});

test('hook3 data: text limits and plain words', () => {
  for (const c of COSMETICS) {
    assert.ok(c.name.length <= 14, 'name ' + c.name);
    assert.ok(c.desc.length <= 90, 'desc ' + c.id);
    assert.ok(c.how.length <= 40, 'how ' + c.id);
    for (const t of [c.name, c.desc, c.how]) assert.ok(!FORBIDDEN.test(t), 'plain words: ' + t);
  }
  for (const b of WALL_BONUSES) { assert.ok(b.text.length <= 28); assert.ok(!FORBIDDEN.test(b.text)); }
  for (const t of Object.values(WALL_HINTS)) { assert.ok(t.length <= 40); assert.ok(!FORBIDDEN.test(t)); }
});

test('hook3 data: unlock rules point at real things and costs are small', () => {
  const ach = new Set(ACHIEVEMENTS.map((a) => a.id));
  for (const c of COSMETICS) {
    if (c.unlock.t === 'ach') assert.ok(ach.has(c.unlock.id), c.id);
    if (c.unlock.t === 'relics') assert.ok(c.unlock.n >= 1 && c.unlock.n <= WALL_TOTAL, c.id);
    if (c.unlock.t === 'shards') assert.ok(c.unlock.cost > 0 && c.unlock.cost <= 100, c.id + ' small price');
    const l = c.look;
    if (c.kind === 'well') { assert.ok(HEX.test(l.top) && HEX.test(l.bottom)); } else assert.ok(HEX.test(l.tint));
    assert.ok(l.alpha >= 0 && l.alpha <= 0.5, 'tints stay gentle: ' + c.id);
  }
});

test('hook3 data: wall bonuses are tiny and in order; 36 relics', () => {
  assert.equal(RELICS.length, WALL_TOTAL);
  assert.deepEqual(WALL_BONUSES.map((b) => b.at), [10, 20, 36]);
  for (const b of WALL_BONUSES) assert.ok(b.pct > 0 && b.pct <= 0.03, 'tiny');
  for (const r of RELICS) assert.ok(r.name.length <= 20 && r.hint.length <= 90, r.id);
});
