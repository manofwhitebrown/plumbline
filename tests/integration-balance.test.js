// NEW-6: guards for the balance numbers. If one of these fails, a tuning change moved a design target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun } from '../src/engine/index.js';
import { ENGINE, DEFAULT_MODS } from '../src/data/engine.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { deps } from '../src/run/deps.js';
import { suggest } from '../src/tutorial/suggest.js';
import { playBot, partImpacts, MUST_HAVE_LOSS } from '../tools/bot.js';

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)];
const median = (a) => pct(a, 0.5);

test('the live game reads its beat length from ENGINE.baseBeatMs (not a hidden 450 fallback)', () => {
  assert.equal(deps.baseBeatMs, ENGINE.baseBeatMs);
});

test('first drop lasts 45-90 s (CONTRACT section: a normal drop lasts 45-90 s)', () => {
  const mods = { ...DEFAULT_MODS };
  const rig = suggest.bestRig(mods, { hook: 1 }, { maxEvals: 30 });
  const secs = (policy) => { const a = []; for (let s = 1; s <= 300; s++) a.push(simulateRun({ rig, mods, seed: s, policy }).beats * ENGINE.baseBeatMs / 1000); return a; };
  const never = secs(undefined);
  const haul80 = secs(({ run }) => (run.state.strain >= 0.8 * run.state.maxStrain ? 'haul' : 'continue'));
  assert.ok(pct(never, 0.1) >= 45 && pct(never, 0.9) <= 90, 'never haul 10%..90%: ' + pct(never, 0.1) + '..' + pct(never, 0.9));
  assert.ok(median(haul80) >= 45 && median(haul80) <= 90, 'haul at 80%: ' + median(haul80));
});

test('rope ladder can reach 1500 max Strain (the mods clamp) and no further', () => {
  const rope = UPGRADES.find((u) => u.id === 'rope');
  assert.equal(100 + rope.per * rope.max, 1500);
});

test('bot: a never-haul player reaches the first Collapse in 1.3 to 3.5 hours', () => {
  const r = playBot('never', { hours: 4, partChecks: false }); // [ECONOMY-2] part dominance is reported by tools/balance-report.js, not pinned here
  assert.deepEqual(r.problems, []);
  const h = r.timeline.collapse / 3600;
  assert.ok(h >= 1.3 && h <= 3.5, 'collapse at ' + h.toFixed(2) + ' h');
});

test('part impact: banning a part never reports a loss outside 0..1, the Hook is skipped', () => {
  const mods = { ...DEFAULT_MODS, cols: 4, rows: 3 };
  const owned = { hook: 1, magnet: 1, polisher: 1 };
  const rig = suggest.bestRig(mods, owned, { maxEvals: 40 });
  const imp = partImpacts(mods, owned, rig, 100);
  assert.equal(imp.hook, undefined);
  for (const v of Object.values(imp)) assert.ok(v >= 0 && v <= 1);
  assert.ok(MUST_HAVE_LOSS > 0.5 && MUST_HAVE_LOSS < 1);
});

test('tutorial: the first drop earns enough Gold to buy the first part by the time Haul is offered', async () => {
  const { getPart } = await import('../src/engine/parts/index.js');
  const { STEPS, FIRST_DROP_SEED, SAFE_DEPTH } = await import('../src/tutorial/steps.js');
  const { emptyRig } = await import('../src/tutorial/suggest.js');
  const hintMs = STEPS.filter((s) => s.id === 'drop-gems' || s.id === 'drop-strain').reduce((a, s) => a + s.on.find((o) => o.afterMs).afterMs, 0);
  const beats = Math.round(hintMs / ENGINE.baseBeatMs);
  const rig = emptyRig(4, 3); rig.cells[2][1] = 'hook';
  const r = simulateRun({ rig, mods: { ...DEFAULT_MODS }, seed: FIRST_DROP_SEED, safeUntilDepth: SAFE_DEPTH, policy: ({ run }) => (run.state.beat >= beats ? 'haul' : 'continue') });
  assert.ok(r.kept >= getPart('magnet').cost + 3, `tutorial drop earns ${r.kept} but the Magnet costs ${getPart('magnet').cost} (keep a margin of 3 Gold for a slightly early tap)`);
});

test('session: the tutorial drop gets its fixed seed, other drops are random', async () => {
  const { setup } = await import('./run-helpers.js');
  const { session } = await import('../src/run/session.js');
  const t = setup();
  assert.equal(session.start({ tutorial: true, seed: 7, safeUntilDepth: 40 }).seed, 7);
  session.abort(); t.off();
  const t2 = setup();
  const a = session.start().seed; session.abort(); t2.off();
  const t3 = setup(); const b = session.start().seed;
  assert.notEqual(a, 7); assert.ok(Number.isFinite(b));
  session.abort(); t3.off();
});
