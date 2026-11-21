import test from 'node:test';
import assert from 'node:assert/strict';
import { rigOf, newRun, beatWith, gem, ore, rock, relic, count } from './parts-helpers.js';

const run1 = (rows, mods) => newRun(rigOf(rows), mods);
// Column 0 is where the items rise in most tests. Row 0 is the top, the last row is the bottom.

test('hook grabs a gem or ore in its lane, not hazards or other lanes', () => {
  const run = run1([['hook', null, null, null]]);
  const out = beatWith(run, [gem(1), gem(1), null, null]);
  assert.equal(out.collected.length, 1);
  assert.equal(out.gold, 1);
  assert.equal(count(out.events, 'FIRE', 'hook'), 1);
  assert.equal(beatWith(run1([['hook']]), [rock()]).collected.length, 0);
  assert.equal(beatWith(run1([['hook']]), [ore(1)]).collected.length, 1);
});

test('magnet grabs only ore, in its lane and both neighbour lanes', () => {
  const out = beatWith(run1([[null, 'magnet', null, null]]), [ore(), ore(), ore(), ore()]);
  assert.deepEqual(out.collected.map((x) => x.lane).sort(), [0, 1, 2]);
  assert.equal(beatWith(run1([['magnet']]), [gem()]).collected.length, 0);
});

test('net grabs gems in its lane and the lane to its right at 75%', () => {
  const out = beatWith(run1([['net', null, null, null]]), [gem(1, 4), gem(1, 4), gem(1, 4), null]);
  assert.equal(out.collected.length, 2);
  assert.equal(out.gold, 4 + 3);
  assert.equal(beatWith(run1([['net']]), [ore()]).collected.length, 0);
});

test('vacuum grabs everything but hazards and adds 1 strain per beat', () => {
  const run = run1([['vacuum']]);
  const out = beatWith(run, [relic()]);
  assert.equal(out.collected.length, 1);
  assert.equal(out.fx.strainDelta, 1);
  assert.equal(beatWith(run, [rock()]).collected.length, 0);
});

test('polisher raises gem tier and value x3, below a hook', () => {
  const out = beatWith(run1([['hook'], ['polisher']]), [gem(1, 1)]);
  assert.equal(out.collected[0].item.tier, 2);
  assert.equal(out.gold, 3);
  assert.equal(beatWith(run1([['hook'], ['polisher']]), [gem(6, 243)]).gold, 243);
});

test('a processor ABOVE the hook does not help (the hook already took it)', () => {
  assert.equal(beatWith(run1([['polisher'], ['hook']]), [gem(1, 1)]).gold, 1);
});

test('multiplier doubles value, triples at level 2', () => {
  assert.equal(beatWith(run1([['hook'], ['multiplier']]), [gem(1, 5)]).gold, 10);
  assert.equal(beatWith(run1([['hook'], ['multiplier']], { multiplierLevel: 2 }), [gem(1, 5)]).gold, 15);
});

test('smelter turns ore into a tier 1 gem', () => {
  const out = beatWith(run1([['net'], ['smelter']]), [ore(2, 1.5)]);
  assert.equal(out.collected.length, 1);
  assert.equal(out.collected[0].item.kind, 'gem');
  assert.equal(out.collected[0].item.tier, 1);
});

test('splitter copies into both neighbours at half value, copies never split again', () => {
  const run = run1([['hook', 'hook', 'hook', null], [null, 'splitter', null, null]]);
  const out = beatWith(run, [null, gem(1, 10), null, null]);
  assert.equal(out.collected.length, 3);
  assert.equal(out.gold, 10 + 5 + 5);
  assert.equal(out.collected.filter((x) => x.item.fromSplit).length, 2);
});

test('amplifier adds 25% for each part that already fired', () => {
  const run = run1([['hook'], ['amplifier'], ['polisher'], ['multiplier']]);
  const out = beatWith(run, [gem(1, 1)]);
  // multiplier x2 = 2, polisher x3 = 6, amplifier (2 fired) x1.5 = 9
  assert.equal(out.gold, 9);
});

test('gilder doubles every 5th item', () => {
  const run = run1([['hook'], ['gilder']]);
  const golds = [];
  for (let i = 0; i < 5; i++) golds.push(beatWith(run, [gem(1, 1)]).gold);
  assert.deepEqual(golds, [1, 1, 1, 1, 2]);
});

test('prism doubles a tier 3+ gem when a neighbouring prism already fired', () => {
  const run = run1([['hook'], ['prism'], ['prism']]);
  assert.equal(beatWith(run, [gem(3, 9)]).gold, 18);
  assert.equal(beatWith(run1([['hook'], ['prism']]), [gem(3, 9)]).gold, 9);
  assert.equal(beatWith(run, [gem(2, 3)]).gold, 3);
});

test('plate blocks one hazard then rests 5 beats', () => {
  const run = run1([['plate']]);
  assert.equal(beatWith(run, [rock()]).hazards[0].absR, 0);
  for (let i = 0; i < 4; i++) assert.equal(beatWith(run, [rock()]).hazards[0].absR, -1, 'beat ' + i);
  assert.equal(beatWith(run, [rock()]).hazards[0].absR, 0);
});

test('shield blocks hazards in a 3x3 area, 3 charges', () => {
  const run = run1([[null, 'shield', null, null]]);
  let blocked = 0;
  for (let i = 0; i < 5; i++) blocked += beatWith(run, [rock(), rock(), null, rock()]).hazards.filter((h) => h.absR >= 0).length;
  assert.equal(blocked, 3);
  const out = beatWith(newRun(run.rig), [null, null, null, rock()]);
  assert.equal(out.hazards[0].absR, -1, 'lane 3 is out of reach');
});

test('oil can lowers strain every beat, cooler lowers it per gem in its column', () => {
  assert.equal(beatWith(run1([['oilcan']]), []).fx.strainDelta, -0.4);
  const out = beatWith(run1([['cooler'], ['hook']]), [gem(1, 1)]);
  assert.equal(out.fx.strainDelta, -1.5);
  assert.equal(beatWith(run1([['cooler', 'hook']]), [null, gem(1, 1)]).fx.strainDelta, 0);
});

test('spike guard turns hazards into ore that a hook can then take', () => {
  const out = beatWith(run1([['hook'], ['spikeguard']]), [rock()]);
  assert.equal(out.collected.length, 1);
  assert.equal(out.collected[0].item.kind, 'ore');
});

test('spare rope adds 20 max strain, only once', () => {
  assert.equal(run1([['sparerope', 'sparerope']]).mods.maxStrain, 120);
});

test('drill and anchor change speed and strain', () => {
  const d = beatWith(run1([['drill']]), []).fx;
  assert.equal(d.speedAdd, 1); assert.ok(d.strainDelta > 0);
  const a = beatWith(run1([['anchor']]), []).fx;
  assert.equal(a.speedAdd, -0.3); assert.ok(a.strainDelta < 0);
});

test('metronome makes processors in its row work twice on every 4th beat', () => {
  const run = run1([['hook'], ['polisher', 'metronome']]);
  const tiers = [];
  for (let i = 0; i < 4; i++) tiers.push(beatWith(run, [gem(1, 1)]).collected[0].item.tier);
  assert.deepEqual(tiers, [2, 2, 2, 3]);
});

test('battery doubles the next grab after 10 grabs', () => {
  const run = run1([['hook', 'battery']]);
  const golds = [];
  for (let i = 0; i < 12; i++) golds.push(beatWith(run, [gem(1, 1)]).gold);
  assert.equal(golds[10], 2);
  assert.equal(golds[11], 1);
  assert.equal(golds.slice(0, 10).every((g) => g === 1), true);
});

test('lantern reveals its lane and adds relic chance, compass doubles rare finds', () => {
  const l = beatWith(run1([[null, 'lantern']]), []);
  assert.equal(l.fx.reveal[1], 2);
  assert.ok(Math.abs(run1([['lantern']]).mods.relicBonus - 0.1) < 1e-9);
  assert.equal(run1([['compass', 'compass']]).mods.rareMult, 2);
});

test('jackpot chest grabs relics only', () => {
  assert.equal(beatWith(run1([['jackpot']]), [relic()]).collected.length, 1);
  assert.equal(beatWith(run1([['jackpot']]), [gem()]).collected.length, 0);
});

test('echo repeats the last grab at half value and never echoes an echo', () => {
  const run = run1([['hook', 'echo']]);
  assert.equal(beatWith(run, [gem(1, 10)]).gold, 10);
  const second = beatWith(run, [gem(1, 4)]);
  assert.equal(second.gold, 4 + 5);
  const third = beatWith(run, [gem(1, 2)]);
  assert.equal(third.gold, 2 + 2, 'echo of the real grab 4 is 2, not of the echo');
});

test('fuse blows up neighbour hazards for gold, and chains to the next fuse', () => {
  const run = run1([['fuse', 'fuse', null, null]]);
  const out = beatWith(run, [rock(), rock(), rock(), null]);
  assert.equal(out.hazards[2].absR >= 0, true, 'lane 2 blasted by the chain');
  assert.ok(out.gold > 0);
  const single = beatWith(run1([[null, 'fuse', null, null]]), [rock(), rock(), rock(), null]);
  assert.equal(single.hazards.filter((h) => h.absR >= 0).length, 2);
});

test('hazard gold twist pays for blocked hazards', () => {
  const out = beatWith(run1([['plate']], { hazardGold: 4 }), [rock()]);
  assert.equal(out.fx.bonusValue, 4);
});
