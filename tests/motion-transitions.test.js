import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, createTransitions, springIn } from '../src/ui/motion/transitions.js';
import * as shell from '../src/ui/shell.js';

function fakeAnim() { const a = { finished: false, cancelled: false, finish() { a.finished = true; if (a.onfinish) a.onfinish(); }, cancel() { a.cancelled = true; } }; return a; }
function fakeEl(kids = 1) {
  const el = { animations: [], childNodes: new Array(kids), parentNode: null, className: 'screen-host', style: {}, attrs: {},
    animate(frames, o) { const a = fakeAnim(); a.frames = frames; a.opts = o; el.animations.push(a); return a; },
    cloneNode() { const g = fakeEl(0); g.cloned = true; g.setAttribute = (k, v) => { g.attrs[k] = v; }; g.removeAttribute = () => {}; g.remove = () => { g.removed = true; }; return g; },
    insertBefore(n) { el.inserted = n; n.parentNode = el; }, };
  el.parentNode = { insertBefore(n) { el.inserted = n; } };
  return el;
}
const fakeWin = () => { const l = new Map(); return { l, addEventListener: (k, f) => l.set(k, f), removeEventListener: (k) => l.delete(k) }; };

test('plan: tabs fade with parallax in the right direction, back reverses, reduce is none', () => {
  assert.deepEqual(plan('home', 'rig').dir, 1); assert.equal(plan('home', 'rig').kind, 'fade');
  assert.equal(plan('workshop', 'rig').dir, -1);
  assert.equal(plan('settings', 'rewards', { back: true }).dir, -1);
  assert.equal(plan('settings', 'rewards', { back: true }).kind, 'slide');
  assert.equal(plan('home', 'rig', { reduce: true }).kind, 'none');
  assert.equal(plan('drop', 'results').kind, 'rise'); assert.equal(plan('drop', 'results').ghost, false);
  assert.equal(plan('home', 'home').kind, 'none'); assert.equal(plan(null, 'home').kind, 'none');
});

test('every planned duration is within the 400 ms UI limit', () => {
  for (const f of ['home', 'rig', 'drop', 'settings']) for (const to of ['home', 'rig', 'results', 'drop', 'guide']) assert.ok(plan(f, to).ms <= 400);
});

test('reduce motion: no animation, no ghost', () => {
  const t = createTransitions({ isReduced: () => true, win: fakeWin() }); const root = fakeEl();
  const tok = t.before(root, 'home', 'rig', false); t.after(tok);
  assert.equal(root.animations.length, 0); assert.equal(root.inserted, undefined); assert.equal(t.running, 0);
});

test('tab change animates the new screen and a ghost; a tap skips to the end and removes the ghost and listeners', () => {
  const win = fakeWin(); const t = createTransitions({ win }); const root = fakeEl();
  const tok = t.before(root, 'home', 'rig', false); t.after(tok);
  assert.equal(root.animations.length, 1); assert.ok(root.inserted && root.inserted.animations.length === 1);
  assert.equal(t.running, 2); assert.ok(win.l.has('pointerdown'));
  const ghost = root.inserted; t.skipAll();
  assert.equal(t.running, 0); assert.equal(ghost.removed, true); assert.equal(win.l.size, 0);
  for (const f of root.animations[0].frames) assert.ok(Object.keys(f).every((k) => k === 'opacity' || k === 'transform'));
});

test('no ghost for live canvas screens; dispose leaves nothing running or listening', () => {
  const win = fakeWin(); const t = createTransitions({ win }); const root = fakeEl();
  t.after(t.before(root, 'drop', 'results', false)); assert.equal(root.inserted, undefined); assert.equal(root.animations.length, 1);
  t.dispose(); assert.equal(t.running, 0); assert.equal(win.l.size, 0);
});

test('springIn: Reduce motion does not animate; close still calls done', () => {
  const p = fakeEl(), b = fakeEl(); const s = springIn(p, b, { reduce: true }); let done = 0; s.close(() => done++);
  assert.equal(p.animations.length + b.animations.length, 0); assert.equal(done, 1);
});

test('springIn: animates panel and backdrop, close plays out then calls done once', () => {
  const p = fakeEl(), b = fakeEl(); const s = springIn(p, b); let done = 0; s.close(() => done++);
  assert.ok(p.animations.length >= 2 && b.animations.length >= 2);
  p.animations[p.animations.length - 1].finish(); assert.equal(done, 1);
});

test('shell hook: navigation works the same with a throwing hook, and back passes back:true', () => {
  shell._resetForTests(); const seen = [];
  const root = { innerHTML: '' }; shell.init(root);
  shell.registerScreen('home', { mount() {} }); shell.registerScreen('rig', { mount() {} });
  shell.setMotionHook({ before: (r, f, t, back) => { seen.push([f, t, back]); return {}; }, after() { throw new Error('boom'); } });
  assert.equal(shell.go('home'), true); assert.equal(shell.go('rig'), true); assert.equal(shell.currentId(), 'rig');
  assert.equal(shell.back(), true); assert.equal(shell.currentId(), 'home');
  assert.deepEqual(seen[seen.length - 1], ['rig', 'home', true]);
  shell.setMotionHook(null); shell._resetForTests();
});
