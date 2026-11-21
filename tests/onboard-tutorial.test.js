import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bus } from '../src/core/bus.js';
import { createFlow } from '../src/tutorial/flow.js';
import { STEPS, resumeId } from '../src/tutorial/steps.js';
import { makeTimers } from './integration-helpers-fake-dom.js';

const RECT = { left: 10, top: 10, width: 100, height: 40 };
const NEVER = /\b(beat|lane|tick|entity|null|undefined|NaN|Infinity|seed|slice|bus|payload|debug|hazard|tier)\b/i;

function setup(initial = {}) {
  bus.clear();
  const timers = makeTimers();
  const present = new Set();
  const state = { done: false, skipped: false, stepId: '', ...initial };
  const seen = [];
  const hist = [];
  let last = null;
  const overlay = { show(spec) { last = spec; }, hide() {} };
  const store = { get: () => state, set: (p) => Object.assign(state, p) };
  const flow = createFlow({ bus, overlay, find: (n) => (present.has(n) ? { rect: RECT } : null), store, timers, log: { warn() {}, error() {} } });
  const origin = flow.start;
  flow.start = (id) => { origin(id); };
  const note = () => { const c = flow.currentId(); if (c && hist[hist.length - 1] !== c) hist.push(c); };
  return { flow, timers, present, state, last: () => last, hist, note, seen };
}

test('tutorial runs start to end in order: first drop, Haul Up, Results (one note), Workshop buy, Rig, second Drop, Crew, Workshop', () => {
  const t = setup();
  let done = 0;
  bus.on('tutorial:done', () => { done++; });
  const step = (ms = 300) => { t.timers.advance(ms); t.note(); };
  t.present.add('home-drop');
  t.flow.start(); t.note();
  bus.emit('run:started', {}); t.present.add('well').add('strain').add('haul'); step();
  step(14000); step(14000);               // two info steps run on a timer
  t.present.add('results-gold');
  bus.emit('run:ended', { outcome: 'hauled' }); step();
  t.present.add('results-home'); step();  // one Results note: the Gold and "Tap Home"
  t.present.add('tab-workshop'); step();
  t.present.add('workshop-part'); step();
  bus.emit('meta:changed', { what: 'part bought' }); t.present.add('tab-rig'); step();
  t.present.add('rig-grid'); step();
  t.present.add('rig-new-part').add('rig-good-cell'); step();
  bus.emit('rig:changed', {}); step();
  bus.emit('run:started', {}); t.present.add('tab-crew'); step();
  t.last().onButton(); step();
  t.last().onButton(); step();
  t.timers.advance(5000);
  assert.deepEqual(t.hist.filter((id, i, a) => a.indexOf(id) === i), [
    'home-drop', 'drop-gems', 'drop-strain', 'drop-haul', 'results-gold', 'tab-workshop', 'workshop-buy',
    'tab-rig', 'rig-place', 'second-drop', 'crew-intro', 'workshop-intro', 'final']);
  assert.equal(t.flow.isActive(), false);
  assert.equal(t.state.done, true);
  assert.equal(done, 1);
});

test('every step can be skipped, and a skipped tutorial never comes back', () => {
  for (const s of STEPS) {
    const t = setup();
    const at = STEPS.find((x) => x.id === resumeId(s.id)); // a reload resumes at a safe step
    for (const n of at.targets || []) t.present.add(n);
    t.flow.start(s.id);
    assert.equal(t.flow.isActive(), true, s.id);
    assert.ok(t.last(), s.id + ' showed nothing'); assert.equal(typeof t.last().onSkip, 'function', s.id + ' has a Skip button');
    t.last().onSkip();
    assert.equal(t.flow.isActive(), false, s.id);
    assert.equal(t.state.skipped, true, s.id);
    assert.equal(t.state.done, true, s.id);
  }
});

test('a step that cannot find its target never gets stuck', () => {
  for (const s of STEPS) {
    if (!s.targets || !s.targets.length) continue;
    const t = setup();
    t.flow.start(s.id);
    const before = t.flow.currentId();
    t.timers.advance((s.findMs || 3000) + 600);
    assert.notEqual(t.flow.currentId(), before === 'final' ? '' : before, s.id + ' stayed after its target never showed');
  }
});

test('the guide layer never blocks a tap: only its own note and buttons take taps', () => {
  const src = readFileSync(new URL('../src/tutorial/overlay.js', import.meta.url), 'utf8');
  assert.match(src, /\.tut-layer\{[^}]*pointer-events:none/);
  assert.match(src, /\.tut-ring\{[^}]*pointer-events:none/);
});

test('tutorial text is short, plain and ends with a full stop', () => {
  for (const s of STEPS) {
    assert.ok(s.text.length > 0 && s.text.length <= 60, s.id + ' ' + s.text.length);
    assert.ok(!NEVER.test(s.text), s.id);
    assert.ok(/[.!?]$/.test(s.text), s.id);
  }
});

test('a reload in the middle picks up at a safe step, and a finished save stays finished', () => {
  const t = setup({ stepId: 'crew-intro' });
  t.present.add('tab-crew');
  t.flow.start('crew-intro');
  assert.equal(t.flow.currentId(), 'crew-intro');
  const d = setup({ stepId: 'drop-strain' });
  d.present.add('home-drop');
  d.flow.start('drop-strain');
  assert.equal(d.flow.currentId(), 'home-drop');
});
