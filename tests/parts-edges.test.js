import test from 'node:test';
import assert from 'node:assert/strict';
import { allParts } from '../src/engine/parts/index.js';
import { makeRng } from '../src/core/rng.js';
import { newRun, beatWith, miniRun, gem, ore, rock, relic } from './parts-helpers.js';

const SIZES = [[4, 3], [5, 4]];
const ids = allParts().map((p) => p.id);

function emptyRig(cols, rows) {
  return { cols, rows, cells: Array.from({ length: rows }, () => Array(cols).fill(null)) };
}

test('every part in every corner of 4x3 and 5x4 never throws and stays finite', () => {
  for (const [cols, rows] of SIZES) {
    for (const id of ids) {
      for (const [r, c] of [[0, 0], [0, cols - 1], [rows - 1, 0], [rows - 1, cols - 1]]) {
        const rig = emptyRig(cols, rows);
        rig.cells[r][c] = id;
        const run = newRun(rig);
        for (let b = 0; b < 12; b++) {
          const lanes = [];
          for (let l = 0; l < cols; l++) lanes.push([gem(3), ore(2), rock(), relic(), gem(1)][(b + l) % 5]);
          const out = beatWith(run, lanes, makeRng(b));
          assert.ok(Number.isFinite(out.gold) && out.gold >= 0, id + ' gold');
          assert.ok(Number.isFinite(out.fx.strainDelta), id + ' strain');
        }
      }
    }
  }
});

test('bad input never throws: unknown ids, junk items, junk lanes, missing rig', () => {
  const run = newRun({ cols: 4, rows: 3, cells: [['hook', 'ghost', 5, {}], [null, undefined, 'hook', 'x'], [null, null, null, null]] });
  const junk = [null, undefined, 5, 'x', { kind: 'gem', tier: NaN, value: NaN }, { kind: 'gem', tier: 99, value: Infinity }, { kind: 'gem', tier: -4, value: -9 }, Object.freeze(gem(2))];
  beatWith(run, junk);
  const noRig = { mods: {}, state: {} };
  beatWith(noRig, [gem()]);
  beatWith({ rig: { cols: 4, rows: 3, cells: null }, mods: null }, [gem()]);
  assert.ok(true);
});

test('state isolation: two runs on the same rig do not share part state', () => {
  const rig = emptyRig(4, 3);
  rig.cells[2][0] = 'shield'; rig.cells[1][0] = 'gilder'; rig.cells[0][0] = 'hook';
  const a = newRun(rig);
  for (let i = 0; i < 4; i++) beatWith(a, [rock()]);
  for (let i = 0; i < 4; i++) beatWith(a, [gem(1, 1)]);
  const b = newRun(rig);
  assert.notEqual(a.partState, b.partState);
  assert.equal(beatWith(b, [rock()]).hazards[0].absR, 2, 'shield has all charges again');
  const golds = []; for (let i = 0; i < 5; i++) golds.push(beatWith(b, [gem(1, 1)]).gold);
  assert.equal(golds[4], 2, 'gilder count started from zero');
});

test('huge values stay finite', () => {
  const rig = emptyRig(4, 4);
  rig.cells[0][0] = 'hook'; rig.cells[1][0] = 'multiplier'; rig.cells[2][0] = 'multiplier'; rig.cells[3][0] = 'multiplier';
  const run = newRun(rig, { multiplierLevel: 2 });
  let v = 1e29;
  for (let i = 0; i < 20; i++) v = beatWith(run, [gem(6, v)]).gold;
  assert.ok(Number.isFinite(v));
});

function randomRig(rng, cols, rows) {
  const rig = emptyRig(cols, rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) rig.cells[r][c] = rng.chance(0.85) ? rng.pick(ids) : null;
  return rig;
}

test('fuzz: 2000 random rigs give no NaN, no negative strain, and always end', () => {
  const rng = makeRng(2024);
  for (let i = 0; i < 2000; i++) {
    const [cols, rows] = rng.chance(0.5) ? [4, 3] : [5, 4];
    const rig = randomRig(rng, cols, rows);
    const run = miniRun(rig, { luck: rng.next() * 0.5 }, i, (r) => (r.state.strain > 0.8 * r.state.maxStrain ? 'haul' : 'continue'), 400);
    const s = run.state;
    for (const k of ['gold', 'strain', 'depth', 'speed']) assert.ok(Number.isFinite(s[k]), 'rig ' + i + ' ' + k);
    assert.ok(s.strain >= 0 && s.gold >= 0, 'rig ' + i);
    assert.notEqual(s.status, 'running', 'rig ' + i + ' did not end in 400 beats');
  }
});
