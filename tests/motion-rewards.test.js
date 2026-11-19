import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDailyChest, makeCollapse, makeAchievement, makeCodexFlip, makePartDrop, makeFlight, DAILY_MS, COLLAPSE_MS } from '../src/render/cinematics/rewards.js';
import { createNullLayer } from '../src/render/cinematics/fxLayer.js';
import { createRunner } from '../src/ui/motion/timeline.js';
import { createStage } from '../src/ui/motion/stage.js';
import { wireDirector } from '../src/ui/motion/wiring.js';
import { staggerPlan, installMicro } from '../src/ui/motion/micro.js';
import { attachResults, tickPlan } from '../src/ui/motion/results.js';

function seeded() { let s = 11; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
function fakeDoc() { const mk = () => { const e = { style: {}, attrs: {}, kids: [], setAttribute(k, v) { e.attrs[k] = v; }, append(...k) { e.kids.push(...k); }, appendChild(k) { e.kids.push(k); }, remove() { e.removed = true; } }; return e; }; return { createElement: mk }; }
const play = (def, reduce) => { const r = createRunner(def, { reduce }); r.start(); for (let i = 0; i < 300 && r.state === 'running'; i++) r.tick(16); return r; };

test('canvas reward moments finish clean (no particles, no tint) and stay within their durations', () => {
  for (const [mk, ms] of [[makeDailyChest, DAILY_MS], [makeCollapse, COLLAPSE_MS], [makeFlight, 700]]) {
    const L = createNullLayer(360, 640, seeded()); const def = mk(L, {}); assert.equal(def.durationMs, ms);
    const r = play(def); assert.equal(r.state, 'done'); assert.equal(L.pool.live, 0); assert.equal(L.tint, 0);
  }
});

test('DOM reward moments mount, then remove themselves; Reduce motion removes them at once', () => {
  for (const mk of [makeAchievement, makeCodexFlip, makePartDrop]) {
    const doc = fakeDoc(); const host = { kids: [], appendChild(n) { host.kids.push(n); } };
    const def = mk(host, { doc, title: 'Deep Diver', name: 'Amber', src: 'x.png' }); assert.equal(host.kids.length, 1);
    play(def); assert.equal(host.kids[0].removed, true);
    const host2 = { kids: [], appendChild(n) { host2.kids.push(n); } }; play(mk(host2, { doc }), true); assert.equal(host2.kids[0].removed, true);
  }
});

test('reward moments are click-through and never use pointer events', () => {
  const doc = fakeDoc(); const host = { appendChild(n) { host.n = n; } };
  for (const mk of [makeAchievement, makeCodexFlip, makePartDrop]) { mk(host, { doc }); assert.match(host.n.style.cssText, /pointer-events:none/); }
});

test('stagger plan: max 8 items, 40 ms apart', () => {
  assert.equal(staggerPlan(30).length, 8); assert.deepEqual(staggerPlan(3).map((p) => p.delay), [0, 40, 80]); assert.equal(staggerPlan(0).length, 0);
});

test('tick plan: rising pitch, ticks inside the count-up time', () => {
  const t = tickPlan(14, 900); assert.equal(t.length, 14);
  for (let i = 1; i < t.length; i++) { assert.ok(t[i].pitch > t[i - 1].pitch); assert.ok(t[i].at >= t[i - 1].at); }
  assert.ok(t[t.length - 1].at <= 900);
});

test('micro: without a page it is a harmless stub; with a fake page it staggers and disposes cleanly', () => {
  assert.doesNotThrow(() => installMicro({ doc: null }).dispose());
  const anims = []; const kid = () => ({ animate: () => { const a = { effect: { updateTiming() {} }, cancel() { a.c = true; } }; anims.push(a); return a; } });
  const list = { children: Array.from({ length: 12 }, kid) };
  const root = { addEventListener() {}, removeEventListener() {}, querySelectorAll: () => [list] };
  const doc = { getElementById: () => root, querySelector: () => null };
  const m = installMicro({ doc, root, isReduced: () => false }); m.staggerIn(root); assert.equal(anims.length, 8);
  m.dispose(); assert.ok(anims.every((a) => a.c)); assert.equal(m.running, 0);
  const r2 = installMicro({ doc, root, isReduced: () => true }); const n = anims.length; r2.staggerIn(root); assert.equal(anims.length, n);
});

function fakeResults(snapped) {
  const mkRow = (cls, extra) => { const e = { classList: { contains: (c) => c === cls || (extra || []).includes(c) }, anims: [], animate(f, o) { const a = { finish() { a.done = true; }, cancel() { a.done = true; }, o }; e.anims.push(a); return a; }, querySelector: () => num, querySelectorAll: () => [] }; return e; };
  const num = { animate(f, o) { const a = { finish() {}, cancel() {} }; num.n = (num.n || 0) + 1; return a; } };
  const rows = [mkRow('res-title'), mkRow('res-depth'), mkRow('res-gold'), mkRow('res-shards'), mkRow('res-actions')];
  const goal = { animate() { goal.n = (goal.n || 0) + 1; return { finish() {}, cancel() {} }; } };
  const goals = { classList: { contains: (c) => c === 'res-goals' }, querySelectorAll: () => [goal, goal], animate() { return null; } };
  const handlers = {};
  const screen = { classList: { contains: (c) => snapped && c === 'snapped' }, querySelector: () => null, querySelectorAll: (sel) => (sel.includes('.rv.in') ? [...rows, goals] : []),
    addEventListener: (k, f) => { handlers[k] = f; }, removeEventListener: (k) => { delete handlers[k]; } };
  return { screen, rows, goal, num, handlers };
}

test('results choreography: springs play, goals are stamped, shards fly, a tap ends it, dispose leaves no timers', async () => {
  const f = fakeResults(false); const cues = []; let flew = 0;
  const R = attachResults(f.screen, { isReduced: () => false, cue: (k, p) => cues.push(k), fly: () => flew++ });
  assert.ok(R.plays >= 6); assert.equal(flew, 1); assert.equal(f.goal.n, 2); assert.ok(R.pending > 0);
  f.handlers.pointerdown(); assert.equal(R.pending, 0); assert.ok(f.rows.every((r) => r.anims.every((a) => a.done)));
  R.dispose(); assert.equal(Object.keys(f.handlers).length, 0);
  await new Promise((r) => setTimeout(r, 1100)); assert.deepEqual(cues, []); // cancelled ticks never fire
});

test('results choreography: Reduce motion plays nothing', () => {
  const f = fakeResults(false); const R = attachResults(f.screen, { isReduced: () => true, fly: () => { throw new Error('no'); } });
  assert.equal(R.plays, 0); assert.equal(R.pending, 0); R.dispose();
});

function env() {
  let t = 0, id = 1; const pending = new Map(); const handlers = {};
  const e = { pending, now: () => t, raf: (f) => { const i = id++; pending.set(i, f); return i; }, caf: (i) => pending.delete(i), win: null, makeLayer: () => createNullLayer(360, 640, seeded()),
    run(ms) { for (let i = 0; i < ms / 16 + 3 && pending.size; i++) { t += 16; const f = Array.from(pending.values()); pending.clear(); f.forEach((x) => x(t)); } } };
  return e;
}
function bus() { const h = {}; return { on: (n, f) => { (h[n] = h[n] || []).push(f); return () => {}; }, emit: (n, p) => (h[n] || []).forEach((f) => f(p)) }; }

test('wiring: achievement banner and codex flip play once each; the same achievement twice quickly plays once', () => {
  const e = env(); const stage = createStage(e); const b = bus();
  wireDirector({ bus: b, stage, getHost: () => null, getOverlayHost: () => ({ appendChild() {} }), info: { achievement: (id) => 'Name ' + id } });
  b.emit('achievement:unlocked', { id: 'a1' }); b.emit('achievement:unlocked', { id: 'a1' }); e.run(3000); assert.equal(stage.director.played, 1);
  b.emit('codex:new', { id: 'c1' }); e.run(3000); assert.equal(stage.director.played, 2);
});

test('wiring: Collapse ceremony skips the cheat path (0 Core Dust) and plays for a real Collapse', () => {
  const e = env(); const stage = createStage(e); const b = bus(); wireDirector({ bus: b, stage, getHost: () => null, getOverlayHost: () => ({}) });
  b.emit('meta:collapsed', { coreDustGain: 0 }); assert.equal(stage.busy, false);
  b.emit('meta:collapsed', { coreDustGain: 5 }); assert.equal(stage.director.current.id, 'collapse');
});

test('wiring: daily chest only when the streak changes and the claim is used; the first bought part drops once', () => {
  const e = env(); const stage = createStage(e); const b = bus(); let daily = { streak: 2, canClaim: true }; let owned = ['hook'];
  wireDirector({ bus: b, stage, getHost: () => null, getOverlayHost: () => ({ appendChild() {} }), info: { dailyState: () => daily, ownedParts: () => owned, partIcon: () => 'p.png' } });
  b.emit('meta:changed', { what: 'gold' });                                      // learns the streak
  b.emit('meta:changed', { what: 'daily' }); assert.equal(stage.busy, false);    // a toggle, no chest
  daily = { streak: 3, canClaim: false }; b.emit('meta:changed', { what: 'daily' }); assert.equal(stage.director.current.id, 'dailyChest');
  e.run(3000); owned = ['hook', 'drill']; b.emit('meta:changed', { what: 'parts' }); assert.equal(stage.director.current.id, 'partDrop');
  e.run(3000); owned = ['hook', 'drill', 'lamp']; b.emit('meta:changed', { what: 'parts' }); assert.equal(stage.busy, false);
});

test('wiring: Reduce motion shows no reward moment and leaves nothing queued', () => {
  const e = env(); const stage = createStage({ ...e, isReduced: () => true }); const b = bus(); wireDirector({ bus: b, stage, getHost: () => null, getOverlayHost: () => ({}) });
  b.emit('meta:collapsed', { coreDustGain: 5 }); b.emit('achievement:unlocked', { id: 'x' });
  assert.equal(stage.busy, false); assert.equal(e.pending.size, 0);
});
