import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { _configure, registerSlice, getSlice, exportSave } from '../src/core/save.js';
import { isResetWord, precheckCode, saveFileName, runImport, RESET_WORD } from '../src/ui/screens/settingsSave.js';

beforeEach(() => {
  _configure({});
  registerSlice('demo', { version: 1, defaults: { gold: 0 }, migrate: (o) => o });
});

test('Reset needs the word RESET', () => {
  assert.equal(RESET_WORD, 'RESET');
  assert.equal(isResetWord('RESET'), true);
  assert.equal(isResetWord('  reset '), true);
  for (const bad of ['', 'RESE', 'RESETS', 'reset it', null, undefined, 5, {}]) assert.equal(isResetWord(bad), false);
});

test('the save file name has the date and a .txt end', () => {
  assert.equal(saveFileName(new Date('2026-11-18T10:00:00Z')), 'plumbline-save-2026-11-18.txt');
  assert.match(saveFileName(new Date('nope')), /^plumbline-save-\d{4}-\d{2}-\d{2}\.txt$/);
  assert.match(saveFileName(), /\.txt$/);
});

test('precheck gives a plain message for bad input', () => {
  assert.equal(precheckCode('').ok, false);
  assert.equal(precheckCode('   ').error, 'Paste your save code first.');
  assert.equal(precheckCode(null).ok, false);
  assert.equal(precheckCode('hello').error, 'That is not a Plumbline save code.');
  const ok = precheckCode('PL1.abc\n def');
  assert.equal(ok.ok, true);
  assert.equal(ok.code, 'PL1.abcdef'); // spaces and new lines are removed
});

test('import: a bad code changes nothing, a good code restores the save', () => {
  getSlice('demo').gold = 77;
  const code = exportSave();
  assert.ok(code.startsWith('PL1.'));
  getSlice('demo').gold = 5;
  for (const bad of ['', 'PL1.', 'PL1.0000.xx', code.slice(0, -4), 'junk']) {
    const res = runImport(bad);
    assert.equal(res.ok, false);
    assert.ok(typeof res.error === 'string' && res.error.length > 0);
  }
  assert.equal(getSlice('demo').gold, 5, 'nothing changed after bad codes');
  const res = runImport('  ' + code + '\n');
  assert.equal(res.ok, true);
  assert.equal(getSlice('demo').gold, 77);
});

test('import never throws on strange input', () => {
  for (const v of [undefined, null, 12, {}, [], 'x'.repeat(5_000_000)]) {
    assert.doesNotThrow(() => runImport(v));
  }
});
