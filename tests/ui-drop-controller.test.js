import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDropController } from '../src/ui/logic/dropController.js';

// A bus that counts live listeners, so a leak shows up as a number.
function makeBus() {
  const map = new Map();
  return {
    on(name, fn) {
      const list = map.get(name) || [];
      list.push(fn); map.set(name, list);
      return () => { const l = map.get(name) || []; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
    },
    emit(name, p) { for (const fn of (map.get(name) || []).slice()) fn(p); },
    live() { let n = 0; for (const l of map.values()) n += l.length; return n; },
  };
}

function setup(over = {}) {
  const bus = makeBus();
  const calls = [];
  const frameCbs = [];
  let running = false, status = 'idle';
  const session = {
    start: (o) => { calls.push('start'); running = true; status = 'running'; bus.emit('run:started', { view: { status: 'running', depth: 0 } }); return over.startResult || { ok: true }; },
    haul: () => { calls.push('haul'); return over.haulResult || { ok: true }; },
    pause: () => calls.push('pause'), resume: () => calls.push('resume'), abort: () => calls.push('abort'),
    getView: () => ({ status }), isRunning: () => running,
    onFrame: (fn) => { frameCbs.push(fn); return () => { frameCbs.splice(frameCbs.indexOf(fn), 1); }; },
  };
  const rendered = [];
  const renderer = { setRun: () => rendered.push('setRun'), pushEvents: (e) => rendered.push(['events', e.length]), frame: () => rendered.push('frame') };
  const hudCalls = [];
  const hud = { update: (v) => hudCalls.push(['update', v && v.depth]), setHauling: (b) => hudCalls.push(['hauling', b]) };
  let open = false;
  const pause = { open: () => { open = true; }, close: () => { open = false; }, isOpen: () => open };
  const buzzes = [], sounds = [], exits = [], fails = [];
  const c = createDropController({ bus, session, renderer, hud, pause, buzz: (k) => buzzes.push(k), ui: (k) => sounds.push(k),
    getRig: () => ({ cols: 4, rows: 3, cells: [] }), onExit: (k) => exits.push(k), onFail: (e) => fails.push(e) });
  return { bus, calls, frameCbs, renderer, rendered, hudCalls, pause, buzzes, sounds, exits, fails, c, session, setStatus: (s) => { status = s; } };
}

test('start begins a drop and hands the rig to the renderer', () => {
  const t = setup();
  assert.equal(t.c.start({}), true);
  assert.deepEqual(t.calls, ['start']);
  assert.ok(t.rendered.includes('setRun'));
});

test('a failed start reports and does not play', () => {
  const t = setup({ startResult: { ok: false, error: 'Could not start the drop. Try again.' } });
  assert.equal(t.c.start({}), false);
  assert.equal(t.fails.length, 1);
  assert.equal(t.c.haul(), false);
});

test('run events reach the renderer and the HUD; frames reach the renderer', () => {
  const t = setup();
  t.c.start({});
  t.bus.emit('run:events', { events: [{ t: 'BEAT' }, { t: 'SPAWN' }], view: { depth: 5, dangerLevel: 0 } });
  assert.ok(t.rendered.some((x) => Array.isArray(x) && x[1] === 2));
  assert.ok(t.hudCalls.some((x) => x[0] === 'update' && x[1] === 5));
  t.frameCbs[0](16, 0.5);
  assert.ok(t.rendered.includes('frame'));
});

test('bad bus messages never throw', () => {
  const t = setup();
  t.c.start({});
  assert.doesNotThrow(() => { t.bus.emit('run:events', null); t.bus.emit('run:events', { events: 'x' }); t.bus.emit('run:started', null); });
});

test('Haul Up spam calls the run once and disables the button', () => {
  const t = setup();
  t.c.start({});
  for (let i = 0; i < 30; i++) t.c.haul();
  assert.equal(t.calls.filter((x) => x === 'haul').length, 1);
  assert.deepEqual(t.hudCalls.filter((x) => x[0] === 'hauling'), [['hauling', true]]);
});

test('Space hauls once; held key repeats are ignored', () => {
  const t = setup();
  t.c.start({});
  let prevented = 0;
  const ev = (over) => ({ key: ' ', code: 'Space', preventDefault: () => prevented++, ...over });
  assert.equal(t.c.onKey(ev({ repeat: true })), true);
  assert.equal(t.calls.filter((x) => x === 'haul').length, 0);
  t.c.onKey(ev());
  t.c.onKey(ev());
  assert.equal(t.calls.filter((x) => x === 'haul').length, 1);
  assert.equal(t.c.onKey({ key: 'a' }), false);
  assert.ok(prevented >= 1);
});

test('back and Esc open the pause menu, never leave; back again resumes', () => {
  const t = setup();
  t.c.start({});
  assert.equal(t.c.onBack(), true);
  assert.equal(t.pause.isOpen(), true);
  assert.ok(t.calls.includes('pause'));
  assert.equal(t.c.onBack(), true);
  assert.equal(t.pause.isOpen(), false);
  assert.ok(t.calls.includes('resume'));
});

test('no Haul Up while the pause menu is open', () => {
  const t = setup();
  t.c.start({});
  t.c.openPause();
  assert.equal(t.c.haul(), false);
  assert.equal(t.calls.includes('haul'), false);
});

test('Haul Up now from the pause menu resumes then hauls once', () => {
  const t = setup();
  t.c.start({});
  t.c.openPause();
  t.c.haulFromPause();
  t.c.haulFromPause();
  assert.deepEqual(t.calls.slice(-2), ['resume', 'haul']);
  assert.equal(t.calls.filter((x) => x === 'haul').length, 1);
});

test('hidden tab opens the pause menu once the drop is going', () => {
  const t = setup();
  t.c.start({});
  t.c.onHidden();
  assert.equal(t.pause.isOpen(), true);
});

test('quit aborts and exits; nothing works after', () => {
  const t = setup();
  t.c.start({});
  t.c.openPause();
  t.c.quit();
  assert.ok(t.calls.includes('abort'));
  assert.deepEqual(t.exits, ['quit']);
  assert.equal(t.c.onBack(), false);
  assert.equal(t.c.haul(), false);
});

test('after the run ends, back is not captured', () => {
  const t = setup();
  t.c.start({});
  t.bus.emit('run:ended', { outcome: 'hauled' });
  assert.equal(t.c.onBack(), false);
});

test('buzz on snap, record and the first danger moment', () => {
  const t = setup();
  t.c.start({});
  t.bus.emit('run:events', { events: [{ t: 'SNAP' }, { t: 'RECORD' }], view: { dangerLevel: 3 } });
  t.bus.emit('run:events', { events: [], view: { dangerLevel: 3 } });
  assert.deepEqual(t.buzzes.filter((b) => b !== 'tap'), ['snap', 'record', 'warn']);
});

test('dispose removes every bus listener and frame hook (no leaks)', () => {
  const t = setup();
  t.c.start({});
  assert.ok(t.bus.live() >= 4);
  assert.equal(t.frameCbs.length, 1);
  t.c.dispose();
  assert.equal(t.bus.live(), 0);
  assert.equal(t.frameCbs.length, 0);
  t.c.dispose();
  t.bus.emit('run:events', { events: [{ t: 'BEAT' }], view: {} });
  assert.equal(t.rendered.filter((x) => Array.isArray(x)).length, 0);
});

test('mount and unmount 50 times leaves no listeners', () => {
  const bus = makeBus();
  for (let i = 0; i < 50; i++) {
    const c = createDropController({ bus, session: { start: () => ({ ok: true }), onFrame: () => () => {} },
      renderer: {}, hud: {}, pause: { isOpen: () => false } });
    c.start({});
    c.dispose();
  }
  assert.equal(bus.live(), 0);
});

test('re-entering a drop that was left (paused) shows the pause menu', () => {
  const t = setup();
  t.c.start({});
  const t2 = setup();
  t2.session.isRunning = () => true;
  t2.setStatus('paused');
  t2.c.start({});
  assert.equal(t2.calls.includes('start'), false);
  assert.equal(t2.pause.isOpen(), true);
});

// Found in a real browser: flow.startDrop() starts the session, then the Drop screen calls start(). That must
// show the running drop and NOT open the pause menu (it paused every drop about 1.5 s in).
test('a drop that flow.startDrop() just started is shown, not paused', () => {
  const t = setup();
  t.session.isRunning = () => true;
  t.setStatus('running');
  assert.equal(t.c.start({}), true);
  assert.equal(t.calls.includes('start'), false, 'must not start a second run');
  assert.equal(t.calls.includes('pause'), false);
  assert.equal(t.pause.isOpen(), false);
  assert.equal(t.c.haul(), true, 'Haul works right away');
});
