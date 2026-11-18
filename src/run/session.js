// A drop from start to finish. Owns the loop, hands events to everyone, and finishes once.
// Bus events: run:started, run:events (once per beat), run:ended, run:paused, run:resumed,
// run:aborted, run:recovered, goal:done.
import { deps, call } from './deps.js';
import { S, resetState } from './state.js';
import rigs from './rigs.js';
import records from './records.js';
import goalsApi from './goals.js';
import { addEvents } from './tally.js';
import { buildView, idleView } from './view.js';
import { finishRun, keepFraction } from './finish.js';
import { ensureRecovered, recover } from './recover.js';

const CHECKPOINT_EVERY = 10;  // beats between crash checkpoints
const SPEED_EFFECT = 0.5;     // a rig that is 2x faster plays 1.5x quicker, so it stays readable
const SPEED_MIN = 0.6, SPEED_MAX = 1.6;

function beatMsFor(speed) {
  const s = Number(speed);
  const f = Number.isFinite(s) ? 1 + (s - 1) * SPEED_EFFECT : 1;
  return Math.round(deps.baseBeatMs / Math.min(SPEED_MAX, Math.max(SPEED_MIN, f)));
}

function viewNow(status) {
  return buildView(S.run, {
    goals: S.goals, bestDepth: S.bestBefore, status,
    riskInfo: deps.engine && deps.engine.riskInfo,
  });
}

function writeCheckpoint() {
  const st = (S.run && S.run.state) || {};
  records.saveCheckpoint({
    seed: S.seed, beat: S.beats, depth: st.depth, gold: st.gold,
    keepOnSnap: keepFraction(S.mods), cheated: !!(S.mods && S.mods.cheat), biomeId: st.biomeId,
  });
  call(deps.save, 'saveNow');
}

function installLifecycle() {
  if (S.lifecycle || typeof document === 'undefined') return;
  S.lifecycle = true;
  const save = () => { if (!S.ended && (S.status === 'running' || S.status === 'paused')) writeCheckpoint(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  if (typeof window !== 'undefined') window.addEventListener('pagehide', save);
}

function onFrame(dtMs, alpha) {
  const list = S.frameCbs;
  for (let i = 0; i < list.length; i++) {
    try { list[i](dtMs, alpha); } catch (e) { deps.log.warn('run: frame listener failed'); }
  }
}

// Everything that happens after the engine gave us this beat's events.
function afterEvents(events) {
  const st = S.run.state;
  let list = events;
  let hasRecord = false;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e) continue;
    if (e.t === 'SNAP') S.snap = e;
    else if (e.t === 'RECORD') hasRecord = true;
  }
  addEvents(S.tally, list);
  if (hasRecord) S.recordSent = true;
  if (!S.recordSent && S.bestBefore > 0 && !(S.mods && S.mods.cheat) && Number(st.depth) > S.bestBefore) {
    S.recordSent = true;
    list = list.concat([{ t: 'RECORD', depth: Math.floor(Number(st.depth)) }]);
  }
  const done = goalsApi.update(S.goals, list, st);
  S.view = viewNow(st.status);
  deps.bus.emit('run:events', { events: list, view: S.view });
  for (let i = 0; i < done.length; i++) deps.bus.emit('goal:done', { goal: done[i], view: S.view });

  if (S.ended) return;
  if (st.status !== 'running') { finishRun(st.status === 'hauled' ? 'hauled' : 'snapped'); return; }
  const ms = beatMsFor(st.speed);
  if (ms !== S.lastBeatMs && S.loop) { S.lastBeatMs = ms; call(S.loop, 'setBeatMs', ms); }
  if (S.beats % CHECKPOINT_EVERY === 0) writeCheckpoint();
}

function onBeat() {
  if (S.ended || S.status !== 'running' || !S.run) return;
  let events;
  try {
    events = deps.engine.stepBeat(S.run);
    S.errors = 0;
  } catch (e) {
    deps.log.error('run: beat failed', e && e.message);
    S.errors++;
    if (S.errors >= 2) finishRun('snapped'); // never leave the player on a frozen screen
    return;
  }
  S.beats++;
  afterEvents(Array.isArray(events) ? events : []);
}

export function start(opts = {}) {
  ensureRecovered();
  if (S.status === 'running' || S.status === 'paused') return { ok: false, error: 'A drop is already going.' };
  if (!deps.engine || typeof deps.createLoop !== 'function') {
    deps.log.warn('run: engine or loop is not ready');
    return { ok: false, error: 'Drops are not ready yet.' };
  }
  try {
    resetState();
    installLifecycle();
    const mods = call(deps.meta, 'getMods') || {};
    const { rig } = rigs.validate(opts && opts.rig ? opts.rig : rigs.getRig(), mods);
    S.mods = mods;
    S.rig = rig;
    S.counter++;
    S.seed = ((Number(deps.now()) % 2147483647) ^ Math.imul(S.counter, 2654435761)) >>> 0;
    S.run = deps.engine.createRun({ rig, mods, seed: S.seed });
    if (!S.run || !S.run.state) throw new Error('engine gave no run');
    S.bestBefore = records.bestDepth();
    S.goals = goalsApi.generate({ bestDepth: S.bestBefore, rng: deps.makeRng(S.seed ^ 0x9e3779b9) });
    S.lastBeatMs = beatMsFor(S.run.state.speed);
    S.loop = deps.createLoop({ beatMs: S.lastBeatMs, onBeat, onFrame });
    S.status = 'running';
    S.view = viewNow('running');
    writeCheckpoint();
    deps.bus.emit('run:started', { view: S.view, seed: S.seed });
    S.loop.start();
    return { ok: true, seed: S.seed };
  } catch (e) {
    deps.log.error('run: start failed', e && e.message);
    try { if (S.loop) S.loop.stop(); } catch (err) { /* already stopped */ }
    S.loop = null; S.run = null; S.status = 'idle'; S.ended = true;
    records.clearCheckpoint();
    return { ok: false, error: 'Could not start the drop. Try again.' };
  }
}

export function haul() {
  if (S.status !== 'running' || S.ended || S.hauling || !S.run) return { ok: false };
  S.hauling = true;
  let events = [];
  try {
    const out = deps.engine.haul(S.run);
    if (Array.isArray(out)) events = out;
  } catch (e) {
    deps.log.error('run: haul failed', e && e.message);
  }
  if (S.run.state.status === 'running') S.run.state.status = 'hauled'; // the player asked, so it counts
  afterEvents(events);
  S.hauling = false;
  return { ok: true };
}

export function pause() {
  if (S.status !== 'running' || S.ended) return { ok: false };
  call(S.loop, 'pause');
  S.status = 'paused';
  writeCheckpoint();
  deps.bus.emit('run:paused', { view: S.view });
  return { ok: true };
}

export function resume() {
  if (S.status !== 'paused' || S.ended) return { ok: false };
  call(S.loop, 'resume');
  S.status = 'running';
  deps.bus.emit('run:resumed', { view: S.view });
  return { ok: true };
}

// Quit with no payout. The player keeps nothing from this drop.
export function abort() {
  if ((S.status !== 'running' && S.status !== 'paused') || S.ended) return { ok: false };
  S.ended = true;
  S.status = 'ended';
  call(S.loop, 'stop');
  S.loop = null;
  records.clearCheckpoint();
  call(deps.save, 'saveNow');
  S.view = viewNow('aborted');
  S.result = null;
  deps.bus.emit('run:aborted', { view: S.view });
  return { ok: true };
}

export function getView() {
  ensureRecovered();
  return S.view || idleView(records.bestDepth());
}

export function getResult() { return S.result; }
export function isRunning() { return S.status === 'running' || S.status === 'paused'; }

// The renderer and HUD can hook the animation frame here. Returns a function that removes the hook.
export function onFrameTick(fn) {
  if (typeof fn !== 'function') return () => {};
  S.frameCbs.push(fn);
  return () => { const i = S.frameCbs.indexOf(fn); if (i >= 0) S.frameCbs.splice(i, 1); };
}

export const session = { start, haul, pause, resume, abort, getView, getResult, isRunning, recover, onFrame: onFrameTick };
export default session;
