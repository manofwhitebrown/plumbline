import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as st from '../src/ui/settings.js';
import { buildLabel, CREDITS } from '../src/ui/screens/settings.js';
import { toPercent, fromPercent } from '../src/ui/screens/settingsAudio.js';

beforeEach(() => st._resetSettingsForTests());

test('build label keeps only the version and the short id', () => {
  assert.equal(buildLabel('Plumbline v0.1.0 · build 44199c4 · 2026-11-18'), 'Plumbline v0.1 · build 44199c4');
  assert.equal(buildLabel('Plumbline v0.1.0 · build dev'), 'Plumbline v0.1 · build dev');
  for (const bad of [undefined, null, 5, {}, '']) assert.equal(buildLabel(bad), 'Plumbline v0.1 · build dev');
});

test('volume percent never gives NaN and stays in range', () => {
  assert.equal(toPercent(0.8), 80);
  assert.equal(toPercent(7), 100);
  assert.equal(toPercent(-3), 0);
  for (const bad of [NaN, undefined, null, 'x', Infinity]) assert.equal(toPercent(bad), 0);
  assert.equal(fromPercent(55), 0.55);
  assert.equal(fromPercent(500), 1);
  assert.equal(fromPercent(NaN), 0);
});

test('Quality accepts auto, high and low and nothing else', () => {
  for (const q of ['auto', 'high', 'low']) {
    st.setSetting('quality', q === 'auto' ? 'low' : 'auto'); // move away first
    assert.equal(st.setSetting('quality', q), true);
    assert.equal(st.getSettings().quality, q);
  }
  assert.equal(st.setSetting('quality', 'ultra'), false);
  assert.equal(st.getSettings().quality, 'low');
});

test('every setting on the screen changes at once and tells listeners', () => {
  const seen = [];
  st.onSettings((d, k) => seen.push(k));
  st.setSetting('sound', false);
  st.setSetting('sfx', 0.2);
  st.setSetting('music', 0);
  st.setSetting('haptics', false);
  st.setSetting('reduceMotion', true);
  st.setSetting('largeText', true);
  st.setSetting('colorblind', true);
  assert.deepEqual(seen, ['sound', 'sfx', 'music', 'haptics', 'reduceMotion', 'largeText', 'colorblind']);
});

test('applySettings marks the page for Reduce motion, Large text and Colorblind', () => {
  const root = { dataset: {} };
  st.setSetting('reduceMotion', true);
  st.setSetting('largeText', true);
  st.applySettings(root);
  assert.equal(root.dataset.reduce, '1');
  assert.equal(root.dataset.reduceMotion, 'true');
  assert.equal(root.dataset.large, '1');
  assert.equal(root.dataset.cb, '0');
});

test('credits are short plain lines', () => {
  assert.ok(CREDITS.length >= 2);
  for (const line of CREDITS) assert.ok(line.length <= 80 && !/cheat/i.test(line));
});
