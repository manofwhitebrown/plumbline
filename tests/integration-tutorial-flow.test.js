import test from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { createFlow } from '../src/tutorial/flow.js';
import { STEPS, resumeId, isFirstDropStep } from '../src/tutorial/steps.js';
import { makeTimers } from './integration-helpers-fake-dom.js';

const RECT = { left: 10, top: 10, width: 100, height: 40 };

function setup(initial = {}) {
  bus.clear();
  const timers = makeTimers();
  const present = new Set();
  const state = { done: false, skipped: false, stepId: '', ...initial };
  const shows = [];
  let hides = 0;
  let last = null;
  const overlay = {
    show(spec) {
      last = spec;
      shows.push(spec);
    },
    hide() {
      hides++;
    },
  };
  const store = { get: () => state, set: (p) => Object.assign(state, p) };
  const flow = createFlow({
    bus,
    overlay,
    find: (n) => (present.has(n) ? { rect: RECT } : null),
    store,
    timers,
    log: { warn() {}, error() {} },
  });
  return { flow, timers, present, state, overlay, last: () => last, hides: () => hides, shows };
}

test('happy path: every step in order, then done', () => {
  const t = setup();
  t.present.add('home-drop');
  t.flow.start();
  assert.equal(t.flow.currentId(), 'home-drop');
  assert.equal(t.last().text, 'Tap Drop.');
  assert.equal(t.last().button, '');

  t.present.add('well').add('strain').add('haul');
  bus.emit('run:started', {});
  assert.equal(t.flow.currentId(), 'drop-gems');
  assert.equal(t.last().button, 'Got it');
  t.timers.advance(14000);
  assert.equal(t.flow.currentId(), 'drop-strain');
  t.timers.advance(14000);
  assert.equal(t.flow.currentId(), 'drop-haul');
  // The tutorial waits for the player to press Haul Up.
  t.timers.advance(60000);
  assert.equal(t.flow.currentId(), 'drop-haul');

  t.present.add('results-gold');
  bus.emit('run:ended', { outcome: 'hauled' });
  assert.equal(t.flow.currentId(), 'results-gold');
  t.last().onButton();
  // The Results screen has no tab bar: the player is sent Home first.
  assert.equal(t.flow.currentId(), 'results-home');
  t.present.add('results-home');
  t.timers.advance(300);
  assert.equal(t.flow.currentId(), 'results-home', 'waits while the tab bar is hidden');
  t.present.add('tab-workshop'); // the player tapped Home, the tab bar is back
  t.timers.advance(300);
  assert.equal(t.flow.currentId(), 'tab-workshop');
  t.timers.advance(300);
  t.present.add('workshop-part');
  t.timers.advance(300);
  assert.equal(t.flow.currentId(), 'workshop-buy');
  bus.emit('meta:changed', { what: 'parts' });
  assert.equal(t.flow.currentId(), 'tab-rig');

  t.present.add('tab-rig');
  t.timers.advance(300);
  t.present.add('rig-grid');
  t.timers.advance(300);
  assert.equal(t.flow.currentId(), 'rig-place');
  t.present.add('rig-new-part').add('rig-good-cell');
  t.timers.advance(300);
  assert.equal(t.last().rects.length, 2);
  bus.emit('rig:changed', {});
  assert.equal(t.flow.currentId(), 'second-drop');
  bus.emit('run:started', {});
  assert.equal(t.flow.currentId(), 'final');
  assert.equal(t.last().text, 'Go deeper. One more meter.');
  t.timers.advance(4500);
  assert.equal(t.flow.isActive(), false);
  assert.equal(t.state.done, true);
  assert.equal(t.timers.pending(), 0);
});

test('ending the drop early jumps to the results step', () => {
  const t = setup();
  t.present.add('home-drop').add('well');
  t.flow.start();
  bus.emit('run:started', {});
  assert.equal(t.flow.currentId(), 'drop-gems');
  bus.emit('run:ended', { outcome: 'hauled' });
  assert.equal(t.flow.currentId(), 'results-gold');
});

test('a missing target is skipped, never stuck', () => {
  const t = setup();
  t.flow.start();
  // Nothing exists on the page. Time passes. The tutorial must finish by itself.
  for (let i = 0; i < 400 && t.flow.isActive(); i++) t.timers.advance(250);
  assert.equal(t.flow.isActive(), false);
  assert.equal(t.state.done, true);
});

test('skip stops everything and is remembered', () => {
  const t = setup();
  t.present.add('home-drop');
  t.flow.start();
  t.last().onSkip();
  assert.equal(t.flow.isActive(), false);
  assert.equal(t.state.skipped, true);
  assert.equal(t.state.done, true);
  bus.emit('run:started', {});
  assert.equal(t.flow.currentId(), null);
  assert.equal(t.timers.pending(), 0);
});

test('resume picks a safe step after a reload', () => {
  assert.equal(resumeId('drop-haul'), 'home-drop');
  assert.equal(resumeId('drop-gems'), 'home-drop');
  assert.equal(resumeId('results-gold'), 'tab-workshop');
  assert.equal(resumeId('rig-place'), 'rig-place');
  assert.equal(resumeId('nonsense'), STEPS[0].id);
  assert.equal(resumeId(undefined), STEPS[0].id);
  const t = setup();
  t.present.add('home-drop');
  t.flow.start('drop-haul');
  assert.equal(t.flow.currentId(), 'home-drop');
});

test('the step is saved as the player goes', () => {
  const t = setup();
  t.present.add('home-drop').add('well');
  t.flow.start();
  assert.equal(t.state.stepId, 'home-drop');
  bus.emit('run:started', {});
  assert.equal(t.state.stepId, 'drop-gems');
});

test('an action step gives up after its time limit', () => {
  const t = setup();
  t.present.add('tab-workshop');
  t.flow.start('tab-workshop');
  assert.equal(t.flow.currentId(), 'tab-workshop');
  t.timers.advance(25000);
  assert.equal(t.flow.currentId(), 'final');
});

test('meta events only count when they are about parts', () => {
  const t = setup();
  t.present.add('workshop-part');
  t.flow.start('workshop-buy');
  bus.emit('meta:changed', { what: 'gold' });
  bus.emit('meta:changed', null);
  bus.emit('meta:changed', undefined);
  bus.emit('meta:changed', { what: 5 });
  assert.equal(t.flow.currentId(), 'workshop-buy');
  bus.emit('meta:changed', { what: 'parts' });
  assert.equal(t.flow.currentId(), 'tab-rig');
});

test('double events move only one step', () => {
  const t = setup();
  t.present.add('home-drop').add('well').add('strain');
  t.flow.start();
  bus.emit('run:started', {});
  bus.emit('run:started', {});
  assert.equal(t.flow.currentId(), 'drop-gems');
});

test('a target that disappears hides the tip, and it returns when the target does', () => {
  const t = setup();
  t.present.add('tab-rig');
  t.flow.start('tab-rig');
  assert.equal(t.flow.currentId(), 'tab-rig');
  t.present.delete('tab-rig');
  const before = t.hides();
  t.timers.advance(500);
  assert.ok(t.hides() > before);
  assert.equal(t.flow.currentId(), 'tab-rig');
  t.present.add('tab-rig');
  const shows = t.shows.length;
  t.timers.advance(300);
  assert.ok(t.shows.length > shows);
});

test('a finder that throws does not break the game', () => {
  bus.clear();
  const timers = makeTimers();
  const state = { done: false, skipped: false, stepId: '' };
  const flow = createFlow({
    bus,
    overlay: { show() {}, hide() {} },
    find: () => {
      throw new Error('boom');
    },
    store: { get: () => state, set: (p) => Object.assign(state, p) },
    timers,
    log: { warn() {}, error() {} },
  });
  assert.doesNotThrow(() => {
    flow.start();
    for (let i = 0; i < 100; i++) timers.advance(250);
  });
  assert.equal(flow.isActive(), false);
});

test('start twice does not double up', () => {
  const t = setup();
  t.present.add('home-drop').add('well');
  t.flow.start();
  t.flow.start();
  bus.emit('run:started', {});
  assert.equal(t.flow.currentId(), 'drop-gems');
});

test('step data is valid: unique ids, real jump targets, plain words only', () => {
  const ids = STEPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of STEPS) {
    for (const k of [s.skipTo, s.maxTo]) if (k) assert.ok(ids.includes(k), `${s.id} -> ${k}`);
    for (const c of s.on || []) if (c.goto) assert.ok(ids.includes(c.goto), `${s.id} goto ${c.goto}`);
    assert.ok(s.text.length > 0 && s.text.length <= 80, s.id);
    assert.ok(!/\b(beat|lane|tick|entity|null|undefined|NaN)\b/i.test(s.text), s.id);
  }
  assert.equal(isFirstDropStep('drop-haul'), true);
  assert.equal(isFirstDropStep('rig-place'), false);
});
