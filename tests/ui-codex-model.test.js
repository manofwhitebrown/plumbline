import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, hintFor, TABS, COMBO_PARTS, COMBO_TIMES, markSeen, isSeen, relicTier } from '../src/ui/screens/codexTabs.js';
import { allParts, allCombos, getPart } from '../src/engine/parts/index.js';
import { COMBO_DATA } from '../src/data/parts.js';
import { setPartsProvider } from '../src/meta/partsApi.js';
import { resetAll } from '../src/core/save.js';
import { meta } from '../src/meta/index.js';
import { fresh } from './meta-helpers.js';

beforeEach(() => { resetAll(); setPartsProvider(null); });

const E = (id, kind, found, name = 'Name') => ({ id, kind, found, discovered: found, name: found ? name : '???', desc: found ? 'Desc.' : 'Not found yet.' });

test('four tabs in the right order', () => {
  assert.deepEqual(TABS.map((t) => t.label), ['Parts', 'Combos', 'Biomes', 'Relics']);
});

test('entries are grouped by kind with counts', () => {
  const m = buildModel([E('part:hook', 'part', true, 'Hook'), E('part:net', 'part', false), E('combo:gem_press', 'combo', false), E('biome:clay', 'biome', true, 'Clay'), E('relic:t1', 'relic', false)], () => true);
  assert.deepEqual(m.order.map((t) => [t.id, t.found, t.total]), [['part', 1, 2], ['combo', 0, 1], ['biome', 1, 1], ['relic', 0, 1]]);
  assert.equal(m.found, 2);
  assert.equal(m.total, 5);
});

test('hidden entries keep a silhouette name and show a hint, never the real name', () => {
  const m = buildModel([E('part:net', 'part', false), E('biome:magma', 'biome', false), E('combo:gem_press', 'combo', false), E('relic:t3', 'relic', false)], () => true);
  for (const t of m.order) for (const e of t.entries) {
    assert.equal(e.name, '???');
    assert.equal(e.desc, '');
    assert.ok(e.hint.length > 5 && e.hint.length <= 80, e.hint);
    assert.equal(e.isNew, false);
  }
});

test('part hints follow the unlock rule in the data', () => {
  for (const p of allParts()) {
    const hint = hintFor({ id: 'part:' + p.id, kind: 'part' });
    const u = p.unlock;
    if (u.type === 'start') assert.match(hint, /start/);
    if (u.type === 'gold') assert.match(hint, /Gold/);
    if (u.type === 'depth') assert.match(hint, /Depth|m\./);
    if (u.type === 'codex') assert.match(hint, /Combo/);
    assert.ok(hint.length <= 80, p.id + ': ' + hint);
  }
});

test('biome hint uses the real depth from biome data', () => {
  assert.match(hintFor({ id: 'biome:quartz', kind: 'biome' }), /100 m/);
  assert.match(hintFor({ id: 'biome:magma', kind: 'biome' }), /450 m/);
  assert.match(hintFor({ id: 'relic:t1', kind: 'relic' }), /Amber.*250 m/);
});

test('NEW dot: found and not yet seen', () => {
  const seen = new Set(['part:hook']);
  const m = buildModel([E('part:hook', 'part', true, 'Hook'), E('part:magnet', 'part', true, 'Magnet'), E('part:net', 'part', false)], (id) => seen.has(id));
  const byId = Object.fromEntries(m.tabs.part.entries.map((e) => [e.id, e]));
  assert.equal(byId['part:hook'].isNew, false);
  assert.equal(byId['part:magnet'].isNew, true);
  assert.equal(byId['part:net'].isNew, false);
  assert.equal(m.tabs.part.fresh, 1);
  assert.equal(m.fresh, 1);
});

test('the NEW dot clears once an entry is opened, and stays cleared', () => {
  const list = [E('part:magnet', 'part', true, 'Magnet')];
  assert.equal(buildModel(list).fresh, 1);
  assert.equal(markSeen('part:magnet'), true);
  assert.equal(markSeen('part:magnet'), false);
  assert.equal(isSeen('part:magnet'), true);
  assert.equal(buildModel(list).fresh, 0);
});

test('markSeen ignores bad input', () => {
  for (const bad of [null, undefined, 5, '', {}, 'x'.repeat(200)]) assert.equal(markSeen(bad), false);
  assert.equal(isSeen(undefined), false);
});

test('combo entries say which parts make them, and which of those are found', () => {
  const m = buildModel([E('part:smelter', 'part', true, 'Smelter'), E('combo:gem_press', 'combo', false), E('combo:wide_net', 'combo', true, 'Wide Net')], () => true);
  const gp = m.tabs.combo.entries.find((e) => e.id === 'combo:gem_press');
  assert.deepEqual(gp.parts.map((p) => p.id), ['smelter', 'polisher', 'multiplier']);
  assert.deepEqual(gp.parts.map((p) => p.found), [true, false, false]);
  const wn = m.tabs.combo.entries.find((e) => e.id === 'combo:wide_net');
  assert.equal(wn.parts.find((p) => p.id === 'net').times, 2);
});

test('every combo has parts, and they match the combo text in the data files', () => {
  const ids = Object.keys(COMBO_DATA);
  assert.deepEqual(Object.keys(COMBO_PARTS).sort(), ids.slice().sort());
  assert.equal(allCombos().length, ids.length);
  for (const id of ids) {
    const parts = COMBO_PARTS[id];
    assert.ok(parts.length >= 1, id);
    for (const pid of parts) {
      const p = getPart(pid);
      assert.ok(p, id + ' uses unknown part ' + pid);
      assert.ok(COMBO_DATA[id].desc.toLowerCase().includes(p.name.toLowerCase()), id + ' text does not name ' + p.name);
    }
    for (const pid of Object.keys(COMBO_TIMES[id] || {})) assert.ok(parts.includes(pid), id + ' times for a part it does not use');
  }
});

test('relic tier comes from the id and stays in range', () => {
  assert.equal(relicTier({ id: 'relic:t4' }), 4);
  assert.equal(relicTier({ id: 'relic:t99' }), 6);
  assert.equal(relicTier({ id: 'relic:t0' }), 1);
  assert.equal(relicTier(null), 1);
  const m = buildModel([E('relic:t5', 'relic', true, 'Voidtouched Relic')]);
  assert.equal(m.tabs.relic.entries[0].tier, 5);
});

test('bad input never throws and gives empty tabs', () => {
  for (const bad of [null, undefined, 5, 'x', {}, [null, 7, { id: 5 }, { id: 'zzz:q', kind: 'zzz' }]]) {
    const m = buildModel(bad);
    assert.equal(m.order.length, 4);
    assert.equal(m.total, 0);
  }
  assert.equal(hintFor(null), '');
  assert.equal(hintFor({ id: 'part:nope', kind: 'part' }).length > 0, true);
});

test('works with the real meta codex list: every tab is filled and counts add up', () => {
  fresh();
  setPartsProvider(null);
  const list = meta.codex.list();
  const m = buildModel(list, () => true);
  assert.equal(m.tabs.part.total, allParts().length);
  assert.equal(m.tabs.combo.total, allCombos().length);
  assert.equal(m.tabs.biome.total, 6);
  assert.equal(m.tabs.relic.total, 6);
  assert.equal(m.total, list.length);
  for (const t of m.order) for (const e of t.entries) assert.ok(e.found || e.name === '???');
});

test('a part that is found shows real name and no hint', () => {
  fresh();
  setPartsProvider(null);
  meta.codex.record('part:magnet');
  const m = buildModel(meta.codex.list(), () => false);
  const e = m.tabs.part.entries.find((x) => x.id === 'part:magnet');
  assert.equal(e.found, true);
  assert.equal(e.name, 'Magnet');
  assert.equal(e.hint, '');
  assert.equal(e.isNew, true);
});
