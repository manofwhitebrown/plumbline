import test from 'node:test';
import assert from 'node:assert/strict';
import { placeBox, edgeInset } from '../src/tutorial/overlay-math.js';
import { makeFinder } from '../src/tutorial/target.js';
import { STEPS } from '../src/tutorial/steps.js';

const SIZES = [[320, 568], [360, 640], [430, 932]];
const hit = (a, b) => a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

test('the note sits on the free side and never over what it explains, at every phone size', () => {
  for (const [w, h] of SIZES) {
    const tip = { w: Math.min(320, w - 24), h: 84 };
    const vp = { w, h };
    const bottomTarget = { left: 12, top: h - 120, width: w - 24, height: 64 }; // the Drop button
    const topTarget = { left: 20, top: 90, width: 100, height: 40 };
    for (const [target, free] of [[bottomTarget, 'top'], [topTarget, 'bottom']]) {
      const p = placeBox([target], tip, vp, { prefer: 'top', top: 60 });
      const box = { left: p.x, top: p.y, width: tip.w, height: tip.h };
      assert.equal(hit(box, target), false, `${w}x${h} over target`);
      assert.equal(p.side, free);
      assert.ok(p.x >= 12 && p.x + tip.w <= w - 12 && p.y >= 12 && p.y + tip.h <= h - 12, 'on screen');
    }
  }
});

test('the note never shows over a pop-up: it moves to the other side, or hides until the pop-up is gone', () => {
  const vp = { w: 360, h: 640 };
  const tip = { w: 320, h: 84 };
  const target = { left: 12, top: 560, width: 336, height: 60 };
  const popTop = { left: 30, top: 96, width: 300, height: 60 };
  const popBottom = { left: 30, top: 520, width: 300, height: 60 };
  // Pop-up where the note would sit (top): the note hides.
  const a = placeBox([target], tip, vp, { prefer: 'top', top: 84, avoid: [popTop] });
  assert.equal(a.hidden, true);
  // Pop-up at the bottom, target at the top: the note is not blocked at the top.
  const b = placeBox([{ left: 12, top: 300, width: 100, height: 40 }], tip, vp, { prefer: 'bottom', avoid: [popBottom] });
  assert.equal(b.hidden, false);
  assert.equal(b.side, 'top');
  // No pop-up: shown.
  assert.equal(placeBox([target], tip, vp, { prefer: 'top', top: 84 }).hidden, false);
});

test('junk input does not throw and the note stays on screen', () => {
  assert.doesNotThrow(() => placeBox(null, null, null));
  const p = placeBox([null, { left: NaN }], { w: 100, h: 50 }, { w: 320, h: 568 });
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});

test('a thin strip at the left edge (the rope gauge) pushes the note to its right', () => {
  assert.equal(edgeInset([{ left: 0, top: 96, width: 20, height: 448 }], 360), 28);
  assert.equal(edgeInset([{ left: 100, top: 96, width: 200, height: 40 }], 360), 12);
});

test('every step names its side, and drop steps keep the note off the bottom Haul Up button', () => {
  for (const s of STEPS) assert.ok(s.side === undefined || s.side === 'top' || s.side === 'bottom', s.id);
  for (const id of ['home-drop', 'drop-gems', 'drop-strain', 'drop-haul']) assert.equal(STEPS.find((s) => s.id === id).side, 'top', id);
});

function fakeDoc(el) {
  return { querySelector: (q) => (q.includes('home-drop') ? el : null), querySelectorAll: () => [] };
}

test('a button that is still sliding in is not pointed at until it holds still', () => {
  let t = 0;
  const el = { rect: { left: 16, top: 600, width: 160, height: 44 }, getBoundingClientRect() { return { ...this.rect }; } };
  const find = makeFinder(fakeDoc(el), { stable: true, now: () => t });
  assert.equal(find('home-drop'), null, 'first sighting');
  t = 250; el.rect = { left: 16, top: 590, width: 160, height: 44 };
  assert.equal(find('home-drop'), null, 'moved');
  t = 400;
  assert.equal(find('home-drop'), null, 'stopped only 150 ms ago');
  t = 500;
  assert.ok(find('home-drop'), 'held still for 250 ms');
});

test('a target that keeps moving (a pulsing button) is accepted after 1.5 s, so the guide never disappears for good', () => {
  let t = 0;
  let y = 600;
  const el = { getBoundingClientRect: () => ({ left: 16, top: y, width: 160, height: 44 }) };
  const find = makeFinder(fakeDoc(el), { stable: true, now: () => t });
  let found = false;
  for (t = 0; t <= 1800; t += 250) { y += 4; found = !!find('home-drop'); }
  assert.equal(found, true);
});

test('without the stable option the finder answers at once (old behaviour)', () => {
  const el = { getBoundingClientRect: () => ({ left: 1, top: 2, width: 30, height: 30 }) };
  assert.ok(makeFinder(fakeDoc(el))('home-drop'));
});

test('after the first drop, dropping again sends every later step to the closing notes', () => {
  for (const id of ['results-gold', 'tab-workshop', 'workshop-wait', 'workshop-buy', 'tab-rig', 'rig-place']) {
    const s = STEPS.find((x) => x.id === id);
    const again = s.on.find((c) => c.bus === 'run:started' || c.afterMs);
    assert.ok(again && again.goto === 'crew-intro', id + ' has a way out');
  }
});

test('finder scrolls a far-down tutorial target into view once, then reports it', () => {
  let calls = 0;
  const el = { getBoundingClientRect: () => ({ left: 10, top: 700, width: 80, height: 90 }), scrollIntoView: () => { calls++; el.getBoundingClientRect = () => ({ left: 10, top: 300, width: 80, height: 90 }); }, getAttribute: () => null };
  const doc = { defaultView: { innerHeight: 640 }, querySelector: () => el, querySelectorAll: () => [] };
  const find = makeFinder(doc, {});
  assert.equal(find('rig-new-part'), null, 'first look scrolls and waits');
  assert.equal(calls, 1);
  const f = find('rig-new-part');
  assert.ok(f && f.rect.top === 300);
  assert.equal(calls, 1, 'scrolls only once');
});

test('Results step is patient (slow phones) but never endless', () => {
  const s = STEPS.find((x) => x.id === 'results-gold');
  assert.ok(s.findMs >= 30000 && s.maxMs <= 180000);
});
