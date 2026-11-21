// Contracts: 3 at a time from about 20 templates. Progress comes from run events (no engine changes).
// A claimed contract is replaced right away. Unfinished ones are replaced on a new day;
// finished ones stay until claimed so no reward is ever lost.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { makeRng } from '../core/rng.js';
import { CONTRACTS, CONTRACTS_ACTIVE, CONTRACT_PARAM_MAX, CONTRACT_SHARD_CAP } from '../data/contracts.js';
import { s, changed } from './state.js';
import { now, dayIndex } from './time.js';
import { money, num } from './safe.js';
import { addGold, addShards } from './wallet.js';
import { perSecond } from './crew.js';
import { detectCombos } from './partsApi.js';
import { countText } from '../core/plural.js';

const BY_ID = new Map(CONTRACTS.map((c) => [c.id, c]));
const keyOf = (c) => c.scope + ':' + c.stat;

function clean(old) {
  const out = { day: -1, n: 0, active: [] };
  if (!old || typeof old !== 'object') return out;
  out.day = Math.floor(num(old.day, -1));
  out.n = Math.max(0, Math.min(1e9, Math.floor(num(old.n))));
  if (Array.isArray(old.active)) {
    for (const e of old.active) {
      if (!e || typeof e.id !== 'string' || !BY_ID.has(e.id)) continue;
      if (out.active.some((x) => x.id === e.id)) continue;
      const t = BY_ID.get(e.id).target;
      out.active.push({ id: e.id, progress: Math.min(t, Math.max(0, num(e.progress))), claimed: false });
    }
  }
  out.active = out.active.slice(0, CONTRACTS_ACTIVE);
  return out;
}

registerSlice('contracts', { version: 1, defaults: clean(null), migrate: (old) => clean(old) });
const st = () => getSlice('contracts') || clean(null);
const isDone = (e) => e.progress >= BY_ID.get(e.id).target;

// Pick one template not already active, allowed by the player's best Depth. Same inputs, same pick.
function pickOne(d, avoidKeys) {
  const best = num(s().bestDepth);
  d.n++;
  const rng = makeRng(((d.day + 3) * 104729 + d.n * 7919 + 17) >>> 0);
  const have = new Set(d.active.map((e) => e.id));
  let pool = CONTRACTS.filter((c) => c.minBest <= best && !have.has(c.id) && !avoidKeys.has(keyOf(c)));
  if (!pool.length) pool = CONTRACTS.filter((c) => c.minBest <= best && !have.has(c.id));
  if (!pool.length) pool = CONTRACTS.filter((c) => !have.has(c.id));
  if (!pool.length) return null;
  const c = pool[rng.int(0, pool.length - 1)];
  return { id: c.id, progress: 0, claimed: false };
}

function fill(d) {
  let guard = 0;
  while (d.active.length < CONTRACTS_ACTIVE && guard++ < 10) {
    const avoid = new Set(d.active.map((e) => keyOf(BY_ID.get(e.id))));
    const e = pickOne(d, avoid);
    if (!e) break;
    d.active.push(e);
  }
}

// Fix a damaged slice in place (bad ids, bad numbers). Safe to run many times.
function repair(d) {
  const ok = clean(d);
  d.day = ok.day; d.n = ok.n; d.active = ok.active;
}

export function ensureToday() {
  const d = st();
  repair(d);
  const day = dayIndex(now());
  if (d.day > day) { if (d.active.length < CONTRACTS_ACTIVE) { fill(d); markDirty('contracts'); } return; } // clock moved back
  if (d.day < day) {
    d.day = day;
    d.active = d.active.filter(isDone); // keep finished ones so the reward is not lost
    fill(d);
    markDirty('contracts');
    changed('contracts');
  } else if (d.active.length < CONTRACTS_ACTIVE) {
    fill(d);
    markDirty('contracts');
  }
}

export function rewardLabel(c) {
  const r = c.reward;
  if (r.shards) return countText(Math.min(CONTRACT_SHARD_CAP, r.shards), 'Shard');
  return 'Gold';
}

export function rewardAmount(c) {
  const r = c.reward;
  if (r.shards) return { type: 'shards', amount: Math.min(CONTRACT_SHARD_CAP, Math.floor(r.shards)) };
  return { type: 'gold', amount: Math.floor(money(Math.max(num(r.goldFloor), perSecond() * 60 * num(r.goldMinutes)))) };
}

function view(e) {
  const c = BY_ID.get(e.id);
  const rw = rewardAmount(c);
  return {
    id: c.id, text: c.text, target: c.target, progress: Math.min(c.target, e.progress),
    fraction: Math.min(1, e.progress / c.target), done: isDone(e), claimed: false,
    reward: rw, rewardLabel: rw.type === 'shards' ? countText(rw.amount, 'Shard') : 'Gold',
  };
}

export function list() {
  try { ensureToday(); return st().active.map(view); } catch (e) { log.warn('contracts.list failed', e && e.message); return []; }
}
export function unclaimed() { return list().filter((c) => c.done).length; }

export function claim(id) {
  try {
    ensureToday();
    const d = st();
    const i = d.active.findIndex((e) => e.id === id);
    if (i < 0) return { ok: false, error: 'No such contract' };
    const e = d.active[i];
    if (!isDone(e)) return { ok: false, error: 'Not finished yet' };
    const rw = rewardAmount(BY_ID.get(id));
    if (rw.type === 'shards') addShards(rw.amount); else addGold(rw.amount);
    d.active.splice(i, 1);
    fill(d); // replaced when done
    markDirty('contracts');
    changed('contracts');
    return { ok: true, id, reward: rw };
  } catch (err) { log.warn('contracts.claim failed', err && err.message); return { ok: false, error: 'failed' }; }
}

// ---- progress ----
// scope 'drop': keep the best single value. scope 'sum': add.
export function record(stat, value, scope) {
  const v = num(value);
  if (!(v > 0)) return;
  const d = st();
  let touched = false;
  for (const e of d.active) {
    const c = BY_ID.get(e.id);
    if (c.stat !== stat || c.scope !== scope || isDone(e)) continue;
    e.progress = Math.min(c.target, Math.min(CONTRACT_PARAM_MAX, scope === 'sum' ? e.progress + v : Math.max(e.progress, v)));
    touched = true;
  }
  if (touched) markDirty('contracts');
}

let cur = null;
export function onStarted(p) {
  const rig = p && p.rig && Array.isArray(p.rig.cells) ? p.rig : null;
  const ids = rig ? rig.cells.flat().filter((x) => typeof x === 'string') : [];
  let combos = 0;
  try { if (rig) combos = new Set(detectCombos(rig).map((c) => String(c.id))).size; } catch (e) { combos = 0; }
  cur = { gems: 0, ore: 0, relics: 0, chains: 0, blocked: 0, combo: 0, combos, parts: new Set(ids).size };
}
export function onEvents(events) {
  if (!cur || !Array.isArray(events)) return;
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    if (e.t === 'COLLECT' && e.item) {
      if (e.item.kind === 'gem') cur.gems++; else if (e.item.kind === 'ore') cur.ore++; else if (e.item.kind === 'relic') cur.relics++;
      cur.combo = Math.max(cur.combo, num(e.combo));
    } else if (e.t === 'CHAIN') cur.chains++;
    else if (e.t === 'HAZARD' && e.absorbedBy) cur.blocked++;
  }
}
export function onEnded(p) {
  const run = cur; cur = null;
  if (!run || !p || typeof p !== 'object' || s().cheated) return;
  ensureToday();
  for (const k of ['gems', 'ore', 'relics', 'chains', 'blocked', 'combo', 'combos', 'parts']) record(k, run[k], 'drop');
  record('depth', num(p.depth), 'drop');
  if (p.outcome === 'hauled') record('haulDepth', num(p.depth), 'drop');
  for (const k of ['gems', 'ore', 'relics', 'blocked']) record(k, run[k], 'sum');
  record('drops', 1, 'sum');
  if (p.outcome === 'hauled') record('hauls', 1, 'sum');
  changed('contracts');
}

// ---- cheats ----
export function cheatComplete() {
  ensureToday();
  const e = st().active.find((x) => !isDone(x));
  if (!e) return null;
  e.progress = BY_ID.get(e.id).target;
  markDirty('contracts'); changed('contracts');
  return BY_ID.get(e.id).text;
}
export function resetAll() { const d = st(); d.day = -1; d.active = []; d.n = 0; markDirty('contracts'); ensureToday(); }

let started = false;
export function start() {
  if (started) return;
  started = true;
  const guard = (fn) => (payload) => { try { fn(payload); } catch (e) { log.error('contracts hook failed', e && e.message); } };
  bus.on('run:started', guard(onStarted));
  bus.on('run:events', guard((p) => onEvents(p && p.events)));
  bus.on('run:ended', guard(onEnded));
  bus.on('run:aborted', guard(() => { cur = null; }));
}
start();
