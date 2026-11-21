// Daily Dive: one fixed-seed Drop per day with the daily twist, one free try, best Depth, a streak and a chest.
// This file never starts the Drop (that would be a loop with the run session). The Rewards screen calls
// begin(), then session.start({ seed, play: {} }). The result goes through the normal Results screen.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import {
  DIVE_MIN_DROPS, DIVE_SEED_SALT, DIVE_STALE_MS, DIVE_CHEST, DIVE_CHEST_NAMES, DIVE_TEXT,
} from '../data/dive.js';
import { TWIST_DATA } from '../data/twists.js';
import { s, changed } from './state.js';
import { now, dayIndex, msToNextDay } from './time.js';
import { money, num } from './safe.js';
import { addGold, addShards } from './wallet.js';
import { perSecond } from './crew.js';
import { dailyTwistId, setTwist } from './daily.js';

function clean(old) {
  const o = old && typeof old === 'object' ? old : {};
  const chest = o.chest === 'ready' || o.chest === 'claimed' ? o.chest : 'none';
  return {
    day: Math.floor(num(o.day, -1)), tried: !!o.tried, running: !!o.running,
    best: Math.max(0, Math.floor(num(o.best))), depth: Math.max(0, Math.floor(num(o.depth))),
    lastDay: Math.floor(num(o.lastDay, -1)), streak: Math.min(9999, Math.max(0, Math.floor(num(o.streak)))),
    bestStreak: Math.min(9999, Math.max(0, Math.floor(num(o.bestStreak)))),
    allTimeBest: Math.max(0, Math.floor(num(o.allTimeBest))),
    pending: !!o.pending, chest, startedAt: Math.max(0, num(o.startedAt)),
    restoreTwist: o.restoreTwist === true ? true : o.restoreTwist === false ? false : null,
    seed: Math.max(0, Math.floor(num(o.seed))) >>> 0,
  };
}

registerSlice('dive', { version: 1, defaults: clean(null), migrate: (old) => clean(old) });
const st = () => getSlice('dive') || clean(null);

// ---------- pure ----------
// The same number for everyone on the same date.
export function seedForDay(day) {
  const d = Math.floor(num(day));
  let x = Math.imul(d + 1, 2654435761) ^ DIVE_SEED_SALT;
  x = Math.imul(x ^ (x >>> 15), 2246822519);
  x = Math.imul(x ^ (x >>> 13), 3266489917);
  return (x ^ (x >>> 16)) >>> 0;
}

export function chestFor(depth, streak) {
  const dp = Math.max(0, num(depth));
  const c = DIVE_CHEST;
  const shards = Math.min(c.shardsCap, c.shardsBase + Math.floor(dp / c.shardsPerMetres) + Math.min(c.streakBonusMax, Math.max(0, Math.floor(num(streak)))));
  const minutes = Math.min(c.goldMinutesCap, c.goldMinutesBase + Math.floor(dp / c.goldMinutesPerMetres));
  let name = DIVE_CHEST_NAMES[0].name;
  for (const n of DIVE_CHEST_NAMES) if (dp >= n.from) name = n.name;
  return { name, shards, goldMinutes: minutes };
}

// ---------- state ----------
function setTwistSafe(on) { try { setTwist(!!on); } catch (e) { log.warn('dive twist failed'); } }

function restore(d) {
  if (d.restoreTwist !== null) { setTwistSafe(d.restoreTwist); d.restoreTwist = null; }
}

function endRunning(d) { d.running = false; restore(d); }

// Roll the day over and clean up a Dive that never finished.
function tidy() {
  const d = st();
  Object.assign(d, clean(d)); // a damaged value is fixed here, never shown
  const today = dayIndex(now());
  if (d.running && (today !== d.day || now() - d.startedAt > DIVE_STALE_MS || now() < d.startedAt)) { endRunning(d); markDirty('dive'); }
  if (d.day > today) return d; // clock moved back: keep what we have, never give a second try
  if (d.day < today) {
    // A chest the player never opened is lost with the day. The streak lives on in lastDay.
    d.day = today; d.tried = false; d.best = 0; d.depth = 0; d.chest = 'none'; d.seed = seedForDay(today);
    markDirty('dive');
  }
  return d;
}

export function state() {
  const d = tidy();
  const today = dayIndex(now());
  const drops = num(s().stats.drops);
  let why = '';
  if (d.running) why = DIVE_TEXT.running;
  else if (d.tried) why = DIVE_TEXT.tried;
  else if (drops < DIVE_MIN_DROPS) why = DIVE_TEXT.locked;
  const twistId = dailyTwistId();
  const alive = d.lastDay === today || d.lastDay === today - 1; // a missed day ends the streak
  const reward = chestFor(d.depth, alive ? d.streak : 0);
  return {
    day: today, seed: seedForDay(today), twistId, twistName: (TWIST_DATA[twistId] && TWIST_DATA[twistId].name) || 'Daily twist',
    twistDesc: (TWIST_DATA[twistId] && TWIST_DATA[twistId].desc) || '',
    canPlay: !why, why: why || DIVE_TEXT.ready, running: d.running, tried: d.tried,
    best: d.best, allTimeBest: d.allTimeBest, streak: alive ? d.streak : 0, bestStreak: d.bestStreak,
    chest: { state: d.chest, name: reward.name, shards: reward.shards, gold: Math.floor(money(Math.max(DIVE_CHEST.goldFloor, perSecond() * 60 * reward.goldMinutes))) },
    nextInMs: msToNextDay(now()),
  };
}

// ---------- doing ----------
// Step 1 of a Dive. Switches today's twist on for this Drop only. Returns what session.start needs.
export function begin() {
  try {
    const stt = state();
    if (!stt.canPlay) return { ok: false, error: stt.why };
    const d = st();
    d.restoreTwist = !!s().daily.twistOn;
    setTwistSafe(true);
    d.seed = stt.seed;
    d.startedAt = now();
    d.running = false; // becomes true when the Drop really starts (run:started with this seed)
    d.pending = true;
    markDirty('dive');
    return { ok: true, seed: stt.seed, twistId: stt.twistId, options: { seed: stt.seed, play: {} } };
  } catch (e) { log.warn('dive.begin failed', e && e.message); return { ok: false, error: 'Could not start the Dive.' }; }
}

// If the Drop did not start after begin(), put everything back. The free try is NOT used.
export function cancel() {
  const d = st();
  if (d.running) return false;
  d.pending = false;
  restore(d);
  markDirty('dive');
  return true;
}

function onStarted(p) {
  const d = st();
  if (!d.pending || !p || Math.floor(num(p.seed)) >>> 0 !== d.seed) return;
  d.pending = false; d.running = true; d.tried = true; d.startedAt = now();
  markDirty('dive'); changed('dive');
}

function finish(depth, outcome) {
  const d = st();
  if (!d.running) return null;
  endRunning(d);
  if (s().cheated) { markDirty('dive'); return null; }
  const today = dayIndex(now());
  const dp = Math.max(0, Math.floor(num(depth)));
  d.best = Math.max(d.best, dp);
  d.depth = d.best;
  d.allTimeBest = Math.max(d.allTimeBest, dp);
  if (d.lastDay !== today) {
    d.streak = d.lastDay === today - 1 ? Math.min(9999, d.streak + 1) : 1;
    d.lastDay = today;
    d.bestStreak = Math.max(d.bestStreak, d.streak);
  }
  d.chest = 'ready';
  markDirty('dive'); changed('dive');
  bus.emit('dive:done', { depth: dp, streak: d.streak, outcome });
  return { depth: dp, streak: d.streak };
}

export function claimChest() {
  try {
    const stt = state();
    if (stt.chest.state !== 'ready') return { ok: false, error: stt.chest.state === 'claimed' ? 'Already opened' : 'No chest yet' };
    const d = st();
    const reward = { shards: stt.chest.shards, gold: stt.chest.gold };
    addShards(reward.shards); addGold(reward.gold);
    d.chest = 'claimed';
    markDirty('dive'); changed('dive');
    return { ok: true, ...reward, name: stt.chest.name };
  } catch (e) { log.warn('dive.claimChest failed', e && e.message); return { ok: false, error: 'failed' }; }
}

// ---------- cheats ----------
export function cheatReset() {
  const d = st();
  endRunning(d);
  d.pending = false; d.tried = false; d.best = 0; d.depth = 0; d.chest = 'none';
  markDirty('dive'); changed('dive');
  return true;
}

// ---------- run listening ----------
let started = false;
export function start() {
  if (started) return;
  started = true;
  const guard = (fn) => (payload) => { try { fn(payload); } catch (e) { log.error('dive hook failed', e && e.message); } };
  bus.on('run:started', guard(onStarted));
  bus.on('run:ended', guard((p) => { if (p && Math.floor(num(p.seed)) >>> 0 === st().seed) finish(p.depth, p.outcome); else if (st().running) { /* another run ended: ignore */ } }));
  bus.on('run:recovered', guard((p) => { if (p && Math.floor(num(p.seed)) >>> 0 === st().seed) finish(p.depth, 'snapped'); }));
  bus.on('run:aborted', guard(() => { const d = st(); if (d.running || d.pending) { d.pending = false; endRunning(d); markDirty('dive'); } }));
}
start();
