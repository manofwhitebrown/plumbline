import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideSections, familyShowcase, strainPerSecond, biomeSteps } from '../src/ui/screens/guideData.js';
import { ENGINE } from '../src/data/engine.js';
import { LIMITS, COLLAPSE } from '../src/data/upgrades.js';
import { CREW } from '../src/data/crew.js';
import { DAILY } from '../src/data/rewards.js';
import { PART_DATA, FAMILIES } from '../src/data/parts.js';
import { fmt, fmtDepth } from '../src/core/format.js';

const text = (sections) => sections.map((s) => s.lines.join(' ')).join(' ');
const BANNED = /\b(beat|lane|tick|entity|null|undefined|NaN|Infinity|seed|slice|bus|payload|debug)\b/i;

test('guide has the five sections in order', () => {
  assert.deepEqual(guideSections().map((s) => s.id), ['goal', 'parts', 'strain', 'crew', 'collapse']);
});

test('every number in the text comes from the data files', () => {
  const t = text(guideSections({ cols: 5, rows: 4 }));
  assert.ok(t.includes(fmt(LIMITS.baseMaxStrain) + ' Strain'));
  assert.ok(t.includes(Math.round(LIMITS.baseKeepOnSnap * 100) + '%'));
  assert.ok(t.includes(fmtDepth(COLLAPSE.minBestDepth)));
  assert.ok(t.includes(fmt(COLLAPSE.minGold) + ' Gold'));
  assert.ok(t.includes(Math.round(LIMITS.coreDustGoldEach * 100) + '%'));
  assert.ok(t.includes(CREW[0].name + ' costs ' + fmt(CREW[0].baseCost)));
  assert.ok(t.includes(CREW[CREW.length - 1].name + ' costs ' + fmt(CREW[CREW.length - 1].baseCost)));
  assert.ok(t.includes(DAILY.length + '-day'));
  assert.ok(t.includes('5 wide and 4 tall'));
  assert.ok(t.includes(biomeSteps()[1].name + ' starts at ' + fmtDepth(biomeSteps()[1].from)));
});

test('strain per second follows the engine formula', () => {
  const at0 = ENGINE.strainBase * (1000 / ENGINE.baseBeatMs) * ENGINE.baseSpeed;
  assert.ok(Math.abs(strainPerSecond(0) - at0) < 1e-9);
  assert.ok(strainPerSecond(500) > strainPerSecond(0));
  assert.equal(strainPerSecond(NaN), strainPerSecond(0));
  assert.equal(strainPerSecond(-5), strainPerSecond(0));
});

test('rig size falls back to the starter size on bad input', () => {
  for (const bad of [null, undefined, {}, { cols: 'x', rows: NaN }]) assert.ok(text(guideSections(bad)).includes('4 wide and 3 tall'));
});

test('collapse info from meta is used, bad info falls back', () => {
  assert.ok(text(guideSections(null, { resets: ['A', 'B'], keeps: ['C'] })).includes('It resets: A, B. You keep: C.'));
  assert.ok(text(guideSections(null, { resets: [], keeps: 5 })).includes('It resets: Gold, Crew, Parts.'));
  assert.ok(text(guideSections(null, null)).includes('You keep: Core Dust'));
});

test('player words only: no internal words, short sentences, plain text', () => {
  for (const s of guideSections({ cols: 4, rows: 3 })) {
    assert.ok(s.title.length <= 24);
    for (const line of s.lines) {
      assert.ok(!BANNED.test(line), line);
      assert.ok(!/NaN|undefined|Infinity/.test(line), line);
      for (const sentence of line.split(/(?<=[.!?:])\s/)) assert.ok(sentence.split(/\s+/).length <= 26, 'long sentence: ' + sentence);
    }
  }
});

test('family showcase covers every family and real parts', () => {
  const f = familyShowcase();
  assert.deepEqual(f.map((x) => x.family), FAMILIES);
  for (const fam of f) {
    assert.ok(fam.partIds.length >= 1);
    assert.ok(fam.sample.length >= 1 && fam.sample.length <= 3);
    for (const p of fam.sample) { assert.ok(PART_DATA[p.id]); assert.ok(p.name.length <= 14); }
    assert.ok(fam.title.length <= 12 && fam.line.length <= 40);
  }
});
