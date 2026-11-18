import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as st from '../src/ui/settings.js';

beforeEach(() => st._resetSettingsForTests());

test('settings change, notify and stay clean', () => {
  let seen = null;
  const off = st.onSettings((d, k) => { seen = k; });
  assert.equal(st.setSetting('largeText', true), true);
  assert.equal(st.getSettings().largeText, true);
  assert.equal(seen, 'largeText');
  assert.equal(st.setSetting('largeText', true), false); // no change, no event
  assert.equal(st.setSetting('sfx', 9), true);
  assert.equal(st.getSettings().sfx, 1);
  assert.equal(st.setSetting('sfx', NaN), false);
  assert.equal(st.setSetting('nope', 1), false);
  assert.equal(st.setSetting('quality', 'weird'), false);
  off();
});

test('applySettings writes data attributes', () => {
  const root = { dataset: {} };
  st.setSetting('reduceMotion', true);
  st.applySettings(root);
  assert.equal(root.dataset.reduce, '1');
  st.applySettings(null); // must not throw
});
