import test from 'node:test';
import assert from 'node:assert/strict';
import { audio } from '../src/audio/index.js';
import { noteForCombo } from '../src/audio/scale.js';
import { MAX_VOICES } from '../src/audio/synth.js';
import { MUSIC_BIOMES } from '../src/audio/music.js';
import { installFakeAudio } from './integration-helpers-fake-audio.js';

function setup() {
  audio._reset();
  return installFakeAudio();
}

function collect(combo, tier = 1) {
  return { t: 'COLLECT', lane: 0, item: { kind: 'gem', tier, value: 1 }, gold: 1, combo, r: 0, c: 0 };
}

test('nothing is created before init (no sound before a tap)', () => {
  const fake = setup();
  audio.onEvents([collect(0)], {});
  audio.ui('tap');
  assert.equal(fake.last(), null);
  assert.equal(audio._debug().ready, false);
  fake.restore();
});

test('init is safe without WebAudio and can be called twice', () => {
  audio._reset();
  assert.equal(audio.init(), false);
  const fake = installFakeAudio();
  assert.equal(audio.init(), true);
  assert.equal(audio.init(), true);
  assert.equal(audio._debug().ready, true);
  fake.restore();
  audio._reset();
});

test('init resumes the context', () => {
  const fake = setup();
  audio.init();
  assert.equal(fake.last().state, 'running');
  fake.restore();
  audio._reset();
});

test('every ui sound plays without errors', () => {
  const fake = setup();
  audio.init();
  const ctx = fake.last();
  for (const name of ['tap', 'buy', 'deny', 'open', 'close', 'claim', 'place', 'remove', 'achievement', 'daily', 'collapse']) {
    ctx.currentTime += 1;
    assert.doesNotThrow(() => audio.ui(name), name);
  }
  assert.doesNotThrow(() => audio.ui('not-a-sound'));
  assert.doesNotThrow(() => audio.ui(undefined));
  assert.ok(ctx.started.length > 10);
  fake.restore();
  audio._reset();
});

test('every event type plays without errors', () => {
  const fake = setup();
  audio.init();
  const events = [
    { t: 'RUN_START', seed: 1 },
    { t: 'BEAT', i: 1, depth: 1, speed: 1 },
    { t: 'SPAWN', i: 1, lanes: [] },
    { t: 'FIRE', r: 0, c: 0, partId: 'hook' },
    { t: 'CHAIN', from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
    collect(3, 2),
    { t: 'COLLECT', lane: 1, item: { kind: 'ore', tier: 1, value: 1 }, gold: 1, combo: 0, r: 0, c: 0 },
    { t: 'COLLECT', lane: 1, item: { kind: 'relic', tier: 1, value: 1 }, gold: 1, combo: 0, r: 0, c: 0 },
    { t: 'MISS', lane: 0, item: { kind: 'gem', tier: 1, value: 1 } },
    { t: 'HAZARD', lane: 0, hazard: 'rock', absorbedBy: null, strainDelta: 2 },
    { t: 'HAZARD', lane: 0, hazard: 'rock', absorbedBy: { r: 0, c: 0 }, strainDelta: 0 },
    { t: 'STRAIN', value: 80, max: 100, delta: 1 },
    { t: 'BIOME', id: 'quartz', depth: 100 },
    { t: 'MILESTONE', depth: 50 },
    { t: 'RECORD', depth: 100 },
    { t: 'SNAP', goldLost: 1, goldKept: 1 },
    { t: 'HAUL', gold: 1, depth: 1 },
  ];
  assert.doesNotThrow(() => audio.onEvents(events, { strain: 80, maxStrain: 100 }));
  assert.ok(fake.last().started.length > 10);
  fake.restore();
  audio._reset();
});

test('bad events never throw', () => {
  const fake = setup();
  audio.init();
  const junk = [
    null, undefined, 5, 'x', {}, { t: 5 }, { t: 'COLLECT' }, { t: 'COLLECT', item: null, combo: NaN },
    { t: 'COLLECT', item: { kind: 'gem', tier: NaN }, combo: Infinity },
    { t: 'COLLECT', item: { kind: 'gem', tier: -4 }, combo: -9 },
    { t: 'COLLECT', item: { kind: 'gem', tier: 99 }, combo: 1e12 },
    { t: 'STRAIN', value: NaN, max: 0 }, { t: 'BIOME', id: 7 }, { t: 'HAZARD' },
  ];
  assert.doesNotThrow(() => audio.onEvents(junk, null));
  assert.doesNotThrow(() => audio.onEvents(null, null));
  assert.doesNotThrow(() => audio.onEvents('nope', 5));
  fake.restore();
  audio._reset();
});

test('simultaneous sound voices are capped at 16', () => {
  const fake = setup();
  audio.init();
  const many = [];
  for (let i = 0; i < 70; i++) many.push(collect(i % 12, 1 + (i % 6)));
  audio.onEvents(many, {});
  const { parts } = audio._debug();
  assert.ok(parts.synth.sfxVoiceCount() <= MAX_VOICES);
  fake.restore();
  audio._reset();
});

test('ended voices are released', () => {
  const fake = setup();
  audio.init();
  audio.onEvents([collect(0), collect(1)], {});
  const { parts } = audio._debug();
  assert.ok(parts.synth.sfxVoiceCount() > 0);
  fake.last().endAll();
  assert.equal(parts.synth.sfxVoiceCount(), 0);
  fake.restore();
  audio._reset();
});

test('collect pitch climbs with the combo', () => {
  assert.ok(noteForCombo(1) > noteForCombo(0));
  assert.ok(noteForCombo(4) > noteForCombo(2));
  assert.ok(noteForCombo(9) > noteForCombo(5));
  assert.equal(noteForCombo(500), noteForCombo(9));
});

test('mute, volumes and strain are clamped and never throw', () => {
  const fake = setup();
  audio.init();
  assert.doesNotThrow(() => {
    audio.mute(true);
    audio.mute(undefined);
    audio.setVolumes({ sfx: 9, music: -3 });
    audio.setVolumes({ sfx: NaN });
    audio.setVolumes(null);
    audio.setStrain(Infinity);
  });
  const d = audio._debug();
  assert.equal(d.sfx, 0);
  assert.equal(d.music, 0);
  assert.equal(d.strain01, 0);
  audio.setStrain(7);
  assert.equal(audio._debug().strain01, 1);
  fake.restore();
  audio._reset();
});

test('muted audio makes no new sound', () => {
  const fake = setup();
  audio.init();
  const ctx = fake.last();
  audio.mute(true);
  const before = ctx.started.length;
  audio.ui('tap');
  audio.onEvents([collect(0)], {});
  assert.equal(ctx.started.length, before);
  audio.mute(false);
  ctx.currentTime += 1;
  audio.ui('tap');
  assert.ok(ctx.started.length > before);
  fake.restore();
  audio._reset();
});

test('the heartbeat only plays above 75% strain', () => {
  const fake = setup();
  audio.init();
  const ctx = fake.last();
  audio.setStrain(0.5);
  ctx.currentTime += 1;
  const before = ctx.started.length;
  audio._tick();
  const quiet = ctx.started.length - before;
  audio.setStrain(0.95);
  ctx.currentTime += 2;
  const mid = ctx.started.length;
  audio._tick();
  assert.ok(ctx.started.length - mid > 0);
  assert.ok(quiet <= ctx.started.length - mid + 10);
  fake.restore();
  audio._reset();
});

test('heartbeat stops when the drop ends', () => {
  const fake = setup();
  audio.init();
  audio.setStrain(0.95);
  audio.onEvents([{ t: 'HAUL', gold: 1, depth: 1 }], { strain: 95, maxStrain: 100, status: 'hauled' });
  assert.equal(audio._debug().strain01, 0);
  fake.restore();
  audio._reset();
});

test('music plays for every biome and crossfades without errors', () => {
  const fake = setup();
  audio.init();
  const ctx = fake.last();
  for (const id of MUSIC_BIOMES) {
    audio.setBiome(id);
    for (let i = 0; i < 30; i++) {
      ctx.currentTime += 0.5;
      assert.doesNotThrow(() => audio._tick(), id);
    }
  }
  audio.setBiome('not-a-biome');
  audio.setBiome(null);
  fake.restore();
  audio._reset();
});

test('old music layers are cleaned up after a fade', () => {
  const fake = setup();
  audio.init();
  const ctx = fake.last();
  audio.setBiome('quartz');
  audio.setBiome('amber');
  assert.ok(audio._debug().parts.music.layerCount() >= 2);
  ctx.currentTime += 20;
  audio._tick();
  assert.equal(audio._debug().parts.music.layerCount(), 1);
  fake.restore();
  audio._reset();
});

test('setBiome before init is remembered', () => {
  audio._reset();
  audio.setBiome('magma');
  const fake = installFakeAudio();
  audio.init();
  assert.equal(audio._debug().parts.music.current(), 'magma');
  fake.restore();
  audio._reset();
});

test('screens change the music mood without errors', () => {
  const fake = setup();
  audio.init();
  for (const id of ['home', 'drop', 'results', 'rig', undefined, 5]) {
    assert.doesNotThrow(() => audio.setScreen(id));
  }
  fake.restore();
  audio._reset();
});

test('a hidden tab suspends audio and makes no new sound', () => {
  const fake = setup();
  const listeners = {};
  const oldDoc = globalThis.document;
  globalThis.document = { hidden: false, addEventListener: (n, f) => (listeners[n] = f) };
  audio.init();
  const ctx = fake.last();
  globalThis.document.hidden = true;
  listeners.visibilitychange();
  assert.equal(ctx.suspendCount, 1);
  const before = ctx.started.length;
  audio.ui('tap');
  audio._tick();
  assert.equal(ctx.started.length, before);
  globalThis.document.hidden = false;
  listeners.visibilitychange();
  assert.equal(ctx.state, 'running');
  if (oldDoc === undefined) delete globalThis.document;
  else globalThis.document = oldDoc;
  fake.restore();
  audio._reset();
});

test('spam taps in the same instant are not stacked', () => {
  const fake = setup();
  audio.init();
  const ctx = fake.last();
  const before = ctx.started.length;
  for (let i = 0; i < 20; i++) audio.ui('tap');
  assert.ok(ctx.started.length - before <= 2);
  fake.restore();
  audio._reset();
});
