// Numbers from real offline renders (node-web-audio-api, a dev-only tool). Skipped if it is not installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderScene, playScene, musicScene, eventScene, uiScene, EVENT_SCENES, UI_NAMES, MUSIC_BIOMES } from '../src/audio/offline.js';
import { analyze, decayTime } from '../src/audio/measure.js';

let Offline = null;
try {
  Offline = (await import('node-web-audio-api')).OfflineAudioContext;
} catch (e) {
  Offline = null;
}
const opts = { skip: Offline ? false : 'node-web-audio-api not installed' };
const PEAK_LIMIT = 0.98;

test('play scene: no clipping, no NaN, no DC, no long silence, loudness near -16 LUFS, balanced spectrum', opts, async () => {
  const r = await renderScene(Offline, 24, playScene);
  const a = analyze(r.left, r.right);
  assert.ok(!a.hasNaN, 'no NaN');
  assert.ok(a.peak < PEAK_LIMIT, `peak ${a.peak}`);
  assert.ok(Math.abs(a.dc) < 0.003, `dc ${a.dc}`);
  assert.ok(a.longestSilence < 2.5, `silence ${a.longestSilence}s`);
  assert.ok(a.lufs > -21 && a.lufs < -13, `loudness ${a.lufs.toFixed(1)} LUFS`);
  assert.ok(a.balance.high + a.balance.air < 0.5, 'not all in the highs');
  assert.ok(a.balance.low < 0.85, 'not all in the lows');
});

test('music in every biome: right level, no clipping, no DC, not silent', opts, async () => {
  for (const id of MUSIC_BIOMES) {
    const r = await renderScene(Offline, 16, musicScene(id));
    const a = analyze(r.left, r.right);
    assert.ok(!a.hasNaN, id);
    assert.ok(a.peak < PEAK_LIMIT, `${id} peak`);
    assert.ok(Math.abs(a.dc) < 0.003, `${id} dc`);
    assert.ok(a.lufs > -30 && a.lufs < -18, `${id} ${a.lufs.toFixed(1)} LUFS`);
    assert.ok(a.longestSilence < 5, `${id} silence ${a.longestSilence}`);
    assert.ok(a.balance.high + a.balance.air < 0.3, `${id} not bright`);
  }
});

test('music gets louder with strain, combo and depth (adaptive layers) and never clips', opts, async () => {
  const calm = analyze(...Object.values(await renderScene(Offline, 16, musicScene('clay'))).slice(0, 2));
  const busy = analyze(...Object.values(await renderScene(Offline, 16, musicScene('clay', { strain: 0.9, combo: 10, depth: 400 }))).slice(0, 2));
  assert.ok(busy.lufs > calm.lufs + 1, `calm ${calm.lufs.toFixed(1)} busy ${busy.lufs.toFixed(1)}`);
  assert.ok(busy.peak < PEAK_LIMIT);
});

test('every event renders: finite, under the limit, no DC, and audible', opts, async () => {
  for (const name of Object.keys(EVENT_SCENES)) {
    const r = await renderScene(Offline, 4, eventScene(name));
    const a = analyze(r.left, r.right);
    assert.ok(!a.hasNaN, name);
    assert.ok(a.peak < PEAK_LIMIT, `${name} peak ${a.peak}`);
    assert.ok(Math.abs(a.dc) < 0.003, `${name} dc`);
    assert.ok(a.peakDb > -34, `${name} is audible (${a.peakDb.toFixed(1)} dB)`);
  }
});

test('snap ends in a short silence, haul rings out, both stay under the limit', opts, async () => {
  const snap = await renderScene(Offline, 6, (api) => {
    api.engine.music.setMood(0, 0.01);
    api.at(0.2, (e) => e.handle(EVENT_SCENES.snap, null));
  });
  const a = analyze(snap.left, snap.right);
  assert.ok(a.peak < PEAK_LIMIT);
  // The last second of the render is silent.
  let tail = 0;
  for (let i = snap.left.length - 48000; i < snap.left.length; i++) tail = Math.max(tail, Math.abs(snap.left[i]));
  assert.ok(tail < 0.003, `tail ${tail}`);
});

test('every ui sound is short, soft and never harsh', opts, async () => {
  for (const name of UI_NAMES) {
    const r = await renderScene(Offline, 1.2, uiScene(name));
    const a = analyze(r.left, r.right);
    assert.ok(!a.hasNaN, name);
    assert.ok(a.peak < 0.6, `${name} is not loud (${a.peak.toFixed(2)})`);
    assert.ok(a.peakDb > -30, `${name} is audible (${a.peakDb.toFixed(1)})`);
    assert.ok(decayTime(r.left, r.right) <= 0.3, `${name} decay ${decayTime(r.left, r.right)}`);
    assert.ok(a.balance.air < 0.1, `${name} has no harsh air`);
  }
});

test('the master chain never exceeds the limit, even with everything at once', opts, async () => {
  const r = await renderScene(Offline, 6, (api) => {
    api.engine.music.setScreen('drop');
    api.at(0.2, (e) => {
      for (let i = 0; i < 60; i++) {
        e.handle([{ t: 'COLLECT', lane: i % 4, item: { kind: 'gem', tier: 1 + (i % 6) }, combo: i % 12, r: 0, c: 0 }], null);
      }
      e.handle([{ t: 'SNAP', goldLost: 1, goldKept: 1 }, { t: 'HAUL', gold: 1, depth: 1 }, { t: 'HAZARD', absorbedBy: null }, { t: 'RECORD', depth: 9 }], null);
      for (const n of UI_NAMES) e.ui.play(n, 1);
      e.voices.boom({ vol: 1, dur: 2 });
      e.voices.thud({ vol: 1, dur: 1 });
      e.voices.clang({ vol: 1, dur: 1 });
    });
  });
  const a = analyze(r.left, r.right);
  assert.ok(!a.hasNaN);
  assert.ok(a.peak < PEAK_LIMIT, `peak ${a.peak}`);
  assert.ok(r.engine.synth.voiceCount() <= 16);
});

test('night mode is quieter and has less dynamic range', opts, async () => {
  const day = analyze(...Object.values(await renderScene(Offline, 16, playScene)).slice(0, 2));
  const night = analyze(...Object.values(await renderScene(Offline, 16, (api) => {
    api.engine.synth.setNightMode(true);
    playScene(api);
  })).slice(0, 2));
  assert.ok(night.lufs < day.lufs + 0.5, `day ${day.lufs.toFixed(1)} night ${night.lufs.toFixed(1)}`);
  assert.ok(night.peak < PEAK_LIMIT);
  assert.ok(night.balance.air + night.balance.high <= day.balance.air + day.balance.high + 0.02, 'night is not brighter');
});

test('low quality renders cleanly too (no convolver reverb)', opts, async () => {
  const r = await renderScene(Offline, 12, playScene, { quality: 'low' });
  const a = analyze(r.left, r.right);
  assert.ok(!a.hasNaN);
  assert.ok(a.peak < PEAK_LIMIT);
  assert.ok(a.lufs > -24 && a.lufs < -12, `${a.lufs.toFixed(1)}`);
});
