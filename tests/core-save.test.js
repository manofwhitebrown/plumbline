import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerSlice, getSlice, markDirty, saveNow, resetAll, exportSave, importSave, _configure, _isDirty } from '../src/core/save.js';
import { makeMemoryStorage } from '../src/core/storage.js';
import { bus } from '../src/core/bus.js';
import { log } from '../src/core/log.js';

const KEY = 'plumbline.save';
let st;
beforeEach(() => { st = makeMemoryStorage(); _configure({ storage: st, key: KEY, autosaveMs: 20 }); bus.clear(); log.clear(); });

test('register gives defaults; same object every time', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0, parts: ['hook'] } });
  assert.deepEqual(a, { gold: 0, parts: ['hook'] });
  assert.equal(getSlice('meta'), a);
  assert.equal(getSlice('meta'), getSlice('meta'));
  assert.equal(getSlice('nope'), null);
});

test('defaults are cloned, not shared', () => {
  const defaults = { list: [1] };
  const a = registerSlice('a', { version: 1, defaults });
  a.list.push(2);
  assert.deepEqual(defaults.list, [1]);
});

test('saveNow then reload gives the same data', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  a.gold = 123; markDirty('meta');
  assert.equal(saveNow(), true);
  assert.equal(_isDirty(), false);
  _configure({ storage: st, key: KEY });
  const b = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  assert.equal(b.gold, 123);
});

test('old saves are migrated; new default keys are filled', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  a.gold = 50; saveNow();
  _configure({ storage: st, key: KEY });
  const seen = [];
  const b = registerSlice('meta', {
    version: 2, defaults: { gold: 0, shards: 5 },
    migrate(old, from) { seen.push(from); return { ...old, gold: old.gold * 2 }; }
  });
  assert.deepEqual(seen, [1]);
  assert.equal(b.gold, 100);
  assert.equal(b.shards, 5);
});

test('a migrate that throws falls back to defaults and does not crash', () => {
  registerSlice('meta', { version: 1, defaults: { gold: 0 } }).gold = 9; saveNow();
  _configure({ storage: st, key: KEY });
  const b = registerSlice('meta', { version: 2, defaults: { gold: 0 }, migrate() { throw new Error('bad'); } });
  assert.equal(b.gold, 0);
});

test('garbage in storage: boots with defaults and keeps a .corrupt copy', () => {
  st.setItem(KEY, '{{{ not json');
  _configure({ storage: st, key: KEY });
  const a = registerSlice('meta', { version: 1, defaults: { gold: 7 } });
  assert.equal(a.gold, 7);
  assert.equal(st.getItem(KEY + '.corrupt'), '{{{ not json');
  saveNow();
  assert.ok(JSON.parse(st.getItem(KEY)).slices.meta);
});

test('wrong-shape JSON counts as corrupt too', () => {
  st.setItem(KEY, JSON.stringify({ hello: 'world' }));
  _configure({ storage: st, key: KEY });
  assert.equal(registerSlice('meta', { version: 1, defaults: { gold: 1 } }).gold, 1);
  assert.ok(st.getItem(KEY + '.corrupt'));
});

test('one broken slice does not hurt the others; unregistered slices survive', () => {
  st.setItem(KEY, JSON.stringify({ v: 1, slices: { meta: { v: 1, data: 'oops' }, rig: { v: 1, data: { n: 4 } }, later: { v: 1, data: { z: 1 } } } }));
  _configure({ storage: st, key: KEY });
  assert.equal(registerSlice('meta', { version: 1, defaults: { gold: 3 } }).gold, 3);
  assert.equal(registerSlice('rig', { version: 1, defaults: { n: 0 } }).n, 4);
  saveNow();
  assert.deepEqual(JSON.parse(st.getItem(KEY)).slices.later.data, { z: 1 }); // kept for a module that registers later
});

test('a slice that cannot be turned into text keeps its last good copy', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 1 } });
  saveNow();
  a.bad = 1n; // BigInt cannot be written as JSON
  assert.equal(saveNow(), true);
  assert.equal(JSON.parse(st.getItem(KEY)).slices.meta.data.gold, 1);
});

test('memory fallback when storage throws', () => {
  const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('no'); } };
  _configure({ storage: broken, key: KEY });
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  a.gold = 5;
  assert.doesNotThrow(() => saveNow());
  assert.equal(saveNow(), false);   // could not write, but the game keeps its live data
  assert.equal(getSlice('meta').gold, 5);
});

test('autosave fires on its own when dirty', async () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  saveNow();
  a.gold = 42; markDirty('meta');
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(JSON.parse(st.getItem(KEY)).slices.meta.data.gold, 42);
  assert.equal(_isDirty(), false);
});

test('resetAll keeps the same object and restores defaults', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  a.gold = 99; a.extra = 1;
  let reset = 0; bus.on('save:reset', () => reset++);
  resetAll();
  assert.equal(getSlice('meta'), a);
  assert.deepEqual(a, { gold: 0 });
  assert.equal(reset, 1);
});

test('export and import round trip', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0, name: '' } });
  a.gold = 777; a.name = 'Zoë ✨'; saveNow();
  const code = exportSave();
  assert.ok(code.startsWith('PL1.'));
  a.gold = 1;
  let got = 0; bus.on('save:imported', () => got++);
  assert.deepEqual(importSave('  ' + code.slice(0, 20) + '\n' + code.slice(20) + '  '), { ok: true });
  assert.equal(a.gold, 777);
  assert.equal(a.name, 'Zoë ✨');
  assert.equal(getSlice('meta'), a);
  assert.equal(got, 1);
});

test('import rejects bad input and changes nothing', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  a.gold = 10;
  const code = exportSave();
  const bads = [undefined, null, 42, '', 'hello', 'PL1.', 'PL1.abc', code.slice(0, code.length - 10), code.replace(/.$/, '#'), 'PL1.00000000.' + btoa('{"x":1}')];
  for (const bad of bads) {
    const r = importSave(bad);
    assert.equal(r.ok, false, String(bad));
    assert.equal(typeof r.error, 'string');
  }
  assert.equal(a.gold, 10);
});

test('import from a save with missing slice resets that slice', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  const b = registerSlice('rig', { version: 1, defaults: { n: 1 } });
  const code = exportSave();
  a.gold = 5; b.n = 9;
  assert.equal(importSave(code).ok, true);
  assert.equal(a.gold, 0); assert.equal(b.n, 1);
});

test('registering twice keeps live data', () => {
  const a = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  a.gold = 3;
  const b = registerSlice('meta', { version: 1, defaults: { gold: 0 } });
  assert.equal(a, b); assert.equal(b.gold, 3);
});

test('bad calls never throw', () => {
  assert.equal(registerSlice(null, null), null);
  assert.equal(registerSlice('x'), null);
  assert.doesNotThrow(() => markDirty('unknown'));
  assert.doesNotThrow(() => saveNow());
});
