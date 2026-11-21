// A relic found in a real Drop (real engine, real session and finish code) reaches the Relic Wall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './run-helpers.js';
import { setDeps } from '../src/run/deps.js';
import { session } from '../src/run/session.js';
import * as engine from '../src/engine/index.js';
import { bus } from '../src/core/bus.js';
import * as book from '../src/meta/relicBook.js';
import { RELICS } from '../src/data/relics.js';

function playUntilRelic() {
  const t = setup({ mods: { maxStrain: 1000, strainMult: 0.15, luck: 1, unlockedParts: ['hook', 'magnet'], cols: 5, rows: 4 }, owned: { hook: 5, magnet: 3 } });
  setDeps({ engine });
  let ended = null;
  const off = bus.on('run:ended', (r) => { ended = r; });
  try {
    for (let seed = 1; seed < 40; seed++) {
      ended = null;
      assert.equal(session.start({ seed }).ok, true);
      for (let i = 0; i < 700 && !ended; i++) {
        t.loop.tick(1);
        if (session.getView().status === 'choosing') session.chooseBoon(null);
        if (i === 600 && !ended) session.haul();
      }
      if (ended && ended.play && ended.play.relics.length) return ended;
    }
  } finally { off(); }
  return null;
}

test('a relic found in a real Drop is on the Wall afterwards', () => {
  assert.equal(book.earnedCount(), 0);
  const ended = playUntilRelic();
  assert.ok(ended, 'the test needs a Drop that finds a relic');
  const ids = ended.play.relics;
  for (const id of ids) {
    assert.ok(RELICS.some((r) => r.id === id), 'real relic id ' + id);
    assert.equal(book.hasEarned(id), true, id + ' reached the Wall');
  }
  assert.equal(book.earnedCount(), new Set(ids).size);
  const card = book.list().find((c) => c.id === ids[0]);
  assert.equal(card.found, true);
  assert.notEqual(card.name, '???');
});
