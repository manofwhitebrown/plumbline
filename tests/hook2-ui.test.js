import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diveView, chestMessage } from '../src/ui/screens/diveUi.js';
import { contractsView, contractClaimMessage } from '../src/ui/screens/contractsUi.js';
import { masteryView } from '../src/ui/screens/masteryUi.js';
import * as C from '../src/meta/contracts.js';
import * as D from '../src/meta/dive.js';
import * as M from '../src/meta/mastery.js';
import { s } from '../src/meta/state.js';
import { TWIST_DATA } from '../src/data/twists.js';
import { DIVE_CHEST_NAMES, DIVE_TEXT } from '../src/data/dive.js';
import { CONTRACTS } from '../src/data/contracts.js';
import { MASTERY_TEXT } from '../src/data/mastery.js';
import { fresh } from './meta-helpers.js';
import { resetAll, exportSave, importSave } from '../src/core/save.js';

const BANNED = /\b(beat|lane|tick|entity|null|undefined|NaN|Infinity|seed|slice|bus|payload|debug|hazard|tier|XP)\b/i;

test('contracts view: bad input is safe, long text is cut at 28', () => {
  assert.deepEqual(contractsView(null).items, []);
  assert.equal(contractsView(undefined).sub, 'No contracts right now.');
  const v = contractsView([{ id: 'x', text: 'y'.repeat(80), target: 0, progress: 'bad', done: false, reward: { type: 'gold', amount: 1500 } }, null, 5]);
  assert.equal(v.items.length, 1);
  assert.ok(v.items[0].text.length <= 28);
  assert.equal(v.items[0].fraction, 0);
});

test('contracts view: ready contracts are counted and every real contract fits', () => {
  fresh();
  C.cheatComplete();
  const v = contractsView(C.list());
  assert.equal(v.items.length, 3);
  assert.equal(v.ready, 1);
  assert.match(v.sub, /ready to claim/);
  for (const c of v.items) assert.ok(c.label.length <= 17 && c.text.length <= 28);
  for (const c of CONTRACTS) assert.doesNotMatch(c.text, BANNED);
});

test('contract toasts stay under 60 characters and use plain words', () => {
  for (const r of [{ ok: true, reward: { type: 'shards', amount: 25 } }, { ok: true, reward: { type: 'gold', amount: 123456789 } },
    { ok: false, error: 'Not finished yet' }, { ok: false, error: 'No such contract' }, null]) {
    const m = contractClaimMessage(r);
    assert.ok(m.text.length <= 60, m.text);
    assert.doesNotMatch(m.text, BANNED);
  }
});

test('dive view: every state gives a button that fits, never NaN', () => {
  const states = [null, {}, { canPlay: true }, { running: true }, { tried: true, best: 321, nextInMs: 3600000 },
    { why: 'Finish 3 Drops to unlock.' }, { canPlay: false, chest: { state: 'ready', name: 'Rich chest', shards: 40, gold: 9.9e12 }, streak: 12 }];
  for (const st of states) {
    const v = diveView(st);
    assert.ok(v.btn.label.length <= 16, v.btn.label);
    assert.ok(v.btn.sub.length <= 60, v.btn.sub);
    assert.ok(v.twistName.length <= 24);
    assert.doesNotMatch(JSON.stringify(v), /NaN|undefined|null|Infinity/);
  }
  assert.equal(diveView({ canPlay: true }).btn.disabled, false);
  assert.equal(diveView({ tried: true }).btn.disabled, true);
});

test('dive texts: twist names, chest names and lines fit', () => {
  for (const id of Object.keys(TWIST_DATA)) { assert.ok(TWIST_DATA[id].name.length <= 24, id); assert.ok(TWIST_DATA[id].desc.length <= 90, id); }
  for (const c of DIVE_CHEST_NAMES) assert.ok(c.name.length <= 22);
  for (const k of Object.keys(DIVE_TEXT)) assert.doesNotMatch(DIVE_TEXT[k], BANNED);
  for (const r of [{ ok: true, shards: 40, gold: 123456789 }, { ok: false, error: 'Already opened' }, null]) assert.ok(chestMessage(r).text.length <= 60);
});

test('mastery view: level pips data, safe for unknown Parts and bad ids', () => {
  fresh();
  assert.equal(masteryView('nope').level, 0);
  assert.equal(masteryView(null).level, 0);
  assert.equal(masteryView(undefined).label, 'Mastery 0 of 5');
  M.addLevel('hook', 3);
  const v = masteryView('hook');
  assert.equal(v.level, 3);
  assert.equal(v.label, 'Mastery 3 of 5');
  assert.ok(v.sentence.length <= 90 && v.next.length <= 90);
  M.addLevel('hook', 5);
  assert.equal(masteryView('hook').next, 'Fully mastered.');
  for (const k of Object.keys(MASTERY_TEXT)) assert.doesNotMatch(MASTERY_TEXT[k], BANNED);
});

test('css: pips and cards follow the layout rules (no tiny text, no fixed widths)', () => {
  const css = readFileSync('src/ui/styles/hook2.css', 'utf8');
  for (const m of css.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 12, m[0]);
  assert.doesNotMatch(css, /\bwidth:\s*\d{3,}px/);
  assert.match(css, /\.dv-card .btn-big/);
});

test('old save loads: an older save with none of the three slices gives clean defaults', () => {
  fresh();
  s().parts.hook = 1;
  const code = exportSave();
  assert.ok(code);
  resetAll();
  const r = importSave(code);
  assert.equal(r.ok !== false, true);
  assert.equal(M.info('hook').level, 0);
  assert.equal(C.list().length, 3);
  assert.equal(D.state().chest.state, 'none');
  assert.equal(D.state().streak, 0);
});
