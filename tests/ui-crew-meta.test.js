// The Crew and Workshop screens read the real meta API. Check that the shapes they rely on exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './meta-helpers.js';
import { meta } from '../src/meta/index.js';
import { crewCardState } from '../src/ui/screens/crewCard.js';
import { upgradeState } from '../src/ui/screens/workshopUpgrades.js';
import { partCardState } from '../src/ui/screens/workshopParts.js';

test('real crew list drives the card state', () => {
  fresh();
  meta.addGold(1000);
  const list = meta.crew.list();
  assert.equal(list.length, 6);
  const st = crewCardState(list[0], 1, meta.gold());
  assert.equal(st.canBuy, true);
  assert.equal(crewCardState(list[5], 1, meta.gold()).locked, true);
  const res = meta.crew.buy('winch', 'max');
  assert.equal(res.ok, true);
});

test('real upgrades and parts drive the states', () => {
  fresh();
  const i = meta.upgrades.list()[0];
  const st = upgradeState(i, { gold: meta.gold(), shards: 0, core: 0 });
  assert.equal(st.canBuy, false);
  assert.match(st.reason, /^Need \d+ more Gold$/);
  const ps = partCardState({ id: 'hook', name: 'Hook', ...meta.partStatus('hook') }, 0);
  assert.equal(ps.state, 'owned');
});
