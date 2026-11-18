import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepBeat, haul, simulateRun } from '../src/engine/index.js';
import { allParts } from '../src/engine/parts/index.js';
import { biomes } from '../src/data/biomes.js';
import { makeRng } from '../src/core/rng.js';

const IDS = allParts().map((p) => p.id);

function randomRig(rng) {
  const cols = rng.chance(0.5) ? 4 : 5, rows = rng.chance(0.5) ? 3 : 4;
  const fill = rng.next();
  return { cols, rows, cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng.next() < fill ? IDS[Math.floor(rng.next() * IDS.length)] : null))) };
}
function randomMods(rng) {
  return {
    maxStrain: 100 + 10 * rng.int(0, 8), keepOnSnap: 0.3 + 0.05 * rng.int(0, 6), goldMult: 1 + rng.int(0, 5),
    strainMult: 1 - 0.04 * rng.int(0, 8), luck: rng.int(0, 10) / 30, startDepth: rng.chance(0.2) ? rng.int(0, 900) : 0,
  };
}

test('fuzz: 50,000 random runs keep every number sane', () => {
  for (let i = 1; i <= 50000; i++) {
    const rng = makeRng(i);
    const rig = randomRig(rng), mods = randomMods(rng);
    const frac = rng.chance(0.3) ? null : 0.5 + rng.next() * 0.45;
    const policy = frac === null ? undefined : ({ run }) => (run.state.strain >= frac * run.state.maxStrain ? 'haul' : 'continue');
    const r = simulateRun({ rig, mods, seed: i, policy, maxBeats: 200 });
    const where = ` (run ${i})`;
    assert.ok(Number.isFinite(r.gold) && r.gold >= 0, 'gold' + where);
    assert.ok(Number.isFinite(r.kept) && r.kept >= 0 && r.kept <= r.gold, 'kept' + where);
    assert.ok(Number.isFinite(r.strain) && r.strain >= 0 && r.strain <= r.state.maxStrain + 1e-6 + (r.outcome === 'snapped' ? 1e6 : 0), 'strain' + where);
    assert.ok(Number.isFinite(r.depth) && r.depth >= mods.startDepth, 'depth' + where);
    assert.ok(['hauled', 'snapped'].includes(r.outcome), 'outcome ' + r.outcome + where);
  }
});

test('fuzz: stepping beat by beat, depth rises, one end event, no pay after the end', () => {
  for (let i = 1; i <= 3000; i++) {
    const rng = makeRng(i + 7);
    const run = createRun({ rig: randomRig(rng), mods: randomMods(rng), seed: i });
    let last = run.state.depth, ends = 0, goldAtEnd = null, haulAt = rng.int(5, 150);
    for (let b = 0; b < 250 && run.state.status === 'running'; b++) {
      const ev = b === haulAt ? haul(run) : stepBeat(run);
      for (const e of ev) if (e.t === 'SNAP' || e.t === 'HAUL') { ends++; goldAtEnd = run.state.kept; }
      assert.ok(run.state.depth >= last, 'depth went up only, run ' + i);
      assert.ok(Number.isFinite(run.state.gold) && run.state.gold >= 0 && Number.isFinite(run.state.strain) && run.state.strain >= 0, 'numbers, run ' + i);
      last = run.state.depth;
    }
    if (run.state.status !== 'running') {
      assert.equal(ends, 1, 'exactly one end event, run ' + i);
      assert.deepEqual(haul(run), [], 'a second haul does nothing');
      assert.deepEqual(stepBeat(run), [], 'no beats after the end');
      assert.equal(run.state.kept, goldAtEnd, 'kept never changes after the end');
    }
  }
});

test('every part works in every biome and never breaks the numbers', () => {
  const ids = Array.from(biomes.ids || []);
  assert.ok(ids.length >= 5, 'biome list');
  for (const biome of ids) {
    for (const id of IDS) {
      const rig = { cols: 4, rows: 3, cells: [[null, null, null, null], [null, id, null, null], [id === 'hook' ? null : 'hook', null, null, null]] };
      for (const seed of [1, 2, 3]) {
        const r = simulateRun({ rig, mods: { cheat: { forceBiome: biome, noSnap: true } }, seed, maxBeats: 60 });
        assert.ok(Number.isFinite(r.gold) && r.gold >= 0 && Number.isFinite(r.strain) && r.strain >= 0, `${id} in ${biome}`);
        assert.equal(r.state.biomeId, biome, `forced biome ${biome} with ${id}`);
      }
    }
  }
});
