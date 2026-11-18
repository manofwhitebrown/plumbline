// Fakes used by the run tests: a save file, a meta game, a manual loop and a tiny engine.
import { setDeps, resetDeps } from '../src/run/deps.js';
import { hardReset } from '../src/run/state.js';
import { _forget as forgetRecords } from '../src/run/records.js';
import { _forget as forgetRigs } from '../src/run/rigs.js';
import { _clearPowerCache } from '../src/run/rig-preview.js';
import { bus } from '../src/core/bus.js';

// Save: live slices in memory, plus a "disk" copy that only changes on saveNow().
export function makeSave() {
  const live = {}; let disk = {}; const specs = {};
  return {
    live,
    registerSlice(name, spec) { specs[name] = spec; if (!live[name]) live[name] = JSON.parse(JSON.stringify(disk[name] ? spec.migrate(disk[name], 0) : spec.defaults)); },
    getSlice(name) { return live[name] || (live[name] = {}); },
    markDirty() {}, saveNow() { disk = JSON.parse(JSON.stringify(live)); },
    disk: (name) => disk[name],
    // A crash: memory is lost, the disk copy comes back.
    crash() { for (const k of Object.keys(live)) delete live[k]; Object.assign(live, JSON.parse(JSON.stringify(disk))); },
  };
}

// Meta: gold and shards live in the same save, so crashes treat them like real saves.
export function makeMeta(save, over = {}) {
  const box = () => { const s = save.getSlice('meta'); if (typeof s.gold !== 'number') { s.gold = 0; s.shards = 0; s.ledger = []; } return s; };
  const mods = { maxStrain: 100, keepOnSnap: 0.3, goldMult: 1, strainMult: 1, luck: 0, startDepth: 0, cols: 4, rows: 3, unlockedParts: ['hook'], twist: null, cheat: null, ...over.mods };
  const meta = {
    mods, owned: over.owned || { hook: 1 }, paid: [], log: [],
    getMods: () => ({ ...meta.mods }), ownedParts: () => ({ ...meta.owned }),
    addGold(n) { box().gold += n; box().ledger.push(n); }, addShards(n) { box().shards += n; },
    gold: () => box().gold, shards: () => box().shards, stats: { record(r) { meta.paid.push(r); } },
  };
  return meta;
}

export function makeLoop() {
  const loop = { beatMs: 0, running: false, paused: false, onBeat: null };
  loop.createLoop = (o) => { loop.onBeat = o.onBeat; loop.beatMs = o.beatMs; loop.onFrame = o.onFrame; return {
    start() { loop.running = true; }, stop() { loop.running = false; }, pause() { loop.paused = true; }, resume() { loop.paused = false; },
    setBeatMs(ms) { loop.beatMs = ms; }, isRunning() { return loop.running && !loop.paused; } }; };
  loop.tick = (n = 1) => { for (let i = 0; i < n; i++) if (loop.running && !loop.paused) loop.onBeat(); };
  return loop;
}

// A tiny engine: +1 m a beat, a gem worth 2 each beat, snaps at a chosen depth.
export function makeEngine({ snapAt = Infinity, speed = 1, throwAt = -1 } = {}) {
  return {
    createRun({ rig, mods, seed }) { return { rig, mods, seed, state: { status: 'running', beat: 0, depth: 0, speed, gold: 0, strain: 0, maxStrain: 100, combo: 0, biomeId: 'clay', stats: {} } }; },
    stepBeat(run) {
      const s = run.state; if (s.status !== 'running') return [];
      if (throwAt >= 0 && s.beat === throwAt) throw new Error('engine boom');
      s.beat++; s.depth += s.speed; s.gold += 2; s.combo++; s.strain += 1;
      const ev = [{ t: 'BEAT', i: s.beat, depth: s.depth }, { t: 'COLLECT', lane: 0, item: { kind: 'gem', tier: 1, value: 2 }, gold: 2, combo: s.combo, r: 2, c: 1 }];
      if (s.depth >= snapAt) { s.status = 'snapped'; ev.push({ t: 'SNAP', goldLost: Math.floor(s.gold * 0.7), goldKept: Math.floor(s.gold * 0.3) }); }
      return ev;
    },
    haul(run) { run.state.status = 'hauled'; return [{ t: 'HAUL', gold: run.state.gold, depth: run.state.depth }]; },
    riskInfo(run) { return { beatsToSnap: Math.max(0, snapAt - run.state.depth), goldAtRisk: run.state.gold, keepIfSnap: Math.floor(run.state.gold * 0.3) }; },
    simulateRun({ seed }) { return { kept: 10 + (seed % 5) }; },
  };
}

export function setup(over = {}) {
  resetDeps(); hardReset(); forgetRecords(); forgetRigs(); _clearPowerCache();
  const save = makeSave();
  const meta = makeMeta(save, over);
  const loop = makeLoop();
  const engine = makeEngine(over.engine);
  let t = 1_700_000_000_000;
  setDeps({ save, meta, createLoop: loop.createLoop, engine, now: () => (t += 1), baseBeatMs: 450 });
  const seen = []; const offs = [];
  for (const name of ['run:started', 'run:events', 'run:ended', 'run:aborted', 'run:paused', 'run:resumed', 'run:recovered', 'goal:done', 'rig:changed']) {
    offs.push(bus.on(name, (p) => seen.push([name, p])));
  }
  return { save, meta, loop, engine, seen, count: (n) => seen.filter((x) => x[0] === n).length, off: () => offs.forEach((o) => o()) };
}
