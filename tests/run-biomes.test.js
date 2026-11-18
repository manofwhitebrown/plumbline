import test from 'node:test';
import assert from 'node:assert/strict';
import { byDepth, byId, nextBiomeIn, BIOME_IDS, ABYSS_LEVEL_CAP } from '../src/data/biomes.js';
import { table, totalWeight } from '../src/data/loot.js';

test('byDepth handles odd numbers', () => {
  const cases = [[-5, 'clay'], [0, 'clay'], [99.9, 'clay'], [100, 'quartz'], [999, 'void'], [1000, 'abyss'], [1e9, 'abyss'], [NaN, 'clay'], [Infinity, 'clay'], [undefined, 'clay'], [null, 'clay'], ['x', 'clay']];
  for (const [d, id] of cases) assert.equal(byDepth(d).id, id, `depth ${d}`);
});

test('biome edges are 100, 250, 450, 700, 1000', () => {
  const edges = [[249.9, 'quartz'], [250, 'amber'], [449, 'amber'], [450, 'magma'], [699, 'magma'], [700, 'void']];
  for (const [d, id] of edges) assert.equal(byDepth(d).id, id);
});

test('every biome has the contract fields', () => {
  for (const id of BIOME_IDS) {
    const b = byId(id);
    for (const k of ['id', 'name', 'from', 'to', 'goldFactor', 'tierWeights', 'hazardWeights', 'hazardStrain', 'relicChance', 'ambience', 'palette']) {
      assert.ok(k in b, `${id} has ${k}`);
    }
    assert.ok(b.palette.top && b.palette.bottom && b.palette.accent);
    assert.equal(b.tierWeights.length, 6);
    for (const h of Object.keys(b.hazardWeights)) assert.ok(b.hazardStrain[h] > 0, `${id} strain for ${h}`);
  }
});

test('biomes feel different: roots cost more, bats only in quartz+', () => {
  assert.ok(byId('amber').hazardStrain.root > byId('amber').hazardStrain.bat);
  assert.equal('bat' in byId('clay').hazardWeights, false);
  assert.equal('bat' in byId('quartz').hazardWeights, true);
  assert.equal(byId('clay').relicChance, 0);
  assert.ok(byId('amber').relicChance > 0);
});

test('abyss gets harder every 100 m and stops at the cap', () => {
  const a = byDepth(1000), b = byDepth(1500), c = byDepth(1e9);
  assert.ok(b.strainFactor > a.strainFactor);
  assert.ok(b.hazardStrain.rock > a.hazardStrain.rock);
  const top = (w) => w[5] / w.reduce((x, y) => x + y, 0);
  assert.ok(top(b.tierWeights) >= top(a.tierWeights));
  assert.equal(c.level, ABYSS_LEVEL_CAP);
  assert.ok(Number.isFinite(c.strainFactor) && Number.isFinite(c.goldFactor));
  assert.equal(byDepth(1500), byDepth(1500), 'same object, no new allocation');
});

test('nextBiomeIn counts down and never goes bad', () => {
  assert.equal(nextBiomeIn(0), 100);
  assert.equal(nextBiomeIn(99), 1);
  assert.equal(nextBiomeIn(100), 150);
  assert.equal(nextBiomeIn(1000), 100);
  assert.equal(nextBiomeIn(1050), 50);
  assert.equal(nextBiomeIn(NaN), 100);
  assert.ok(Number.isFinite(nextBiomeIn(1e12)));
});

test('loot tables always have weight, for every biome and luck 0..1 (and bad luck)', () => {
  for (const id of BIOME_IDS) {
    for (const luck of [0, 0.1, 0.25, 0.5, 0.75, 1, -3, 7, NaN, undefined]) {
      const t = table(id, luck);
      assert.ok(t.length > 0);
      assert.ok(totalWeight(t) > 0, `${id} luck ${luck}`);
      for (const [item, w] of t) {
        assert.ok(w > 0 && Number.isFinite(w));
        assert.ok(item.tier >= 1 && item.tier <= 6);
        assert.ok(Number.isFinite(item.value) && item.value >= 0);
      }
    }
  }
});

test('loot tables: clay is friendly, luck lifts tiers, hazards match the biome', () => {
  const tiers = (t) => t.filter(([i]) => i.kind === 'gem').reduce((s, [i, w]) => s + i.tier * w, 0);
  assert.ok(tiers(table('clay', 1)) > tiers(table('clay', 0)));
  assert.ok(table('clay', 0).every(([i]) => i.kind !== 'hazard' || i.hazard === 'rock'));
  assert.ok(table('quartz', 0).some(([i]) => i.hazard === 'bat' && i.drifts === true));
  assert.ok(table('clay', 0).every(([i]) => i.kind !== 'relic'));
  assert.ok(table('amber', 0).some(([i]) => i.kind === 'relic'));
  assert.equal(table('clay', 0.3), table('clay', 0.3), 'cached');
  assert.equal(table('nope', 0)[0][0].kind !== undefined, true, 'unknown id falls back to clay');
});

test('loot accepts a biome def and scales in the abyss', () => {
  const t = table(byDepth(2500), 0);
  assert.ok(totalWeight(t) > 0);
  assert.ok(Object.isFrozen(t));
});
