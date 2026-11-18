import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCombos, allCombos, COMBO_IDS } from '../src/engine/parts/index.js';
import { rigOf } from './parts-helpers.js';

// For each combo: a rig that triggers it, and a near-miss that must NOT.
// Row 0 is the top. The last row is the bottom.
const CASES = {
  gem_press: [[['multiplier'], ['polisher'], ['smelter']], [['smelter'], ['polisher'], ['multiplier']]],
  wide_net: [[[null, 'net', 'splitter', 'net']], [['net', 'splitter', null, 'net']]],
  safe_dive: [[['shield', 'oilcan', 'anchor']], [['shield', 'oilcan', 'drill']]],
  drill_rush: [[['drill', 'cooler', 'plate']], [['drill', 'cooler', 'shield']]],
  echo_chamber: [[['echo', 'multiplier']], [['echo', null, null, 'multiplier']]],
  prism_pair: [[['prism', 'prism']], [['prism', null, 'prism']]],
  battery_burst: [[['battery', 'hook', 'net', 'vacuum']], [['battery', 'hook', 'net', 'polisher']]],
  metronome_mill: [[['metronome', 'polisher', 'multiplier']], [['metronome', 'polisher'], [null, null, 'multiplier']]],
  lantern_scout: [[['lantern', 'compass']], [['lantern', 'jackpot']]],
  relic_hunter: [[['jackpot', 'compass']], [['jackpot', null, null, 'compass']]],
  fuse_chain: [[['fuse', 'fuse']], [['fuse', null, 'fuse']]],
  gilded_press: [[['gilder'], ['multiplier']].map((r, i) => r), [['gilder', 'multiplier']]],
  loud_chain: [[['amplifier'], ['polisher'], ['multiplier']], [['polisher'], ['multiplier'], ['amplifier']]],
  rock_alchemist: [[['polisher'], ['smelter'], ['spikeguard']], [['spikeguard'], ['smelter'], ['polisher']]],
  cool_sweep: [[['vacuum'], ['cooler']], [['vacuum', 'cooler']]],
  iron_wall: [[['plate', 'shield', 'spikeguard']], [['plate', 'shield', 'oilcan']]],
  long_rope: [[['sparerope', 'oilcan', 'cooler']], [['sparerope', 'oilcan', 'plate']]],
};

test('there are at least 14 combos and every one has a test case', () => {
  assert.ok(COMBO_IDS.length >= 14);
  for (const id of COMBO_IDS) assert.ok(CASES[id], 'missing case for ' + id);
});

for (const id of Object.keys(CASES)) {
  test('combo ' + id + ': hit and near-miss', () => {
    const [hit, miss] = CASES[id];
    assert.ok(detectCombos(rigOf(hit)).includes(id), 'should detect ' + id);
    assert.ok(!detectCombos(rigOf(miss)).includes(id), 'near-miss should not detect ' + id);
  });
}

test('every combo has a name, a short plain description and tags', () => {
  for (const c of allCombos()) {
    assert.ok(c.name && c.desc && c.tags.length > 0, c.id);
    assert.ok(c.desc.length <= 130, c.id + ' description too long');
  }
});

test('an empty rig has no combos', () => {
  assert.deepEqual(detectCombos(rigOf([[null, null, null, null]])), []);
});
