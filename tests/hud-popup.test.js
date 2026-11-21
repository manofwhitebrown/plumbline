// [HUD-2] Pop-ups: 2.5 s, a tap dismisses, a queue, held while the boon picker is open.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPopupQueue, TOAST_MS, TOAST_QUEUE_MAX } from '../src/ui/components/toast.js';

function rig(over = {}) {
  let now = 0, id = 0; const timers = new Map(), shown = [], removed = []; let held = false;
  const q = createPopupQueue({
    ms: TOAST_MS,
    isHeld: () => held,
    schedule: (fn, ms) => { timers.set(++id, { at: now + ms, fn }); return id; },
    cancel: (t) => timers.delete(t),
    show: (m, dismiss) => { shown.push({ m, dismiss }); return { remove: () => removed.push(m.text) }; },
    ...over
  });
  const advance = (ms) => { const end = now + ms; for (;;) { const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; now = due[1].at; timers.delete(due[0]); due[1].fn(); } now = end; };
  return { q, shown, removed, advance, hold: (v) => { held = v; } };
}

test('pop-up lasts 2.5 seconds, not a millisecond less', () => {
  assert.equal(TOAST_MS, 2500);
  const r = rig(); r.q.push({ text: 'a' });
  r.advance(2499); assert.deepEqual(r.removed, []);
  r.advance(1); assert.deepEqual(r.removed, ['a']); assert.equal(r.q.showing, false);
});

test('a tap dismisses it at once and the next one follows; a second tap does nothing', () => {
  const r = rig(); r.q.push({ text: 'a' }); r.q.push({ text: 'b' });
  assert.equal(r.shown.length, 1);
  r.shown[0].dismiss(); r.shown[0].dismiss();
  assert.deepEqual(r.removed, ['a']); assert.equal(r.shown.length, 2);
  r.advance(2500); assert.deepEqual(r.removed, ['a', 'b']);
});

test('only one shows at a time; the rest wait in order and the queue is capped', () => {
  const r = rig();
  for (let i = 0; i < 12; i++) r.q.push({ text: 'm' + i });
  assert.equal(r.shown.length, 1); assert.equal(r.q.waiting, TOAST_QUEUE_MAX);
  r.advance(2500 * 6);
  assert.deepEqual(r.shown.map((s) => s.m.text), ['m0', 'm7', 'm8', 'm9', 'm10', 'm11']);
});

test('nothing starts while the boon picker is open; it starts when the picker closes', () => {
  const r = rig(); r.hold(true); r.q.push({ text: 'a' });
  r.advance(5000); assert.equal(r.shown.length, 0); assert.equal(r.q.waiting, 1);
  r.hold(false); r.advance(200); assert.equal(r.shown.length, 1);
  r.advance(2500); assert.deepEqual(r.removed, ['a']);
});

test('bad input and a failing show() do not break the queue', () => {
  const r = rig(); r.q.push(null); r.q.push(undefined); assert.equal(r.shown.length, 0);
  let n = 0; const bad = rig({ show: (m) => { if (n++ === 0) throw new Error('x'); return { remove() {} }; } });
  bad.q.push({ text: 'a' }); bad.q.push({ text: 'b' }); assert.equal(bad.q.showing, true);
});
