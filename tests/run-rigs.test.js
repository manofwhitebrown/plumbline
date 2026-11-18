import test from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './run-helpers.js';
import rigs from '../src/run/rigs.js';

const own = (o) => ({ owned: { hook: 1, net: 1, magnet: 2, ...o } });

test('a fresh save has a starter rig with a hook', () => {
  const t = setup();
  const r = rigs.getRig();
  assert.equal(r.cols, 4); assert.equal(r.rows, 3);
  assert.equal(r.cells.flat().filter((x) => x === 'hook').length, 1);
  t.off();
});

test('place: unowned part, bad spot, bad input', () => {
  const t = setup(own());
  rigs.clear();
  assert.equal(rigs.place(0, 0, 'hook').ok, true);
  const bad = rigs.place(0, 1, 'vacuum');
  assert.equal(bad.ok, false); assert.match(bad.error, /do not own/);
  for (const [r, c] of [[-1, 0], [0, 4], [3, 0], [0, 9], [NaN, 0], [undefined, undefined], ['a', 'b']]) {
    const x = rigs.place(r, c, 'hook');
    assert.equal(x.ok, false, `${r},${c}`); assert.match(x.error, /not on the rig/);
  }
  assert.equal(rigs.place(0, 1, '').ok, false);
  assert.equal(rigs.place(0, 1, null).ok, false);
  assert.equal(rigs.place(0, 1, 42).ok, false);
  t.off();
});

test('place: one copy only goes on the rig once; extra copies allow more', () => {
  const t = setup(own());
  rigs.clear();
  assert.equal(rigs.place(2, 0, 'hook').ok, true);
  const again = rigs.place(2, 1, 'hook');
  assert.equal(again.ok, false); assert.match(again.error, /copies/);
  assert.equal(rigs.place(2, 0, 'hook').ok, true, 'same cell, same part is fine');
  assert.equal(rigs.place(1, 0, 'magnet').ok, true);
  assert.equal(rigs.place(1, 1, 'magnet').ok, true, 'two copies owned');
  assert.equal(rigs.place(1, 2, 'magnet').ok, false);
  assert.equal(rigs.place(2, 0, 'net').ok, true, 'replaces the hook');
  assert.equal(rigs.place(2, 3, 'hook').ok, true, 'hook is free again');
  t.off();
});

test('remove and swap', () => {
  const t = setup(own());
  rigs.clear(); rigs.place(2, 0, 'hook'); rigs.place(2, 1, 'net');
  assert.deepEqual(rigs.remove(2, 1), { ok: true, removed: 'net' });
  assert.deepEqual(rigs.remove(2, 1), { ok: true, removed: null });
  assert.equal(rigs.remove(9, 9).ok, false);
  assert.equal(rigs.swap({ r: 2, c: 0 }, { r: 2, c: 3 }).ok, true);
  assert.equal(rigs.getRig().cells[2][3], 'hook');
  assert.equal(rigs.getRig().cells[2][0], null);
  assert.equal(rigs.swap([2, 3], [1, 1]).ok, true);
  assert.equal(rigs.getRig().cells[1][1], 'hook');
  assert.equal(rigs.swap([2, 3], [9, 1]).ok, false);
  assert.equal(rigs.swap(null, undefined).ok, false);
  assert.equal(rigs.clear().ok, true);
  assert.equal(rigs.getRig().cells.flat().filter(Boolean).length, 0);
  t.off();
});

test('getRig returns a copy, so screens cannot damage the rig', () => {
  const t = setup(own());
  const r = rigs.getRig(); r.cells[0][0] = 'evil'; r.cols = 99;
  assert.equal(rigs.getRig().cells[0][0], null);
  assert.equal(rigs.getRig().cols, 4);
  t.off();
});

test('rig grows when upgrades add space, and keeps parts', () => {
  const t = setup(own());
  rigs.clear(); rigs.place(2, 3, 'hook'); rigs.place(0, 0, 'net');
  t.meta.mods.cols = 5; t.meta.mods.rows = 4;
  const r = rigs.getRig();
  assert.equal(r.cols, 5); assert.equal(r.rows, 4);
  assert.equal(r.cells[2][3], 'hook'); assert.equal(r.cells[0][0], 'net');
  assert.equal(r.cells.length, 4); assert.ok(r.cells.every((row) => row.length === 5));
  t.off();
});

test('rig shrinks safely when a Collapse resets upgrades; parts go back to the tray', () => {
  const t = setup(own());
  t.meta.mods.cols = 5; t.meta.mods.rows = 4;
  rigs.clear(); rigs.place(3, 4, 'hook'); rigs.place(0, 0, 'net'); rigs.place(0, 1, 'magnet');
  t.meta.mods.cols = 4; t.meta.mods.rows = 3;
  const r = rigs.getRig();
  assert.equal(r.cols, 4); assert.equal(r.rows, 3);
  assert.equal(r.cells.flat().includes('hook'), false, 'hook was outside the new grid');
  assert.equal(r.cells[0][0], 'net');
  assert.equal(rigs.tray().hook, 1);
  t.off();
});

test('parts that are no longer owned come off the rig', () => {
  const t = setup(own());
  rigs.clear(); rigs.place(0, 0, 'net'); rigs.place(0, 1, 'hook');
  delete t.meta.owned.net;
  assert.equal(rigs.getRig().cells[0][0], null);
  assert.equal(rigs.getRig().cells[0][1], 'hook');
  t.off();
});

test('three loadouts save and load; load drops parts no longer owned', () => {
  const t = setup(own());
  rigs.clear(); rigs.place(0, 0, 'net'); rigs.place(2, 1, 'hook');
  assert.equal(rigs.loadouts.save(0, 'Starter').ok, true);
  rigs.clear(); rigs.place(2, 2, 'hook');
  rigs.loadouts.save(2);
  assert.equal(rigs.loadouts.list()[0].name, 'Starter');
  assert.equal(rigs.loadouts.list()[1], null);
  assert.equal(rigs.loadouts.list()[2].name, 'Loadout 3');
  delete t.meta.owned.net;
  const res = rigs.loadouts.load(0);
  assert.equal(res.ok, true);
  assert.equal(rigs.getRig().cells[0][0], null);
  assert.equal(rigs.getRig().cells[2][1], 'hook');
  assert.equal(rigs.loadouts.load(1).ok, false);
  for (const bad of [-1, 3, NaN, 'x', null]) { assert.equal(rigs.loadouts.load(bad).ok, false); assert.equal(rigs.loadouts.save(bad).ok, false); }
  assert.equal(rigs.loadouts.rename(0, 'x'.repeat(50)).ok, true);
  assert.equal(rigs.loadouts.list()[0].name.length, 20);
  t.off();
});

test('validate always gives a safe rig', () => {
  const t = setup(own());
  for (const bad of [null, undefined, 5, 'x', {}, { cells: 'no' }, { cells: [[1, {}, null]] }]) {
    const v = rigs.validate(bad);
    assert.equal(v.rig.cols, 4); assert.equal(v.rig.rows, 3);
    assert.ok(v.rig.cells.every((row) => row.every((c) => c === null || typeof c === 'string')));
  }
  const v = rigs.validate({ cols: 4, rows: 3, cells: [['ghost', 'hook', 'hook', null]] });
  assert.equal(v.ok, false);
  assert.deepEqual(v.rig.cells[0], [null, 'hook', null, null], 'unknown part and the extra hook are removed');
  assert.ok(v.problems.length > 0);
  t.off();
});

test('old or corrupt saved rig data is repaired', () => {
  const t = setup(own());
  const s = t.save.getSlice('rig');
  s.cells = 'garbage'; s.loadouts = 7;
  assert.equal(rigs.getRig().cols, 4);
  assert.ok(Array.isArray(t.save.getSlice('rig').loadouts));
  t.off();
});

test('preview: plain warnings and a power number', () => {
  const t = setup(own());
  rigs.clear();
  assert.match(rigs.preview().warnings[0], /empty/);
  rigs.place(0, 0, 'magnet'); rigs.place(1, 2, 'net');
  assert.deepEqual(rigs.preview().warnings, []);
  const rigNoCollector = { cols: 4, rows: 3, cells: [['polisher', null, null, null], [null, null, null, null], [null, null, null, null]] };
  assert.deepEqual(rigs.preview(rigNoCollector).warnings, ['No collector in this rig']);
  const orphan = { cols: 4, rows: 3, cells: [['hook', null, 'polisher', null], [null, null, null, null], [null, null, null, null]] };
  assert.deepEqual(rigs.preview(orphan).warnings, ['Parts have no collector in their lane']);
  const p = rigs.preview(orphan, { full: true });
  assert.equal(p.powerReady, true);
  assert.ok(p.power >= 10 && p.power <= 15);
  assert.equal(rigs.preview(orphan).power, p.power, 'cached');
  t.off();
});
