import test from 'node:test';
import assert from 'node:assert/strict';
import { BIOME_KEYS, midiToHz, noteForCombo, midiForCombo, degreeToMidi, scaleNotes, snapToScale, keyFor } from '../src/audio/scale.js';
import { createRng } from '../src/audio/rng.js';
import { MUSIC_BIOMES } from '../src/audio/music.js';

const pcs = (id) => new Set(keyFor(id).steps.map((s) => (keyFor(id).tonic + s) % 12));

test('midiToHz: A4 is 440 and bad input is safe', () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Number.isFinite(midiToHz(NaN)));
});

test('every biome has a key and all keys are close relatives of clay (at least 3 of 5 notes shared)', () => {
  for (const id of [...MUSIC_BIOMES, 'menu']) {
    assert.ok(BIOME_KEYS[id], id);
    assert.equal(BIOME_KEYS[id].steps.length, 5);
    const shared = [...pcs(id)].filter((p) => pcs('clay').has(p)).length;
    assert.ok(shared >= 3, `${id} shares ${shared}`);
  }
});

test('collect notes climb with the combo in every key and then stay on the top note', () => {
  for (const id of Object.keys(BIOME_KEYS)) {
    let last = 0;
    for (let c = 0; c < 10; c++) {
      const f = noteForCombo(c, id);
      assert.ok(f > last, `${id} combo ${c}`);
      last = f;
    }
    assert.equal(noteForCombo(500, id), noteForCombo(9, id));
    assert.equal(noteForCombo(-3, id), noteForCombo(0, id));
    assert.ok(Number.isFinite(noteForCombo(NaN, id)));
  }
});

test('every collect note is a note of its biome scale', () => {
  for (const id of Object.keys(BIOME_KEYS)) {
    for (let c = 0; c < 12; c++) {
      assert.ok(pcs(id).has(midiForCombo(c, id) % 12), `${id} combo ${c}`);
    }
  }
});

test('the first collect note of every key is near middle C (no biome jumps out of range)', () => {
  for (const id of Object.keys(BIOME_KEYS)) {
    const m = midiForCombo(0, id);
    assert.ok(m >= 55 && m <= 66, `${id} ${m}`);
  }
});

test('degreeToMidi wraps octaves and scaleNotes stays in range and in key', () => {
  assert.equal(degreeToMidi('clay', 0, 60), 60);
  assert.equal(degreeToMidi('clay', 5, 60), 72);
  assert.equal(degreeToMidi('clay', -1, 60), 57);
  const notes = scaleNotes('quartz', 48, 84);
  assert.ok(notes.length > 10);
  for (const m of notes) {
    assert.ok(m >= 48 && m <= 84);
    assert.ok(pcs('quartz').has(m % 12));
  }
  assert.ok(Number.isFinite(degreeToMidi('nope', NaN)));
});

test('snapToScale lands on a scale note', () => {
  for (let m = 40; m < 90; m++) assert.ok(pcs('magma').has(snapToScale('magma', m) % 12), String(m));
});

test('seeded random: same seed same numbers, different seed different numbers', () => {
  const a = createRng(5);
  const b = createRng(5);
  const c = createRng(6);
  const sa = Array.from({ length: 8 }, () => a.next());
  const sb = Array.from({ length: 8 }, () => b.next());
  const sc = Array.from({ length: 8 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});
