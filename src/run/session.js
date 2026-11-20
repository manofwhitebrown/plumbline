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
import { computePayout } from './payout.js';

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
    goals: S.goals, bestDepth: S.bestBefore, status, playView: deps.engine && deps.engine.playView,
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
  if (st.status === 'choosing') { openPicker(); return; } // [HOOK-1] a boon offer pauses the drop
  if (st.status !== 'running') { finishRun(st.status === 'hauled' ? 'hauled' : 'snapped'); return; }
  const ms = beatMsFor(st.speed);
  if (ms !== S.lastBeatMs && S.loop) { S.lastBeatMs = ms; call(S.loop, 'setBeatMs', ms); }
  if (S.beats % CHECKPOINT_EVERY === 0) writeCheckpoint();
  autoHaulCheck(st);
}

// [HOOK-1] A boon or Merchant offer is open: stop the beat clock until the player picks (or the timer runs out).
function openPicker() {
  call(S.loop, 'pause');
  S.choosing = true;
  clearTimeout(S.pickTimer);
  const secs = Number(S.view && S.view.play && S.view.play.seconds) || 6;
  if (typeof setTimeout === 'function') S.pickTimer = setTimeout(() => { if (S.choosing) chooseBoon(null); }, (secs + 2) * 1000); // safety net if no screen answers
}

export function chooseBoon(id) {
  if (!S.choosing || S.ended || !S.run || !deps.engine || typeof deps.engine.chooseBoon !== 'function') return { ok: false };
  let events = [];
  try { const out = deps.engine.chooseBoon(S.run, id === undefined ? null : id); if (Array.isArray(out)) events = out; } catch (e) { deps.log.warn('run: chooseBoon failed'); }
  if (S.run.state.status === 'choosing') return { ok: false }; // junk id: the offer stays open
  S.choosing = false; clearTimeout(S.pickTimer);
  afterEvents(events);
  if (!S.ended && S.status === 'running') call(S.loop, 'resume');
  return { ok: true };
}

// [HOOK-1] Tap skills (Brace, Surge, Flare). Safe to call twice: a second press finds no charge.
export function useSkill(id) {
  if (S.status !== 'running' || S.ended || S.choosing || !S.run || !deps.engine || typeof deps.engine.useSkill !== 'function') return { ok: false };
  let events = [];
  try { const out = deps.engine.useSkill(S.run, id); if (Array.isArray(out)) events = out; } catch (e) { deps.log.warn('run: useSkill failed'); }
  if (!events.length) return { ok: false };
  afterEvents(events);
  return { ok: true };
}

// Auto-Haul Assist (Workshop upgrade): haul by itself when the strain reaches the chosen level.
function autoHaulCheck(st) {
  if (S.tutorial || S.hauling || S.ended || S.status !== 'running') return;
  const pct = Number(call(deps.meta && deps.meta.upgrades, 'autoHaul'));
  if (!Number.isFinite(pct) || pct <= 0) return;
  const max = Number(st.maxStrain) || 0;
  if (max > 0 && Number(st.strain) / max >= pct / 100) haul();
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
    const given = Number(opts && opts.seed);
    S.seed = Number.isFinite(given) && given >= 0 ? Math.floor(given) >>> 0
      : ((Number(deps.now()) % 2147483647) ^ Math.imul(S.counter, 2654435761)) >>> 0;
    const safe = Number(opts && opts.safeUntilDepth);
    S.tutorial = !!(opts && opts.tutorial);
    const playOpt = opts && opts.play === false ? undefined : (opts && typeof opts.play === 'object' ? opts.play : (S.tutorial ? undefined : {})); // [HOOK-1] off in the tutorial drop
    S.run = deps.engine.createRun({ rig, mods, seed: S.seed, safeUntilDepth: Number.isFinite(safe) && safe > 0 ? safe : 0, play: playOpt });
    if (!S.run || !S.run.state) throw new Error('engine gave no run');
    S.bestBefore = records.bestDepth();
    S.goals = goalsApi.generate({ bestDepth: S.bestBefore, rng: deps.makeRng(S.seed ^ 0x9e3779b9) });
    S.lastBeatMs = beatMsFor(S.run.state.speed);
    S.loop = deps.createLoop({ beatMs: S.lastBeatMs, onBeat, onFrame });
    S.status = 'running';
    S.view = viewNow('running');
    writeCheckpoint();
    deps.bus.emit('run:started', { view: S.view, seed: S.seed, rig: S.rig });
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
  if (S.status !== 'running' || S.ended || S.hauling || !S.run || S.choosing) return { ok: false };
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
  if (S.status !== 'paused' || S.ended || S.choosing) return { ok: false };
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

// Debug only (?debug=1&screen=drop). A safe fake drop for the screen. Sends no events and pays nothing.
export function debugView(opts = {}) {
  if (S.status === 'running' || S.status === 'paused') return S.view;
  const big = !!(opts && opts.extreme);
  const fake = { state: big
    ? { status: 'running', depth: 99999, gold: 9.994e35, strain: 98, maxStrain: 100, combo: 99, speed: 3, beat: 99999, biomeId: 'abyss' }
    : { status: 'running', depth: 137, gold: 1234, strain: 62, maxStrain: 100, combo: 7, speed: 1, beat: 90, biomeId: 'quartz' } };
  const goals = [
    { id: 'depth', text: 'Reach 150 m', done: false, reward: 5 },
    { id: 'gems', text: 'Collect 20 gems', done: true, reward: 5 },
    { id: 'strain', text: 'Haul with strain under 40', done: false, reward: 5 },
  ];
  S.view = buildView(fake, { goals, bestDepth: big ? 99998 : 120, status: 'running', riskInfo: () => ({ beatsToSnap: big ? 1 : 14, goldAtRisk: big ? 6.9e35 : 864, keepIfSnap: big ? 3e35 : 370 }) });
  return S.view;
}

// Debug only. A fake finished drop for the Results screen. Sends no events and pays nothing.
export function debugResults(outcome = 'hauled', opts = {}) {
  const big = !!(opts && opts.extreme);
  const goals = [
    { id: 'depth', text: 'Reach 150 m', done: true, reward: 5 },
    { id: 'gems', text: 'Collect 20 gems', done: true, reward: 5 },
    { id: 'strain', text: 'Haul with strain under 40', done: false, reward: 5 },
  ];
  const tally = { biggest: { tier: 4, value: 81 }, bestCombo: 12, fires: { hook: 40, magnet: 22 }, gems: 31 };
  const p = computePayout({
    outcome: outcome === 'snapped' ? 'snapped' : 'hauled', gold: big ? 9.994e35 : 1234, goldKept: big ? 3e35 : 370, depth: big ? 99999 : 162, bestBefore: big ? 99998 : 120,
    goals, tally, partsInRig: ['hook', 'magnet', 'polisher'], cheated: false, fmt: deps.fmt,
  });
  S.result = { ...p, seed: 0, debug: true };
  return S.result;
}
export function isRunning() { return S.status === 'running' || S.status === 'paused'; }

// The renderer and HUD can hook the animation frame here. Returns a function that removes the hook.
export function onFrameTick(fn) {
  if (typeof fn !== 'function') return () => {};
  S.frameCbs.push(fn);
  return () => { const i = S.frameCbs.indexOf(fn); if (i >= 0) S.frameCbs.splice(i, 1); };
}

export const session = { chooseBoon, useSkill, start, haul, pause, resume, abort, getView, getResult, isRunning, recover, onFrame: onFrameTick, debugView, debugResults };
export default session;
