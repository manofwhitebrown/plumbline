// Renders audio scenes offline so they can be measured (tests, lab, and the notes). It uses the real
// engine on an OfflineAudioContext, driven by a virtual clock, so what we measure is what plays.
import { createEngine } from './engine.js';
import { applyLevels } from './mixer.js';
import { MUSIC_BIOMES } from './music.js';

export const RATE = 48000;

// Drives an engine in virtual time. script(api) schedules things at times (seconds).
// api.at(t, fn) runs fn when the clock reaches t; api.engine is the engine.
export async function renderScene(OfflineCtor, seconds, setup, opts = {}) {
  const ctx = new OfflineCtor(2, Math.ceil(seconds * RATE), RATE);
  let clock = 0;
  const engine = createEngine(ctx, { clock: () => clock, quality: opts.quality || 'high', seed: opts.seed || 5 });
  applyLevels(engine.synth);
  const jobs = [];
  const api = { engine, at: (t, fn) => jobs.push({ t, fn }), seconds };
  setup(api);
  jobs.sort((a, b) => a.t - b.t);
  const dt = 0.1;
  let j = 0;
  for (let t = 0; t < seconds - 0.5; t += dt) {
    clock = t;
    while (j < jobs.length && jobs[j].t <= t + 1e-9) jobs[j++].fn(engine, t);
    engine.tick(t);
  }
  const buf = await ctx.startRendering();
  return { left: buf.getChannelData(0), right: buf.getChannelData(1), rate: RATE, engine };
}

const collect = (combo, tier = 1, lane = 0) => ({ t: 'COLLECT', lane, item: { kind: 'gem', tier, value: 1 }, gold: 1, combo, r: 0, c: 0 });

// A busy stretch of play: collects climbing in combo, ticks, hazards, strain rising, a biome change.
export function playScene(api) {
  const { engine } = api;
  engine.music.setBiome('clay');
  api.at(0, (e) => e.handle([{ t: 'RUN_START', seed: 3 }], null));
  for (let b = 0; b < 60; b++) {
    const t = 1 + b * 0.45;
    api.at(t, (e) => {
      const ev = [{ t: 'BEAT', i: b, depth: b * 2, speed: 1 }, { t: 'FIRE', r: 0, c: b % 4, partId: 'hook' }];
      if (b % 2 === 0) ev.push(collect(Math.floor(b / 4), 1 + (b % 3), b % 4));
      if (b % 9 === 5) ev.push({ t: 'HAZARD', lane: 1, hazard: 'rock', absorbedBy: null, strainDelta: 3 });
      if (b % 11 === 8) ev.push({ t: 'HAZARD', lane: 2, hazard: 'rock', absorbedBy: { r: 0, c: 0 }, strainDelta: 0 });
      if (b % 13 === 6) ev.push({ t: 'CHAIN', from: { r: 0, c: 0 }, to: { r: 0, c: 3 } });
      ev.push({ t: 'STRAIN', value: 30 + b * 1.1, max: 100, delta: 1 });
      if (b === 25) ev.push({ t: 'MILESTONE', depth: 50 }, { t: 'BIOME', id: 'quartz', depth: 100 });
      e.handle(ev, { depth: b * 2, combo: Math.floor(b / 4) });
    });
  }
}

export function musicScene(biome, { strain = 0, combo = 0, depth = 0 } = {}) {
  return (api) => {
    const e = api.engine;
    e.music.setBiome(biome);
    api.at(0, (en) => {
      en.music.setScreen('drop');
      en.hooks.intensity({ combo, depth });
      en.hooks.strain(strain);
    });
  };
}

export const EVENT_SCENES = {
  collect1: [collect(0, 1)], collect2: [collect(2, 2)], collect3: [collect(4, 3)], collect4: [collect(6, 4)], collect5: [collect(8, 5)], collect6: [collect(9, 6)],
  fire: [{ t: 'FIRE', r: 0, c: 0, partId: 'hook' }],
  chain: [{ t: 'CHAIN', from: { r: 0, c: 0 }, to: { r: 0, c: 3 } }],
  hazardHit: [{ t: 'HAZARD', lane: 0, hazard: 'rock', absorbedBy: null, strainDelta: 3 }],
  hazardBlocked: [{ t: 'HAZARD', lane: 0, hazard: 'rock', absorbedBy: { r: 0, c: 0 }, strainDelta: 0 }],
  snap: [{ t: 'SNAP', goldLost: 1, goldKept: 1 }],
  haul: [{ t: 'HAUL', gold: 1, depth: 10 }],
  record: [{ t: 'RECORD', depth: 100 }],
  biome: [{ t: 'BIOME', id: 'quartz', depth: 100 }],
  milestone: [{ t: 'MILESTONE', depth: 50 }],
};

export const UI_NAMES = ['tap', 'buy', 'deny', 'open', 'close', 'claim', 'place', 'remove', 'achievement', 'daily', 'tab', 'toggle', 'slider', 'charge'];

export function eventScene(name) {
  return (api) => {
    api.engine.music.setMood(0, 0.01); // judge the effect on its own
    api.at(0.2, (e) => e.handle(EVENT_SCENES[name], { strain: 0, maxStrain: 100 }));
  };
}

export function uiScene(name) {
  return (api) => {
    api.engine.music.setMood(0, 0.01);
    api.at(0.2, (e) => e.ui.play(name, name === 'slider' ? 0.5 : name === 'charge' ? 0.6 : true));
  };
}

export { MUSIC_BIOMES };
