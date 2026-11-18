import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collapseView, openCollapse } from '../src/ui/modalsCollapse.js';

test('Collapse view reads the preview from meta', () => {
  const v = collapseView({ available: true, coreDustGain: 42.9, goldBonusAfter: 5.2, keepsCrewEach: 2, startsWith: ['Hook', 'Magnet'],
    resets: ['Gold', 'Crew'], keeps: ['Core Dust', 'Codex'], needDepth: 500, needGold: 1e6 });
  assert.equal(v.available, true);
  assert.equal(v.gain, 42);
  assert.equal(v.bonusText, 'Your Gold bonus becomes +420%.');
  assert.deepEqual(v.resets, ['Gold', 'Crew']);
  assert.deepEqual(v.keeps, ['Core Dust', 'Codex']);
  assert.equal(v.crewText, 'You keep 2 of each Crew.');
  assert.equal(v.startText, 'You start with: Hook, Magnet.');
});

test('Collapse view falls back to plain defaults for bad input', () => {
  for (const bad of [null, undefined, {}, 5, 'x', { coreDustGain: NaN, resets: 'no', keeps: [1, null] }]) {
    const v = collapseView(bad);
    assert.equal(v.available, false, 'no gain means not ready');
    assert.equal(v.gain, 0);
    assert.deepEqual(v.resets, ['Gold', 'Crew', 'Parts']);
    assert.ok(v.keeps.includes('Core Dust'));
    assert.equal(v.bonusText, '');
    assert.match(v.needText, /best Depth/);
  }
});

test('Collapse view never shows a negative or odd number', () => {
  assert.equal(collapseView({ coreDustGain: -9 }).gain, 0);
  assert.equal(collapseView({ coreDustGain: 3, goldBonusAfter: 0.5 }).bonusText, '');
  assert.equal(collapseView({ coreDustGain: 3, keepsCrewEach: -1 }).crewText, '');
});

test('Collapse text uses only glossary words', () => {
  const v = collapseView({ coreDustGain: 3, goldBonusAfter: 1.3 });
  const all = [v.bonusText, ...v.resets, ...v.keeps, v.needText].join(' ');
  assert.equal(/\b(beat|lane|tick|slice|payload|NaN|undefined|null)\b/i.test(all), false);
});

test('opening Collapse with no page never throws', () => {
  assert.doesNotThrow(() => openCollapse());
});
