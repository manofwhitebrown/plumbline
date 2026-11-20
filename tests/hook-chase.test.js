import test from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './run-helpers.js';
import { session } from '../src/run/session.js';
import records from '../src/run/records.js';
import { createGhost, cleanGhost, ghostAt, chaseView, nearMiss, bestNextTip } from '../src/run/chase.js';
import { CHASE, CHASE_TEXT } from '../src/data/chase.js';

const BANNED = /\b(hazard|lane|tier|beat|tick|seed|slice|bus|payload|debug|null|undefined|NaN|Infinity)\b/i;

test('ghost recorder: Gold by depth, gaps carry the last value, only moves forward', () => {
  const g = createGhost();
  g.sample(0, 0); g.sample(4, 10); g.sample(10, 30); g.sample(35, 90); g.sample(20, 9999); // going back is ignored
  assert.deepEqual(g.finish(), [0, 30, 30, 90]); // first time at each depth
  const d = createGhost(); d.sample(NaN, NaN); d.sample('x', -5); d.sample(1e9, 5);
  const out = d.finish(); assert.ok(out.length <= CHASE.ghostMax && out.every((v) => Number.isFinite(v) && v >= 0));
});

test('ghostAt interpolates, and is null when the saved drop never got that deep', () => {
  const pts = [0, 100, 200];
  assert.equal(ghostAt(pts, 0), 0); assert.equal(ghostAt(pts, 15), 150); assert.equal(ghostAt(pts, 20), 200);
  assert.equal(ghostAt(pts, 31), null); assert.equal(ghostAt([], 5), null); assert.equal(ghostAt(null, 5), null); assert.equal(ghostAt(pts, NaN), 0);
});

test('a damaged saved ghost is repaired', () => {
  assert.deepEqual(cleanGhost('nope'), []);
  assert.deepEqual(cleanGhost([1, 'x', -4, 7, NaN, Infinity]), [1, 1, 1, 7, 7, 7]);
  assert.equal(cleanGhost(new Array(5000).fill(1)).length, CHASE.ghostMax);
});

test('pills: distance to best, ghost ahead or behind, next Biome; never more than the cap', () => {
  const ghost = [0, 100, 200, 300, 400, 500];
  let v = chaseView({ depth: 40, gold: 560, bestDepth: 100, ghost, nextBiomeIn: 60 });
  assert.deepEqual(v.pills.map((p) => p.id), ['best', 'ghost', 'next']);
  assert.equal(v.toBest, 60); assert.equal(v.ghost.tone, 'good'); assert.match(v.pills[1].text, /^160 Gold ahead of your best$/);
  v = chaseView({ depth: 40, gold: 300, bestDepth: 100, ghost, nextBiomeIn: 60 }); assert.equal(v.ghost.tone, 'bad'); assert.match(v.pills[1].text, /Gold behind your best/);
  v = chaseView({ depth: 40, gold: 402, bestDepth: 100, ghost, nextBiomeIn: 60 }); assert.equal(v.ghost.tone, 'even'); assert.equal(v.pills[1].text, CHASE_TEXT.ghostLevel);
  v = chaseView({ depth: 120, gold: 1, bestDepth: 100, ghost, nextBiomeIn: 10 }); assert.equal(v.pastBest, true); assert.equal(v.toBest, 0); assert.equal(v.pills[0].text, CHASE_TEXT.newBest); assert.equal(v.ghost, null, 'the saved drop was shorter');
  v = chaseView({ depth: 10, gold: 5, bestDepth: 100, ghost, nextBiomeIn: 5 }); assert.equal(v.ghost, null, 'too early for the ghost');
  v = chaseView({ depth: 10, gold: 5, bestDepth: 0, ghost: [], nextBiomeIn: 5 }); assert.deepEqual(v.pills.map((p) => p.id), ['next'], 'first ever drop: no best, no ghost');
  assert.ok(chaseView({ depth: 40, gold: 1, bestDepth: 100, ghost, nextBiomeIn: 3 }).pills.length <= CHASE.pillMax);
});

test('goals count and hostile input stay finite and safe', () => {
  const v = chaseView({ depth: 'a', gold: {}, bestDepth: NaN, ghost: 5, nextBiomeIn: 'x', goals: [{ done: true }, null, { done: false }] });
  assert.deepEqual(v.goals, { done: 1, total: 3 }); assert.ok(v.pills.every((p) => !BANNED.test(p.text)));
  assert.doesNotThrow(() => { chaseView(); chaseView(null); nearMiss(); nearMiss({ depth: NaN }); bestNextTip(); bestNextTip({ outcome: 'snapped', upgrade: 7 }); });
});

test('near miss: close to your best, close to the next Biome, never on a new best or a cheat', () => {
  assert.equal(nearMiss({ depth: 94, bestBefore: 100 }).text, 'Only 6 m from your best!');
  assert.equal(nearMiss({ depth: 94, bestBefore: 100, newRecord: true }), null);
  assert.equal(nearMiss({ depth: 94, bestBefore: 100, cheated: true }), null);
  assert.equal(nearMiss({ depth: 30, bestBefore: 100, newRecord: false }), null, 'far from both');
  const b = nearMiss({ depth: 440, bestBefore: 1000 }); assert.equal(b.kind, 'biome'); assert.equal(b.gap, 10); assert.equal(b.text, 'Only 10 m from the next Biome!');
  assert.equal(nearMiss({ depth: 1800, bestBefore: 2000 }), null, '200 m short is not close, and the abyss has no edge to chase');
  assert.equal(nearMiss({ depth: 1960, bestBefore: 2000 }).gap, 40, 'capped at the near-miss maximum');
});

test('tip: a Snap names the upgrade and the Gold it would have kept; nothing after a Haul, a cheat or a maxed upgrade', () => {
  const up = { id: 'mender', name: 'Rope Mender', level: 1, max: 6, per: 5, canBuy: true };
  const t = bestNextTip({ outcome: 'snapped', gold: 290, upgrade: up });
  assert.equal(t.extra, 14); assert.equal(t.text, 'Rope Mender would have kept you 14 more Gold. You can buy it now.');
  assert.equal(bestNextTip({ outcome: 'snapped', gold: 290, upgrade: { ...up, canBuy: false } }).text, 'Rope Mender would have kept you 14 more Gold.');
  assert.equal(bestNextTip({ outcome: 'hauled', gold: 290, upgrade: up }), null);
  assert.equal(bestNextTip({ outcome: 'snapped', gold: 290, upgrade: up, cheated: true }), null);
  assert.equal(bestNextTip({ outcome: 'snapped', gold: 290, upgrade: { ...up, level: 6, maxed: true } }), null);
  assert.equal(bestNextTip({ outcome: 'snapped', gold: 10, upgrade: up }), null, 'under one Gold saved');
  assert.ok(!BANNED.test(t.text));
});

test('every line the player can see uses glossary words only', () => {
  for (const [k, v] of Object.entries(CHASE_TEXT)) assert.ok(!BANNED.test(v), k + ': ' + v);
});

// ---- through the real session, with the tiny fake engine ----
function drop(t, beats, how = 'haul') { assert.equal(session.start({ seed: 1 }).ok, true); t.loop.tick(beats); if (how === 'haul') session.haul(); return session.getResult(); }

test('session: the best drop is saved as a ghost, the next drop sees pills and a near-miss line', () => {
  const t = setup();
  assert.deepEqual(records.getGhost(), []);
  const first = drop(t, 40);
  assert.equal(first.chase.nearMiss, null, 'a new best has no near-miss line');
  const ghost = records.getGhost(); assert.ok(ghost.length >= 4 && ghost[ghost.length - 1] > 0);
  assert.equal(session.start({ seed: 2 }).ok, true);
  t.loop.tick(35);
  const v = session.getView();
  assert.ok(v.chase && v.chase.toBest === 5 && v.chase.pills.some((p) => p.id === 'best'), JSON.stringify(v.chase));
  assert.ok(v.chase.ghost && v.chase.ghost.tone === 'even', 'same speed as the best drop');
  session.haul();
  const r = session.getResult(); assert.equal(r.chase.nearMiss.text, 'Only 5 m from your best!');
  assert.deepEqual(records.getGhost(), ghost, 'a shorter drop does not replace the ghost');
});

test('session: a Snap shows the Rope Mender tip when the meta game offers it', () => {
  const t = setup({ engine: { snapAt: 20 } });
  t.meta.upgrades = { def: () => ({ per: 5 }), info: () => ({ id: 'mender', name: 'Rope Mender', level: 0, max: 6, maxed: false, canBuy: false }) };
  const r = drop(t, 40, 'none');
  assert.equal(r.outcome, 'snapped'); assert.equal(r.chase.tip.extra, 2); assert.match(r.chase.tip.text, /^Rope Mender would have kept you 2 more Gold\.$/);
});

test('session: no meta upgrades, a cheated drop and a broken ghost never throw or save', () => {
  const t = setup();
  drop(t, 20); const before = records.getGhost();
  t.meta.mods.cheat = 'x';
  assert.doesNotThrow(() => drop(t, 50)); assert.deepEqual(records.getGhost(), before, 'cheats never write the ghost');
  t.save.getSlice('run').ghost = 'garbage'; assert.deepEqual(records.getGhost(), []);
  assert.doesNotThrow(() => drop(t, 10));
});

test('old saves without a ghost still load', () => {
  const t = setup(); const s = t.save.getSlice('run'); delete s.ghost; s.bestDepth = 50;
  assert.deepEqual(records.getGhost(), []); assert.equal(session.start({ seed: 3 }).ok, true); t.loop.tick(3);
  assert.equal(session.getView().chase.ghost, null);
});
