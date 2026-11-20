import test from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './run-helpers.js';
import { setDeps } from '../src/run/deps.js';
import { session } from '../src/run/session.js';

// The tiny fake engine, plus an offer at beat 3 and the new functions.
function withPlay(t) {
  const base = t.engine;
  const eng = {
    ...base,
    playView: (run) => (run.play ? { seconds: 6, offer: run.play.offer } : null),
    createRun(o) { const r = base.createRun(o); r.play = { offer: null, picked: [] }; r.asked = o.play; return r; },
    stepBeat(run) {
      const s = run.state;
      if (s.status !== 'running') return [];
      const ev = base.stepBeat(run);
      if (s.beat === 3) { s.status = 'choosing'; run.play.offer = { options: [{ id: 'a' }] }; ev.push({ t: 'BOON_OFFER', kind: 'boon', options: [{ id: 'a' }], seconds: 6, depth: s.depth }); }
      return ev;
    },
    chooseBoon(run, id) { if (run.state.status !== 'choosing') return []; if (id && id !== 'a') return []; run.state.status = 'running'; run.play.offer = null; run.play.picked.push(id || 'auto'); return [{ t: 'BOON_PICK', id: id || 'a', name: 'A', rarity: 'common' }]; },
    useSkill(run, id) { return id === 'brace' ? [{ t: 'ABILITY', id, phase: 'used' }] : []; },
  };
  setDeps({ engine: eng });
  return eng;
}

test('an offer pauses the loop; picking resumes it and the drop is not ended', () => {
  const t = setup(); withPlay(t);
  assert.equal(session.start().ok, true);
  t.loop.tick(10);
  assert.equal(t.loop.paused, true, 'loop paused while choosing');
  assert.equal(session.getView().depth, 3);
  assert.equal(t.count('run:ended'), 0);
  assert.equal(session.haul().ok, false, 'no haul while the picker is open');
  assert.equal(session.useSkill('brace').ok, false, 'no skills while the picker is open');
  assert.equal(session.chooseBoon('junk').ok, false, 'junk id keeps the offer open');
  assert.equal(t.loop.paused, true);
  assert.equal(session.chooseBoon('a').ok, true);
  assert.equal(t.loop.paused, false);
  t.loop.tick(5);
  assert.equal(session.getView().depth, 8);
  assert.equal(session.chooseBoon('a').ok, false, 'a second pick does nothing');
  session.abort();
});

test('timeout style pick (null) works and skills fire as events', () => {
  const t = setup(); withPlay(t);
  session.start(); t.loop.tick(4);
  assert.equal(session.chooseBoon(null).ok, true);
  const before = t.count('run:events');
  assert.equal(session.useSkill('brace').ok, true);
  assert.equal(t.count('run:events'), before + 1);
  assert.equal(session.useSkill('nope').ok, false);
  session.abort();
});

test('the tutorial drop runs with the play layer off', () => {
  const t = setup(); const eng = withPlay(t);
  let asked = 'unset'; const cr = eng.createRun; eng.createRun = (o) => { asked = o.play; return cr(o); };
  session.start({ tutorial: true }); assert.equal(asked, undefined); session.abort();
  session.start(); assert.deepEqual(asked, {}); session.abort();
});
