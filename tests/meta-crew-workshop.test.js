import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meta } from '../src/meta/index.js';
import { s } from '../src/meta/state.js';
import { bus } from '../src/core/bus.js';
import { onEvents, onRunEnded } from '../src/meta/runhooks.js';
import { fresh } from './meta-helpers.js';

test('crew: buy 1, buy 10, buy max, cost grows 15% each', () => {
  fresh();
  assert.equal(meta.crew.buy('winch').ok, false, 'no gold');
  meta.addGold(100000);
  const w = meta.crew.list().find((c) => c.id === 'winch');
  assert.equal(w.cost, 50);
  assert.equal(meta.crew.buy('winch').ok, true);
  assert.equal(meta.gold(), 99950);
  assert.equal(meta.crew.list().find((c) => c.id === 'winch').cost, Math.ceil(50 * 1.15));
  assert.equal(meta.crew.buy('winch', 10).bought, 10);
  const r = meta.crew.buy('winch', 'max');
  assert.equal(r.ok, true);
  assert.ok(meta.gold() < meta.crew.list().find((c) => c.id === 'winch').cost, 'max spends down to less than one more');
  assert.equal(meta.crew.buy('winch', 'max').ok, false);
});

test('crew: locked until the right Depth, with a plain reason', () => {
  fresh();
  meta.addGold(1e9);
  const cart = meta.crew.list().find((c) => c.id === 'cart');
  assert.equal(cart.unlocked, false);
  assert.match(cart.reason, /150 m Depth/);
  assert.equal(meta.crew.buy('cart').ok, false);
  s().bestDepth = 150;
  assert.equal(meta.crew.buy('cart').ok, true);
});

test('crew: output doubles at each milestone and includes upgrades and Core Dust', () => {
  fresh();
  meta.addGold(1e9);
  meta.crew.buy('winch', 9);
  assert.equal(meta.crew.perSecond(), 9);
  meta.crew.buy('winch');
  assert.equal(meta.crew.perSecond(), 20);
  s().upgrades.tools = 5; // +50%
  assert.equal(meta.crew.perSecond(), 30);
  s().coreDustTotal = 10; // +100%
  assert.equal(meta.crew.perSecond(), 60);
});

test('crew: manager triples output, needs 10 crew, hired once', () => {
  fresh();
  meta.addGold(1e9);
  assert.equal(meta.crew.hireManager('winch').ok, false);
  meta.crew.buy('winch', 10);
  const before = meta.crew.perSecond();
  assert.equal(meta.crew.hireManager('winch').ok, true);
  assert.equal(meta.crew.perSecond(), before * 3);
  assert.equal(meta.crew.hireManager('winch').ok, false);
});

test('crew: huge numbers stay finite', () => {
  fresh();
  s().gold = 1e299;
  for (let i = 0; i < 6; i++) meta.crew.buy('foundry', 'max');
  assert.ok(Number.isFinite(meta.crew.perSecond()));
  assert.ok(meta.gold() >= 0 && Number.isFinite(meta.gold()));
  meta.addGold(1e300); meta.addGold(1e300);
  assert.ok(Number.isFinite(meta.gold()) && meta.gold() <= 1e300);
});

test('workshop: buy a part once, no refunds, second copy needs Extra Copy', () => {
  fresh();
  assert.equal(meta.partStatus('magnet').state, 'poor');
  assert.equal(meta.buyPart('magnet').error, 'Not enough Gold');
  meta.addGold(1e6);
  assert.equal(meta.canBuyPart('magnet'), true);
  const r = meta.buyPart('magnet');
  assert.equal(r.ok, true);
  assert.equal(meta.gold(), 1e6 - 60);
  assert.equal(meta.ownedParts().magnet, 1);
  assert.equal(meta.partStatus('magnet').state, 'owned');
  assert.equal(meta.buyPart('magnet').ok, false);
  s().shards = 500;
  assert.equal(meta.upgrades.buy('extra_copy').ok, false, 'needs depth');
  s().bestDepth = 200;
  assert.equal(meta.upgrades.buy('extra_copy').ok, true);
  assert.equal(meta.partStatus('magnet').state, 'buyable');
  assert.equal(meta.partStatus('magnet').cost, 150, 'second copy costs 2.5x');
  assert.equal(meta.buyPart('magnet').ok, true);
  assert.equal(meta.ownedParts().magnet, 2);
  assert.equal(meta.buyPart('magnet').ok, false);
});

test('workshop: depth and gold unlock rules and unknown ids', () => {
  fresh();
  s().gold = 1e6; // held, but not earned yet
  assert.equal(meta.partStatus('polisher').state, 'locked');
  assert.match(meta.partStatus('polisher').reason, /Depth/);
  s().bestDepth = 60;
  assert.equal(meta.canBuyPart('polisher'), true);
  assert.equal(meta.partStatus('smelter').state, 'locked');
  assert.match(meta.partStatus('smelter').reason, /Gold/);
  assert.equal(meta.canBuyPart('nope'), false);
  assert.equal(meta.partStatus('nope'), null);
  assert.equal(meta.buyPart(undefined).ok, false);
  assert.equal(meta.buyPart({}).ok, false);
});

test('workshop: double tap on buy only pays once', () => {
  fresh();
  meta.addGold(100);
  assert.equal(meta.buyPart('magnet').ok, true);
  assert.equal(meta.buyPart('magnet').ok, false);
  assert.equal(meta.gold(), 40);
});

test('run hooks: events and run end update stats, codex and best Depth', () => {
  fresh();
  onEvents([
    { t: 'COLLECT', item: { kind: 'gem', tier: 1 }, gold: 1, combo: 3 },
    { t: 'COLLECT', item: { kind: 'ore', tier: 1 }, gold: 1, combo: 4 },
    { t: 'COLLECT', item: { kind: 'relic', tier: 3 }, gold: 9, combo: 5 },
    { t: 'CHAIN' }, { t: 'CHAIN' },
    { t: 'HAZARD', absorbedBy: { r: 0, c: 0 } }, { t: 'HAZARD', absorbedBy: null },
    { t: 'BIOME', id: 'quartz' },
    null, 5, { t: 'COLLECT' }, { t: 'COLLECT', item: null },
  ]);
  const st = meta.stats.get();
  assert.equal(st.gems, 1); assert.equal(st.ore, 1); assert.equal(st.relics, 1);
  assert.equal(st.chains, 2); assert.equal(st.blocked, 1); assert.equal(st.maxCombo, 5);
  assert.equal(meta.codex.has('biome:quartz'), true);
  assert.equal(meta.codex.has('relic:t3'), true);
  onRunEnded({ outcome: 'hauled', depth: 120, partsUsed: ['hook', 'magnet'] });
  onRunEnded({ outcome: 'snapped', depth: 80, partsUsed: { hook: 3 } });
  const after = meta.stats.get();
  assert.equal(after.drops, 2); assert.equal(after.hauls, 1); assert.equal(after.snaps, 1);
  assert.equal(after.bestDepth, 120);
  assert.equal(meta.codex.has('part:magnet'), true);
  assert.equal(meta.gold(), 0, 'meta does not pay for a run; the run session does');
});

test('run hooks: bad payloads never throw', () => {
  fresh();
  for (const bad of [null, undefined, 5, 'x', [], {}, { events: 5 }]) {
    assert.doesNotThrow(() => { onEvents(bad); onRunEnded(bad); });
  }
  assert.doesNotThrow(() => bus.emit('run:events', { events: 'nope' }));
  assert.doesNotThrow(() => bus.emit('run:ended', null));
});

test('run:ended on the bus reaches meta by itself', () => {
  fresh();
  bus.emit('run:ended', { outcome: 'hauled', depth: 55, partsUsed: [] });
  assert.equal(meta.stats.get().bestDepth, 55);
});

test('meta:changed is sent when things change', () => {
  fresh();
  const seen = [];
  const off = bus.on('meta:changed', (p) => seen.push(p.what));
  meta.addGold(100);
  meta.buyPart('magnet');
  off();
  assert.ok(seen.includes('parts'));
});
