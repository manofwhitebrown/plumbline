import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBiomeCard, SUBTITLES, BIOME_CARD_MS } from '../src/render/cinematics/biomeCard.js';
import { makeRecord, makeMilestone, RECORD_MS, MILESTONE_MS } from '../src/render/cinematics/records.js';
import { createNullLayer } from '../src/render/cinematics/fxLayer.js';
import { createRunner } from '../src/ui/motion/timeline.js';
import { createStage } from '../src/ui/motion/stage.js';
import { wireDirector } from '../src/ui/motion/wiring.js';
import { createDirector } from '../src/ui/motion/director.js';

function fakeDoc() {
  const mk = () => { const el = { style: {}, children: [], attrs: {}, setAttribute(k, v) { el.attrs[k] = v; }, append(...k) { el.children.push(...k); }, appendChild(k) { el.children.push(k); }, remove() { el.removed = true; } }; return el; };
  return { createElement: mk };
}
function seeded() { let s = 3; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
function env() {
  let t = 0, id = 1; const pending = new Map(); const layers = [];
  const e = { pending, layers, now: () => t, raf: (f) => { const i = id++; pending.set(i, f); return i; }, caf: (i) => pending.delete(i), win: null,
    makeLayer: () => { const l = createNullLayer(360, 640, seeded()); layers.push(l); return l; },
    run(ms) { for (let i = 0; i < ms / 16 + 3 && pending.size; i++) { t += 16; const f = Array.from(pending.values()); pending.clear(); f.forEach((x) => x(t)); } } };
  return e;
}
function fakeBus() { const h = {}; return { on: (n, f) => { (h[n] = h[n] || []).push(f); return () => { h[n] = h[n].filter((x) => x !== f); }; }, emit: (n, p) => (h[n] || []).forEach((f) => f(p)), count: (n) => (h[n] || []).length }; }

test('biome card: sits under the HUD top zone, is click-through, lasts 1400 ms and removes itself', () => {
  const doc = fakeDoc(); const host = { appendChild(n) { host.child = n; } };
  const def = makeBiomeCard(host, { doc, id: 'amber', name: 'Amber' }); assert.equal(def.durationMs, BIOME_CARD_MS); assert.equal(BIOME_CARD_MS, 1400);
  assert.match(host.child.style.cssText, /top:96px/); assert.match(host.child.style.cssText, /pointer-events:none/);
  const r = createRunner(def); r.start(); for (let i = 0; i < 120; i++) r.tick(16);
  assert.equal(host.child.removed, true); assert.equal(SUBTITLES.amber, 'The Amber Veins');
});

test('biome card never uses a word from the never-show list', () => {
  const bad = /beat|lane|tick|entity|null|undefined|NaN|seed|slice|payload|debug/i;
  for (const v of Object.values(SUBTITLES)) assert.ok(!bad.test(v));
});

test('record and milestone finish clean; record is a celebration under 2 s, milestone is small', () => {
  assert.ok(RECORD_MS <= 2000 && MILESTONE_MS <= 800);
  for (const mk of [makeRecord, makeMilestone]) { const L = createNullLayer(360, 640, seeded()); const r = createRunner(mk(L, { depth: 412 })); r.start(); for (let i = 0; i < 150; i++) r.tick(16); assert.equal(r.state, 'done'); assert.equal(L.pool.live, 0); }
});

test('director: skipIfBusy drops a stale decoration instead of queueing it', () => {
  const d = createDirector(); const m = (id, extra) => ({ id, priority: 1, dedupeMs: 0, make: () => ({ id, durationMs: 100, update() {}, finish() {} }), ...extra });
  d.play(m('a')); assert.equal(d.play(m('b', { skipIfBusy: true })), false); assert.equal(d.pending, 0);
});

test('wiring: one biome card per biome per run, again after a new run starts', () => {
  const e = env(); const stage = createStage(e); const bus = fakeBus(); const host = {}; const w = wireDirector({ bus, stage, getHost: () => host });
  const ev = (id) => bus.emit('run:events', { events: [{ t: 'BIOME', id, depth: 100 }] });
  ev('quartz'); e.run(2000); assert.equal(stage.director.played, 1);
  ev('quartz'); e.run(2000); assert.equal(stage.director.played, 1);
  bus.emit('run:started', {}); ev('quartz'); e.run(2000); assert.equal(stage.director.played, 2);
  w.dispose(); assert.equal(bus.count('run:events'), 0);
});

test('wiring: biome and milestone on the same step play the biome card, the milestone is dropped', () => {
  const e = env(); const stage = createStage(e); const bus = fakeBus(); wireDirector({ bus, stage, getHost: () => ({}) });
  bus.emit('run:events', { events: [{ t: 'MILESTONE', depth: 100 }, { t: 'BIOME', id: 'quartz', depth: 100 }] });
  assert.equal(stage.director.current.id, 'biome:quartz'); assert.equal(stage.director.pending, 0);
});

test('wiring: the record plays once per run; Reduce motion plays nothing visible and leaves nothing queued', () => {
  const e = env(); const stage = createStage({ ...e, isReduced: () => true }); const bus = fakeBus(); wireDirector({ bus, stage, getHost: () => ({}) });
  bus.emit('run:events', { events: [{ t: 'RECORD', depth: 300 }, { t: 'RECORD', depth: 310 }] });
  assert.equal(stage.director.current, null); assert.equal(stage.director.pending, 0); assert.equal(e.pending.size, 0);
});

test('wiring: no host (not on the Drop screen) or odd payloads do nothing and never throw', () => {
  const e = env(); const stage = createStage(e); const bus = fakeBus(); wireDirector({ bus, stage, getHost: () => null });
  bus.emit('run:events', { events: [{ t: 'BIOME', id: 'x' }] }); bus.emit('run:events', null); bus.emit('run:events', { events: 5 });
  assert.equal(stage.busy, false);
});

test('wiring: a biome card waits while a boon picker is open, then plays once', () => {
  const e = env(); const stage = createStage(e); const bus = fakeBus(); wireDirector({ bus, stage, getHost: () => ({}) });
  bus.emit('run:events', { events: [{ t: 'BIOME', id: 'quartz', depth: 100 }], view: { status: 'choosing' } }); assert.equal(stage.busy, false);
  bus.emit('run:events', { events: [], view: { status: 'running' } }); assert.equal(stage.director.current.id, 'biome:quartz');
});
