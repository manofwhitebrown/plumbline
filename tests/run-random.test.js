import test from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './run-helpers.js';
import { session } from '../src/run/session.js';
import { hardReset } from '../src/run/state.js';
import { recover } from '../src/run/recover.js';
import { makeRng } from '../src/core/rng.js';

// 1,000 random games of start / beats / haul / pause / resume / abort / crash.
// Rules: a seed is paid at most once. A drop that ended is paid. A crash pays once from the saved checkpoint.
test('1,000 random sessions: no double pay, no lost pay', () => {
  for (let scenario = 1; scenario <= 1000; scenario++) {
    const rng = makeRng(scenario);
    const t = setup({ engine: { snapAt: rng.chance(0.5) ? rng.int(15, 70) : Infinity } });
    for (let step = 0; step < 40; step++) {
      const op = rng.int(0, 9);
      if (op <= 1) session.start();
      else if (op <= 4) t.loop.tick(rng.int(1, 14));
      else if (op === 5 || op === 9) session.haul();
      else if (op === 6) { session.pause(); if (rng.chance(0.6)) session.resume(); }
      else if (op === 7) session.abort();
      else { t.save.crash(); hardReset(); if (rng.chance(0.5)) recover(); } // the page dies
    }
    // Last boot: whatever is left on disk must be paid now.
    t.save.crash(); hardReset();
    recover(); recover();

    const paid = t.seen.filter((x) => x[0] === 'run:ended' || x[0] === 'run:recovered').map((x) => x[1].seed);
    assert.equal(new Set(paid).size, paid.length, `scenario ${scenario}: a seed was paid twice`);
    const ledger = t.save.getSlice('meta').ledger || [];
    assert.equal(ledger.length, paid.length, `scenario ${scenario}: ${ledger.length} pays for ${paid.length} paid drops`);
    assert.equal(t.save.getSlice('meta').gold || 0, ledger.reduce((a, b) => a + b, 0));
    assert.equal(t.save.getSlice('run').checkpoint, null, `scenario ${scenario}: checkpoint left behind`);
    assert.equal(session.isRunning(), false);
    t.off();
  }
});

test('a drop that ended and was saved is never paid again after a crash', () => {
  const t = setup();
  session.start(); t.loop.tick(30); session.haul();
  const goldAfter = t.save.getSlice('meta').gold;
  t.save.crash(); hardReset();
  assert.equal(recover(), null);
  session.start();
  assert.equal(t.save.getSlice('meta').gold, goldAfter);
  t.off();
});
