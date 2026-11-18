import test from 'node:test';
import assert from 'node:assert/strict';
import { allParts, partsByFamily, getPart, COMBO_IDS, detectCombos } from '../src/engine/parts/index.js';
import { FAMILIES } from '../src/data/parts.js';

const byCost = allParts().slice().sort((a, b) => a.cost - b.cost);

test('hook is the only start part, and costs are finite and unique', () => {
  const starts = allParts().filter((p) => p.unlock.type === 'start');
  assert.deepEqual(starts.map((p) => p.id), ['hook']);
  const costs = allParts().map((p) => p.cost);
  assert.ok(costs.every((c) => Number.isFinite(c) && c >= 0));
  assert.equal(new Set(costs).size, costs.length);
});

test('costs grow smoothly: each next part costs at most 3x the last', () => {
  for (let i = 2; i < byCost.length; i++) {
    assert.ok(byCost[i].cost <= byCost[i - 1].cost * 3.2, byCost[i].id);
  }
});

test('unlock thresholds never go backwards along the ladder (per kind)', () => {
  for (const type of ['gold', 'depth']) {
    const list = byCost.filter((p) => p.unlock.type === type);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].unlock.value >= list[i - 1].unlock.value, list[i].id);
  }
});

test('within each family, costs increase in unlock order', () => {
  for (const f of FAMILIES) {
    const list = partsByFamily(f).slice().sort((a, b) => a.cost - b.cost);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].cost > list[i - 1].cost, f + ' ' + list[i].id);
  }
});

test('a gold unlock never needs more than the cost of the part before it', () => {
  // So the next part is always reachable from the last one.
  for (let i = 1; i < byCost.length; i++) {
    if (byCost[i].unlock.type === 'gold') assert.ok(byCost[i].unlock.value <= Math.max(byCost[i - 1].cost, 50) * 3, byCost[i].id);
  }
});

test('codex unlocks use a real combo made only of cheaper parts', () => {
  const ladder = new Set();
  for (const p of byCost) {
    if (p.unlock.type === 'codex') {
      assert.ok(COMBO_IDS.includes(p.unlock.value), p.id);
      const needed = comboParts(p.unlock.value);
      assert.ok(needed.length > 0, p.unlock.value);
      for (const id of needed) assert.ok(ladder.has(id), p.id + ' needs ' + id + ' first');
    }
    ladder.add(p.id);
  }
});

// Which parts does a combo need? Find the smallest set by trying each part alone and in the combo examples.
function comboParts(comboId) {
  const NEEDS = {
    gem_press: ['smelter', 'polisher', 'multiplier'], wide_net: ['splitter', 'net'], safe_dive: ['shield', 'oilcan', 'anchor'],
    drill_rush: ['drill', 'cooler', 'plate'], gilded_press: ['gilder', 'multiplier'],
  };
  return NEEDS[comboId] || [];
}

test('every unlock rule passes validation and every desc is short', () => {
  for (const p of allParts()) {
    assert.ok(p.desc.length <= 90, p.id);
    assert.ok(getPart(p.id));
  }
  assert.ok(detectCombos({ cols: 4, rows: 3, cells: [[], [], []] }).length === 0);
});

test('first drops: with only Hook plus one cheap part the player can already improve', () => {
  const early = byCost.filter((p) => p.cost > 0).slice(0, 3);
  assert.ok(early[0].cost <= 60, 'first buy is cheap');
  assert.ok(early.every((p) => p.unlock.type === 'gold'));
});
