import test from 'node:test';
import assert from 'node:assert/strict';
import { recordLine, relicsFound, chasePills } from '../src/ui/screens/resultsBanners.js';
import { RELICS } from '../src/data/relics.js';

test('recordLine: past your best, or the first deep drop, never NaN', () => {
  assert.equal(recordLine({ depth: 162, bestBefore: 120 }), 'Past your best by 42 m');
  assert.equal(recordLine({ depth: 50, bestBefore: 0 }), 'Your deepest drop yet');
  assert.equal(recordLine({ depth: 100, bestBefore: 100 }), 'Your deepest drop yet');
  for (const bad of [null, undefined, {}, { depth: NaN, bestBefore: 'x' }]) assert.ok(!/NaN|undefined/.test(recordLine(bad)));
});

test('relicsFound: names known relics once, skips junk, counts the rest', () => {
  const ids = RELICS.slice(0, 5).map((x) => x.id);
  const f = relicsFound({ play: { relics: [ids[0], ids[0], 'nope', 7, null, ...ids.slice(1)] } });
  assert.equal(f.shown.length, 3);
  assert.equal(f.more, 2);
  assert.ok(f.shown.every((x) => x.name && x.name.length <= 22 && /^#/.test(x.color) && x.rarity));
  assert.deepEqual(relicsFound(null), { shown: [], more: 0 });
  assert.deepEqual(relicsFound({ play: { relics: 'x' } }), { shown: [], more: 0 });
});

test('chasePills: one pill per non-empty line, plain text only', () => {
  assert.deepEqual(chasePills({ near: '', tip: '' }), []);
  const p = chasePills({ near: 'Only 3 m from your best.', tip: 'Buy Mender now.' });
  assert.deepEqual(p.map((x) => x.id), ['near', 'tip']);
  assert.deepEqual(chasePills(null), []);
  assert.ok(chasePills({ near: 'x'.repeat(200) })[0].text.length <= 60);
});
