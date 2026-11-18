import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createGate, LOCK_MS } from '../src/cheats/gate.js';
import { sha256Hex } from '../src/cheats/sha256.js';
import { makeCheats } from '../src/cheats/index.js';
import { fresh } from './meta-helpers.js';
import { createTapCounter, lockText, clipText, toastFor, dataToText, groupsView, submitPassword, USED_TEXT } from '../src/ui/screens/cheatPanel.js';

// A throwaway password used only in these tests. It is NOT the real one.
const TEST_PW = 'ui-test-only-pw-37';
const hashOf = (t) => sha256Hex('plumbline:' + t);

test('7 quick taps open the box, slow taps do not', () => {
  const t = createTapCounter({ needed: 7, windowMs: 3000 });
  for (let i = 0; i < 6; i++) assert.equal(t.hit(1000 + i * 200), false);
  assert.equal(t.hit(2200), true);
  assert.equal(t.count(), 0, 'the counter starts again');
  const slow = createTapCounter({ needed: 7, windowMs: 3000 });
  let opened = false;
  for (let i = 0; i < 20; i++) if (slow.hit(i * 1000)) opened = true;
  assert.equal(opened, false, 'one tap every second never opens it');
});

test('tap counter ignores bad times and bad options', () => {
  const t = createTapCounter({ needed: -2, windowMs: NaN });
  for (const bad of [NaN, undefined, null, 'x']) assert.equal(t.hit(bad), false);
  assert.equal(t.count(), 0);
  assert.equal(createTapCounter().hit(5), false);
});

test('lock text counts seconds up and is empty at zero', () => {
  assert.equal(lockText(30000), 'Locked. Try again in 30s.');
  assert.equal(lockText(1), 'Locked. Try again in 1s.');
  for (const z of [0, -5, NaN, undefined]) assert.equal(lockText(z), '');
});

test('toast text is short and has the right kind', () => {
  assert.deepEqual(toastFor({ ok: true, text: 'Added 1K Gold' }), { text: 'Added 1K Gold', kind: 'ok' });
  assert.equal(toastFor({ ok: false, needsConfirm: true, text: 'Press again' }).kind, 'warn');
  assert.equal(toastFor({ ok: false, text: 'Locked' }).kind, 'error');
  assert.equal(toastFor(null).kind, 'error');
  assert.ok(toastFor({ ok: true, text: 'x'.repeat(300) }).text.length <= 60);
  assert.equal(clipText('abc', 60), 'abc');
});

test('data from the Tools cheats becomes plain text', () => {
  assert.equal(dataToText('PL1.code'), 'PL1.code');
  assert.equal(dataToText(['a', 'b']), 'a\nb');
  assert.equal(dataToText(null), '');
  assert.equal(dataToText({ a: 1 }).includes('"a"'), true);
  const loop = {}; loop.me = loop;
  assert.equal(dataToText(loop), '');
});

test('the cheat list is cleaned before it is drawn', () => {
  assert.deepEqual(groupsView(null), []);
  assert.deepEqual(groupsView([{ group: 'A', items: 'no' }, null, { group: 5, items: [] }]), []);
  const v = groupsView([{ group: 'Money', items: [{ id: 'x', label: 'X', toggle: 1, on: 0 }, { id: 5 }, null] }]);
  assert.equal(v.length, 1);
  assert.deepEqual(v[0].items, [{ id: 'x', label: 'X', toggle: true, on: false, danger: false, needsConfirm: false }]);
});

test('password box: wrong, then right; 5 wrong locks for 30 seconds', () => {
  const clock = fresh();
  const c = makeCheats(createGate({ expectedHash: hashOf(TEST_PW) }));
  c.reveal();
  assert.deepEqual(submitPassword(c, 'nope'), { state: 'wrong' });
  assert.equal(c.isUnlocked(), false);
  for (let i = 0; i < 3; i++) assert.equal(submitPassword(c, 'bad' + i).state, 'wrong');
  const fifth = submitPassword(c, 'bad4');
  assert.equal(fifth.state, 'locked');
  assert.ok(fifth.ms > 0 && fifth.ms <= LOCK_MS);
  assert.equal(submitPassword(c, TEST_PW).state, 'locked', 'the right word is ignored while locked');
  clock.advance(LOCK_MS + 500);
  assert.deepEqual(submitPassword(c, TEST_PW), { state: 'open' });
  assert.equal(c.isUnlocked(), true);
  assert.ok(c.list().length >= 7, 'all groups show after unlock');
});

test('password box never throws on odd input or a missing module', () => {
  fresh();
  const c = makeCheats(createGate({ expectedHash: hashOf(TEST_PW) }));
  c.reveal();
  for (const v of [undefined, null, 4, {}, [], 'x'.repeat(9000)]) assert.doesNotThrow(() => submitPassword(c, v));
  assert.deepEqual(submitPassword(null, 'x'), { state: 'wrong' });
  assert.deepEqual(submitPassword({ lockedForMs() { throw new Error('boom'); } }, 'x'), { state: 'wrong' });
});

test('lock hides the menu again', () => {
  fresh();
  const c = makeCheats(createGate({ expectedHash: hashOf(TEST_PW) }));
  c.reveal();
  assert.equal(submitPassword(c, TEST_PW).state, 'open');
  c.lock();
  assert.equal(c.isUnlocked(), false);
  assert.deepEqual(c.list(), []);
});

test('the banner text is the one the owner asked for', () => {
  assert.equal(USED_TEXT, 'Cheats used — records are off');
});

test('normal player text never mentions cheats', () => {
  // The three files that draw the normal Settings screen must not say the word in anything a player reads.
  const files = ['screens/settings.js', 'screens/settingsAudio.js', 'screens/settingsSave.js'];
  for (const f of files) {
    const src = readFileSync(join('src/ui', f), 'utf8');
    const strings = [...src.matchAll(/(['"`])((?:\\.|(?!\1).){2,200})\1/g)].map((m) => m[2]);
    for (const s of strings) {
      if (/^[./@]/.test(s) || /^[a-z-]+$/.test(s)) continue; // paths, class names, ids
      if (f === 'screens/settings.js' && /cheat-banner/.test(s)) continue;
      assert.equal(/cheat/i.test(s), false, f + ' has a player text with the word cheat: ' + s);
    }
  }
  assert.ok(readdirSync('src/ui/screens').includes('cheatPanel.js'));
});
