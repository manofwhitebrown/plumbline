// The Relic Wall bonus reaches the real Drop numbers (getMods). [FINISH-3]
import test from 'node:test';
import assert from 'node:assert/strict';
import { getMods } from '../src/meta/mods.js';
import * as book from '../src/meta/relicBook.js';
import { RELICS } from '../src/data/relics.js';
import { s } from '../src/meta/state.js';

test('Wall bonus: nothing at 0, gold at 10 and 36, luck at 20; cheated saves get nothing', () => {
  const base = getMods();
  book.recordMany(RELICS.slice(0, 10).map((r) => r.id));
  const m10 = getMods();
  assert.ok(m10.goldMult > base.goldMult, 'gold at 10 relics');
  assert.equal(m10.luck, base.luck);
  book.recordMany(RELICS.slice(0, 20).map((r) => r.id));
  assert.ok(getMods().luck > base.luck, 'luck at 20 relics');
  book.recordMany(RELICS.map((r) => r.id));
  const m36 = getMods();
  assert.ok(m36.goldMult > m10.goldMult, 'more gold at 36');
  const st = s(); const was = st.cheated; st.cheated = true;
  try { assert.equal(getMods().goldMult, base.goldMult, 'cheated save: no bonus'); } finally { st.cheated = was; }
});
