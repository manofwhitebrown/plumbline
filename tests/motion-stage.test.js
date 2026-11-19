import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStage } from '../src/ui/motion/stage.js';
import { createNullLayer } from '../src/render/cinematics/fxLayer.js';
import { _resetDropCount } from '../src/render/cinematics/dropStart.js';
import * as flow from '../src/ui/flow.js';

function rig(over) {
  let t = 0, nextId = 1; const pending = new Map(); const listeners = new Map();
  const env = {
    pending, listeners,
    raf: (f) => { const id = nextId++; pending.set(id, f); return id; },
    caf: (id) => pending.delete(id),
    now: () => t,
    win: { addEventListener: (k, f) => listeners.set(k, f), removeEventListener: (k) => listeners.delete(k) },
    makeLayer: () => createNullLayer(360, 640),
    step(ms) { t += ms; const fs = Array.from(pending.values()); pending.clear(); fs.forEach((f) => f(t)); },
    run(ms) { for (let i = 0; i < ms / 16 + 2 && pending.size; i++) env.step(16); },
  };
  return Object.assign(env, over || {});
}

test('stage: drop start calls onGo once at the end, then the loop and listeners are gone', () => {
  _resetDropCount(); const e = rig(); const s = createStage(e); let n = 0;
  assert.equal(s.playBlocking({}, 'drop', { onGo: () => n++ }), true);
  assert.ok(e.listeners.has('pointerdown')); e.run(2000);
  assert.equal(n, 1); assert.equal(e.pending.size, 0); assert.equal(e.listeners.size, 0); assert.equal(s.busy, false);
});

test('stage: a tap skips a blocking moment (onGo once) and never needs preventDefault', () => {
  _resetDropCount(); const e = rig(); const s = createStage(e); let n = 0;
  s.playBlocking({}, 'snap', { onGo: () => n++ }); e.step(16); e.step(16);
  e.listeners.get('pointerdown')({ type: 'pointerdown' }); assert.equal(n, 1); e.run(500); assert.equal(n, 1);
});

test('stage: Reduce motion runs onGo at once with no loop', () => {
  const e = rig(); const s = createStage({ ...e, isReduced: () => true }); let n = 0;
  assert.equal(s.playBlocking({}, 'haul', { onGo: () => n++ }), true);
  assert.equal(n, 1); assert.equal(e.pending.size, 0); assert.equal(e.listeners.size, 0);
});

test('stage: a second blocking moment of the same kind is refused, so the caller can go on at once', () => {
  const e = rig(); const s = createStage(e);
  assert.equal(s.playBlocking({}, 'snap', { onGo() {} }), true); assert.equal(s.playBlocking({}, 'snap', { onGo() {} }), false);
});

test('stage: dispose leaves no pending frames, listeners or queued moments', () => {
  const e = rig(); const s = createStage(e); s.playBlocking({}, 'drop', { onGo() {} });
  s.dispose(); assert.equal(e.pending.size, 0); assert.equal(e.listeners.size, 0); assert.equal(s.busy, false);
});

test('stage: no host means no takeover', () => { assert.equal(createStage(rig()).playBlocking(null, 'drop', {}), false); });

test('flow: run end shows Results at once when the hook declines, and only after goFn when it takes over', () => {
  const handlers = []; const bus = { on: (n, f) => { handlers.push([n, f]); return () => {}; } };
  const calls = []; flow.setRunEndHook(null); flow.wireRunEnd(bus);
  const fire = handlers.find((h) => h[0] === 'run:ended')[1];
  let went = 0; flow.setRunEndHook((p, go) => { calls.push(p); return false; });
  try { fire({ outcome: 'hauled' }); } catch (e) { /* shell.go with no screens just returns false */ }
  assert.equal(calls.length, 1);
  let held = null; flow.setRunEndHook((p, go) => { held = go; return true; }); fire({ outcome: 'snapped' }); assert.equal(typeof held, 'function');
  flow.setRunEndHook(() => { throw new Error('x'); }); fire({}); flow.setRunEndHook(null); assert.equal(went, 0);
});
