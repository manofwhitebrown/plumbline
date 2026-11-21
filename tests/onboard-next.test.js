import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStepLine, readProgress, NEXT_MAX } from '../src/tutorial/nextStep.js';
import { guideSections } from '../src/ui/screens/guideData.js';
import { HELP } from '../src/data/help.js';

const NEVER = /\b(beat|lane|tick|entity|null|undefined|NaN|Infinity|seed|slice|bus|payload|debug|hazard|tier)\b/i;

test('what to do next changes with progress', () => {
  assert.match(nextStepLine({ best: 0 }), /Drop/);
  assert.match(nextStepLine({ best: 30, partsOwned: 1, canBuyPart: true }), /Workshop/);
  assert.match(nextStepLine({ best: 30, partsOwned: 1, canBuyPart: false }), /Drop again/);
  assert.match(nextStepLine({ best: 80, partsOwned: 3, crewOwned: 0, canBuyCrew: true }), /Crew/);
  assert.match(nextStepLine({ best: 600, partsOwned: 9, crewOwned: 4, collapseReady: true }), /Collapse/);
  assert.match(nextStepLine({ best: 90, partsOwned: 3, crewOwned: 2, canClaimDaily: true }), /daily/);
  assert.match(nextStepLine({ best: 90, partsOwned: 3, crewOwned: 2 }), /one more meter/i);
});

test('every next-step line fits and uses plain words', () => {
  const cases = [{}, null, 'x', { best: 0 }, { best: 5, partsOwned: 1, canBuyPart: true }, { best: 5, partsOwned: 1 },
    { best: 9, partsOwned: 4, crewOwned: 0, canBuyCrew: true }, { best: 9, partsOwned: 4, crewOwned: 1, collapseReady: true },
    { best: 9, partsOwned: 4, crewOwned: 1, canClaimDaily: true }, { best: 9, partsOwned: 4, crewOwned: 1, canBuyPart: true },
    { best: 9, partsOwned: 4, crewOwned: 1, canBuyCrew: true }, { best: 9, partsOwned: 4, crewOwned: 1 }];
  for (const c of cases) {
    const t = nextStepLine(c);
    assert.ok(t.length > 5 && t.length <= NEXT_MAX, t + ' ' + t.length);
    assert.ok(!NEVER.test(t), t);
  }
});

test('readProgress never throws, even with a broken api', () => {
  for (const bad of [undefined, null, {}, { meta: {} }, { meta: { ownedParts: () => { throw new Error('x'); } } }]) {
    const p = readProgress(bad, 'abc');
    assert.equal(p.best, 0);
    assert.equal(p.partsOwned, 0);
    assert.equal(typeof nextStepLine(p), 'string');
  }
  const p = readProgress({
    allParts: () => [{ id: 'magnet' }],
    meta: { ownedParts: () => ['hook'], partStatus: () => ({ state: 'buyable' }), crew: { list: () => [{ owned: 2, canBuy: true }, { count: 1 }] },
      collapse: { available: () => true }, daily: { state: () => ({ canClaim: true }) } },
  }, 55);
  assert.deepEqual(p, { best: 55, partsOwned: 1, canBuyPart: true, crewOwned: 3, canBuyCrew: true, collapseReady: true, canClaimDaily: true });
});

test('the guide has a words section built from the same help lines', () => {
  const words = guideSections().find((s) => s.id === 'words');
  assert.ok(words && words.lines.length >= 10);
  for (const l of words.lines) {
    assert.ok(Object.values(HELP).some((e) => e.text === l), 'guide line is not a help line: ' + l);
  }
});
