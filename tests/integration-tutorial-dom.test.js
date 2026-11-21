import test from 'node:test';
import assert from 'node:assert/strict';
import { bus } from '../src/core/bus.js';
import { resetAll, registerSlice, getSlice } from '../src/core/save.js';
import { placeTip } from '../src/tutorial/overlay-math.js';
import { pickGoodCell, makeFinder, readRect } from '../src/tutorial/target.js';
import { createOverlay } from '../src/tutorial/overlay.js';
import { tutorial } from '../src/tutorial/index.js';
import { makeFakePage } from './integration-helpers-fake-dom.js';

const VP = { w: 360, h: 640 };
const TIP = { w: 300, h: 90 };

test('tooltip goes below, above, inside or centre, and stays on screen', () => {
  assert.equal(placeTip({ left: 100, top: 100, width: 100, height: 40 }, TIP, VP).side, 'below');
  assert.equal(placeTip({ left: 100, top: 560, width: 100, height: 40 }, TIP, VP).side, 'above');
  assert.equal(placeTip({ left: 0, top: 0, width: 360, height: 640 }, TIP, VP).side, 'inside');
  assert.equal(placeTip(null, TIP, VP).side, 'center');
  assert.equal(placeTip({ left: NaN, top: 1, width: 1, height: 1 }, TIP, VP).side, 'center');
  assert.equal(placeTip(undefined, undefined, undefined).side, 'center');
});

test('tooltip never leaves the screen (many sizes, shapes and positions)', () => {
  let s = 99;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const sizes = [[360, 640], [390, 844], [430, 932], [768, 1024], [1440, 900], [640, 360]];
  for (const [w, h] of sizes) {
    for (let i = 0; i < 200; i++) {
      const rect = { left: rnd() * w * 1.2 - 40, top: rnd() * h * 1.2 - 40, width: 20 + rnd() * w, height: 20 + rnd() * h };
      const tip = { w: 120 + rnd() * 200, h: 50 + rnd() * 120 };
      const p = placeTip(rect, tip, { w, h });
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert.ok(p.x >= 12 && p.x + tip.w <= w - 12 + 0.001, `x ${p.x} in ${w}`);
      assert.ok(p.y >= 12 && p.y + tip.h <= h - 12 + 0.001, `y ${p.y} in ${h}`);
    }
  }
});

test('good cell: next to the Hook, in its row', () => {
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) cells.push({ r, c, part: r === 2 && c === 1 ? 'hook' : '' });
  const pick = pickGoodCell(cells);
  assert.equal(pick.r, 2);
  assert.ok(pick.c === 0 || pick.c === 2);
  assert.equal(pick.c, 0);
});

test('good cell: handles full, empty and broken lists', () => {
  assert.equal(pickGoodCell([]), null);
  assert.equal(pickGoodCell(null), null);
  assert.equal(pickGoodCell([{ r: 0, c: 0, part: 'hook' }]), null);
  assert.equal(pickGoodCell([{ r: NaN, c: 0, part: '' }, null, undefined]), null);
  assert.equal(pickGoodCell([{ r: 0, c: 0, part: '' }]).c, 0);
});

test('finder reads marked elements and ignores empty or missing ones', () => {
  const page = makeFakePage();
  page.add('home-drop', { left: 20, top: 500, width: 320, height: 64 });
  page.add('haul', { left: 0, top: 0, width: 0, height: 0 });
  const find = makeFinder(page.doc);
  assert.equal(find('home-drop').rect.width, 320);
  assert.equal(find('haul'), null);
  assert.equal(find('nope'), null);
  assert.equal(find(undefined), null);
  assert.equal(makeFinder(null)('x'), null);
  assert.equal(readRect(null), null);
});

test('finder picks a good rig cell from the page', () => {
  const page = makeFakePage();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      page.add('rig-cell', { left: c * 80, top: 100 + r * 80, width: 70, height: 70 }, { 'data-r': r, 'data-c': c, 'data-part': r === 2 && c === 1 ? 'hook' : '' });
    }
  }
  const find = makeFinder(page.doc);
  const f = find('rig-good-cell');
  assert.equal(f.el.getAttribute('data-r'), '2');
  assert.equal(f.el.getAttribute('data-c'), '0');
});

test('overlay: shows a ring and tip, hides, and follows a resize', () => {
  const page = makeFakePage(360, 640);
  const o = createOverlay(page.doc, page.win);
  let got = 0;
  let skipped = 0;
  o.show({ rects: [{ left: 100, top: 100, width: 100, height: 40 }], text: 'Tap Drop.', button: 'Got it', onButton: () => got++, onSkip: () => skipped++ });
  const layer = page.body.children[0];
  const tip = layer.children[layer.children.length - 1];
  const ring = layer.children[0];
  assert.equal(ring.style.display, 'block');
  assert.equal(layer.style.display, 'block');
  assert.equal(o.isVisible(), true);
  assert.ok(parseInt(tip.style.left, 10) >= 12);
  // Tap Got it and Skip.
  const actions = tip.children[1];
  actions.children[1].click();
  actions.children[0].click();
  assert.equal(got, 1);
  assert.equal(skipped, 1);
  // Same content again: no problem.
  o.show({ rects: [{ left: 100, top: 100, width: 100, height: 40 }], text: 'Tap Drop.', button: 'Got it' });
  // Rotate the phone.
  page.win.innerWidth = 640;
  page.win.innerHeight = 360;
  page.win.fire('resize');
  assert.ok(parseInt(tip.style.left, 10) + 200 <= 640);
  // No second ring needed.
  assert.equal(layer.children[1].style.display, 'none');
  o.hide();
  assert.equal(layer.style.display, 'none');
  o.destroy();
  assert.equal(page.win.count('resize'), 0);
  assert.equal(page.body.children.length, 0);
});

test('overlay: junk input does not throw', () => {
  const page = makeFakePage();
  const o = createOverlay(page.doc, page.win);
  assert.doesNotThrow(() => {
    o.show(null);
    o.show({});
    o.show({ rects: 'x', text: 5, button: null });
    o.show({ rects: [null, undefined], text: 'a' });
    o.hide();
    o.hide();
    o.destroy();
    o.destroy();
  });
});

test('tutorial: not shown without a page, and nothing breaks', () => {
  resetAll();
  assert.equal(tutorial.start(), false);
  assert.equal(tutorial.isActive(), false);
  assert.equal(tutorial.runOptions(), null);
  assert.doesNotThrow(() => tutorial.skip());
  assert.equal(getSlice('tutorial').skipped, true);
});

test('tutorial: runs in a page, gives first-drop options, can be skipped, never returns', async () => {
  resetAll();
  bus.clear();
  const page = makeFakePage();
  page.add('home-drop', { left: 20, top: 500, width: 320, height: 64 });
  globalThis.document = page.doc;
  globalThis.window = page.win;
  try {
    assert.equal(tutorial.start(), true);
    assert.equal(tutorial.isActive(), true);
    const opts = tutorial.runOptions();
    assert.equal(opts.tutorial, true);
    assert.equal(opts.seed, 7);
    assert.equal(opts.safeUntilDepth, 40);
    assert.equal(opts.rig.cells[2][1], 'hook');
    assert.equal(opts.rig.cells.flat().filter(Boolean).length, 1);
    const layers = () => page.body.children.filter((e) => e.className === 'tut-layer').length;
    await new Promise((r) => setTimeout(r, 700)); // the guide waits until the target has held still
    assert.equal(layers(), 1);
    tutorial.skip();
    assert.equal(tutorial.isActive(), false);
    assert.equal(tutorial.runOptions(), null);
    assert.equal(layers(), 0);
    // Never twice.
    assert.equal(tutorial.start(), false);
  } finally {
    tutorial.skip();
    delete globalThis.document;
    delete globalThis.window;
  }
});

test('tutorial: an old save that has played before is not taught', () => {
  resetAll();
  const run = registerSlice('run', { version: 1, defaults: { bestDepth: 0 } });
  run.bestDepth = 250;
  const page = makeFakePage();
  globalThis.document = page.doc;
  try {
    assert.equal(tutorial.start(), false);
    assert.equal(getSlice('tutorial').done, true);
  } finally {
    delete globalThis.document;
    run.bestDepth = 0;
  }
});
