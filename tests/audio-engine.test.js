import test from 'node:test';
import assert from 'node:assert/strict';
import { createSynth, MAX_VOICES, MAX_MUSIC_VOICES, createContext } from '../src/audio/synth.js';
import { createEngine } from '../src/audio/engine.js';
import { createVoices } from '../src/audio/voices.js';
import { audio } from '../src/audio/index.js';
import { UI_NAMES } from '../src/audio/offline.js';
import { FakeAudioContext, installFakeAudio } from './integration-helpers-fake-audio.js';

function lastTarget(param) {
  const t = param.calls.filter((c) => c[0] === 'target');
  return t.length ? t[t.length - 1][1] : undefined;
}

test('voice limit: never more than 16 voices, music never more than its share', () => {
  const ctx = new FakeAudioContext();
  const S = createSynth(ctx);
  for (let i = 0; i < 60; i++) S.tone({ freq: 200 + i, dur: 2, vol: 0.1 });
  assert.ok(S.voiceCount() <= MAX_VOICES);
  for (let i = 0; i < 30; i++) S.tone({ freq: 100 + i, dur: 8, vol: 0.05, music: true });
  assert.ok(S.musicVoiceCount() <= MAX_MUSIC_VOICES);
  assert.ok(S.voiceCount() <= MAX_VOICES);
});

test('voice stealing takes the oldest voice first and fades it out', () => {
  const ctx = new FakeAudioContext();
  const S = createSynth(ctx);
  const first = S.tone({ freq: 220, dur: 5, vol: 0.1 });
  for (let i = 0; i < MAX_VOICES; i++) S.tone({ freq: 300 + i, dur: 5, vol: 0.1 });
  assert.equal(S.sfxVoiceCount(), MAX_VOICES);
  assert.equal(lastTarget(first.k.gain), 0, 'oldest voice was faded to zero');
});

test('one voice with many oscillators counts once', () => {
  const ctx = new FakeAudioContext();
  const S = createSynth(ctx);
  const V = createVoices(S);
  V.pad({ freq: 110, dur: 5, vol: 0.05 });
  assert.equal(S.voiceCount(), 1);
  assert.ok(ctx.started.length >= 4);
});

test('per-kind polyphony limit: a bell key keeps at most maxKey voices', () => {
  const ctx = new FakeAudioContext();
  const S = createSynth(ctx);
  const V = createVoices(S);
  for (let i = 0; i < 20; i++) V.bell({ freq: 500 + i, dur: 2, vol: 0.1, key: 'x', maxKey: 3 });
  assert.ok(S.sfxVoiceCount() <= 3);
});

test('low quality uses fewer voices and no convolver reverb', () => {
  const ctx = new FakeAudioContext();
  ctx.createConvolver = () => {
    throw new Error('low quality must not make a convolver');
  };
  const S = createSynth(ctx, { quality: 'low' });
  const V = createVoices(S);
  for (let i = 0; i < 40; i++) V.glass({ freq: 400 + i, dur: 2, vol: 0.1, send: 0.5 });
  assert.ok(S.voiceCount() <= S.limits().maxVoices);
  assert.ok(S.limits().maxVoices < MAX_VOICES);
  assert.equal(S.reverbAvailable(), false);
});

test('high quality asks for a shared convolver when the browser has one', () => {
  const ctx = new FakeAudioContext();
  let made = 0;
  ctx.createConvolver = () => {
    made++;
    const g = ctx.createGain();
    g.buffer = null;
    return g;
  };
  const S = createSynth(ctx, { quality: 'high' });
  S.setSpace('quartz', 0.5);
  S.setSpace('magma', 0.5);
  assert.equal(made, 2, 'two convolvers that crossfade, shared by all voices');
});

test('scheduling is never in the past, even with negative delays and old absolute times', () => {
  const ctx = new FakeAudioContext();
  ctx.currentTime = 10;
  const S = createSynth(ctx);
  S.tone({ freq: 300, delay: -5 });
  S.tone({ freq: 300, at: 1 });
  S.noise({ freq: 500, at: -3 });
  assert.ok(ctx.started.length >= 3);
  for (const s of ctx.started) assert.ok(s.started >= ctx.currentTime, `started ${s.started}`);
});

test('music and heartbeat never schedule in the past', () => {
  const fake = installFakeAudio();
  audio._reset();
  audio.init();
  const ctx = fake.last();
  audio.setStrain(0.95);
  audio.onEvents([{ t: 'RUN_START', seed: 4 }], null);
  for (let i = 0; i < 80; i++) {
    ctx.currentTime += 0.1;
    audio._tick();
    for (const s of ctx.started) assert.ok(s.started >= 1, 'sane');
  }
  const late = ctx.started.filter((s) => s.started < 1);
  assert.equal(late.length, 0);
  fake.restore();
  audio._reset();
});

test('mute and volumes reach the master and the buses with ramps', () => {
  const fake = installFakeAudio();
  audio._reset();
  audio.init();
  const { synth } = audio._debug().parts;
  const b = synth.buses;
  assert.ok(lastTarget(b.master.gain) > 0.5);
  audio.mute(true);
  assert.equal(lastTarget(b.master.gain), 0);
  audio.mute(false);
  assert.ok(lastTarget(b.master.gain) > 0.5 && lastTarget(b.master.gain) <= 0.9);
  audio.setVolumes({ sfx: 0, music: 0 });
  assert.equal(lastTarget(b.sfx.gain), 0);
  assert.equal(lastTarget(b.music.gain), 0);
  audio.setVolumes({ sfx: 1, music: 1 });
  assert.ok(lastTarget(b.sfx.gain) > 0);
  assert.ok(lastTarget(b.music.gain) > 0);
  fake.restore();
  audio._reset();
});

test('the master gain has a safe maximum below 1', () => {
  const fake = installFakeAudio();
  audio._reset();
  audio.init();
  audio.mute(false);
  audio.setVolumes({ sfx: 1, music: 1 });
  assert.ok(lastTarget(audio._debug().parts.synth.buses.master.gain) <= 0.9 + 1e-9);
  fake.restore();
  audio._reset();
});

test('night mode: callable before and after init, and changes the compressor', () => {
  audio._reset();
  assert.doesNotThrow(() => audio.setNightMode(true));
  const fake = installFakeAudio();
  audio.init();
  const { synth } = audio._debug().parts;
  assert.equal(audio._debug().night, true);
  assert.equal(synth.isNight(), true);
  assert.ok(lastTarget(synth.buses.comp.threshold) < -25);
  audio.setNightMode(false);
  assert.ok(lastTarget(synth.buses.comp.threshold) > -25);
  assert.doesNotThrow(() => audio.setNightMode(undefined));
  fake.restore();
  audio._reset();
});

test('safe when AudioContext is missing: nothing throws, init says no', () => {
  audio._reset();
  assert.equal(createContext(), null);
  assert.equal(audio.init(), false);
  assert.doesNotThrow(() => {
    audio.onEvents([{ t: 'COLLECT', lane: 0, item: { kind: 'gem', tier: 1 }, combo: 2 }], {});
    audio.ui('tap');
    audio.ui('toggle', true);
    audio.setBiome('magma');
    audio.setStrain(0.9);
    audio.setScreen('drop');
    audio.setNightMode(true);
    audio.setQuality('low');
    audio.mute(true);
    audio.setVolumes({ sfx: 0.2 });
    audio._tick();
  });
  audio._reset();
});

test('every new ui sound plays, with and without an argument', () => {
  const fake = installFakeAudio();
  audio._reset();
  audio.init();
  const ctx = fake.last();
  for (const name of UI_NAMES) {
    ctx.currentTime += 1;
    assert.doesNotThrow(() => audio.ui(name), name);
    ctx.currentTime += 1;
    assert.doesNotThrow(() => audio.ui(name, 0.5), name);
    ctx.currentTime += 1;
    assert.doesNotThrow(() => audio.ui(name, false), name);
  }
  fake.restore();
  audio._reset();
});

test('collect sounds pan by lane: lane 0 left, last lane right', () => {
  const ctx = new FakeAudioContext();
  const pans = [];
  ctx.createStereoPanner = () => {
    const n = ctx.createGain();
    const p = { value: 0, calls: [], setValueAtTime: (v) => pans.push(v), linearRampToValueAtTime() {} };
    n.pan = p;
    return n;
  };
  const e = createEngine(ctx, { quality: 'low' });
  for (let lane = 0; lane < 4; lane++) {
    ctx.currentTime += 0.5;
    e.handle([{ t: 'COLLECT', lane, item: { kind: 'gem', tier: 1 }, combo: 1 }], { cols: 4 });
  }
  const used = [...new Set(pans.filter((v) => v !== 0))];
  assert.ok(Math.min(...pans) < -0.5, 'left lane is left');
  assert.ok(Math.max(...pans) > 0.5, 'right lane is right');
  assert.ok(used.length >= 3);
});

test('every event type from CONTRACT section 5 makes sound', () => {
  const fake = installFakeAudio();
  audio._reset();
  audio.init();
  const ctx = fake.last();
  const evs = [
    { t: 'FIRE', partId: 'hook' }, { t: 'CHAIN', from: { c: 0 }, to: { c: 3 } },
    { t: 'COLLECT', lane: 2, item: { kind: 'gem', tier: 4 }, combo: 5 },
    { t: 'MISS' }, { t: 'HAZARD', absorbedBy: null }, { t: 'HAZARD', absorbedBy: { r: 0, c: 0 } },
    { t: 'BIOME', id: 'amber', depth: 250 }, { t: 'MILESTONE', depth: 50 }, { t: 'RECORD', depth: 5 },
    { t: 'HAUL', gold: 1, depth: 1 }, { t: 'SNAP', goldLost: 1, goldKept: 1 },
  ];
  for (const ev of evs) {
    ctx.currentTime += 3;
    const before = ctx.started.length;
    audio.onEvents([ev], {});
    assert.ok(ctx.started.length > before, ev.t);
  }
  fake.restore();
  audio._reset();
});
