import test from 'node:test';
import assert from 'node:assert/strict';
import { audio } from '../src/audio/index.js';
import { noteForCombo, midiToHz } from '../src/audio/scale.js';
import { tutorial } from '../src/tutorial/index.js';
import { suggest } from '../src/tutorial/suggest.js';

test('audio calls never throw on bad input', () => {
  assert.doesNotThrow(() => {
    audio.onEvents(null, null);
    audio.onEvents([{ t: 'COLLECT' }], {});
    audio.setBiome(undefined);
    audio.setStrain(NaN);
    audio.ui('nope');
    audio.mute(undefined);
    audio.setVolumes(null);
    audio.setVolumes({ sfx: Infinity, music: -5 });
  });
  assert.equal(audio._debug().strain01, 0);
});

test('audio.init unlocks and strain is clamped', () => {
  audio.init();
  audio.setStrain(5);
  assert.equal(audio._debug().strain01, 1);
});

test('combo climbs the scale and stays finite', () => {
  const a = noteForCombo(0, 'clay');
  const b = noteForCombo(3, 'clay');
  assert.ok(b > a);
  assert.ok(Number.isFinite(noteForCombo(NaN, 'zzz')));
  assert.ok(Number.isFinite(noteForCombo(1e9, 'void')));
  assert.equal(Math.round(midiToHz(69)), 440);
});

test('tutorial without a page never throws', () => {
  assert.doesNotThrow(() => {
    tutorial.start();
    tutorial.skip();
  });
  assert.equal(tutorial.isActive(), false);
});

test('suggest.bestRig returns a valid empty rig', () => {
  const rig = suggest.bestRig({ cols: 5, rows: 4 }, []);
  assert.equal(rig.cols, 5);
  assert.equal(rig.rows, 4);
  assert.equal(rig.cells.length, 4);
  assert.ok(rig.cells.every((row) => row.length === 5 && row.every((x) => x === null)));
  const bad = suggest.bestRig(null, null);
  assert.equal(bad.cols, 4);
  assert.equal(bad.rows, 3);
});
