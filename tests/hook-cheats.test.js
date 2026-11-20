import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stepBeat, chooseBoon, useSkill, playView } from '../src/engine/index.js';
import { cleanPlayCheat } from '../src/engine/play/cheats.js';
import { PLAY } from '../src/cheats/catalog-game.js';
import { BOONS } from '../src/data/boons.js';

const RIG = { cols: 4, rows: 3, cells: [['hook', 'hook', 'magnet', 'hook'], [null, null, null, null], [null, null, null, null]] };
const mk = (play, seed = 3) => createRun({ rig: RIG, mods: { maxStrain: 300, strainMult: 0.4, cheat: { play } }, seed, play: {} });

test('cheat keys are cleaned: junk is dropped', () => {
  assert.equal(cleanPlayCheat(null), null);
  assert.equal(cleanPlayCheat({ forceEncounter: 'nope', forceGuardian: 'x', giveBoons: 'some' }), null);
  assert.deepEqual(cleanPlayCheat({ freeSkills: true, firstOfferDepth: 12.7 }), { freeSkills: true, firstOfferDepth: 12 });
});

test('every boon at the start', () => {
  const run = mk({ giveBoons: 'all' });
  assert.equal(playView(run).boons.length, BOONS.length);
  for (let i = 0; i < 30; i++) { stepBeat(run); if (run.state.status === 'choosing') chooseBoon(run, null); }
  assert.ok(Number.isFinite(run.state.maxStrain) && run.state.maxStrain > 0);
});

test('first boon pick comes early', () => {
  const run = mk({ firstOfferDepth: 5 });
  let offer = null, g = 0;
  while (!offer && g++ < 60) offer = stepBeat(run).find((e) => e.t === 'BOON_OFFER');
  assert.ok(offer);
});

test('free skills can be used again and again', () => {
  const run = mk({ freeSkills: true, allSkills: true });
  for (let i = 0; i < 4; i++) stepBeat(run);
  let used = 0;
  for (let i = 0; i < 6; i++) { if (useSkill(run, 'brace').some((e) => e.t === 'ABILITY')) used++; stepBeat(run); stepBeat(run); }
  assert.ok(used >= 4, 'used ' + used);
  assert.ok(playView(run).skills.some((s) => s.id === 'flare'));
});

test('a forced encounter warns, and a forced guardian appears', () => {
  const e = mk({ forceEncounter: 'gem_vein' });
  let ev = [], g = 0;
  while (!ev.some((x) => x.t === 'ENCOUNTER_WARN') && g++ < 120) { ev = ev.concat(stepBeat(e)); if (e.state.status === 'choosing') chooseBoon(e, null); }
  assert.ok(ev.some((x) => x.t === 'ENCOUNTER_WARN' && x.id === 'gem_vein'));
  const r = mk({ forceGuardian: 'stone_warden' }, 5);
  let gev = [], k = 0;
  while (!gev.some((x) => x.t === 'GUARDIAN_WARN') && k++ < 200) { gev = gev.concat(stepBeat(r)); if (r.state.status === 'choosing') chooseBoon(r, null); }
  assert.ok(gev.some((x) => x.t === 'GUARDIAN_WARN'));
});

test('cheat catalog entries have ids, labels and a group', () => {
  const ids = new Set();
  for (const c of PLAY) { assert.ok(c.id && c.label && c.group === 'Play layer' && typeof c.run === 'function'); assert.ok(!ids.has(c.id)); ids.add(c.id); }
  assert.ok(PLAY.length >= 12);
});
