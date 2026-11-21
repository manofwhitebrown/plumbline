// Mastery: Parts level up from use (grabs and chains). Small perks, paid when a Drop ends.
// No engine changes: it listens to run events, like the other meta modules.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import {
  MASTERY_MAX, MASTERY_USES, MASTERY_GOLD_PER_LEVEL, MASTERY_SNAP_SAVE_L5, MASTERY_BONUS_CAP,
  MASTERY_SNAP_SAVE_CAP, MASTERY_USES_PER_DROP, MASTERY_RECENT_MAX, MASTERY_TEXT,
} from '../data/mastery.js';
import { s } from './state.js';
import { addGold } from './wallet.js';
import { money, num } from './safe.js';

const MAX_USES = MASTERY_USES[MASTERY_USES.length - 1] * 10;

function clean(old) {
  const out = { uses: {}, recent: [], lastBonus: null };
  if (!old || typeof old !== 'object') return out;
  if (old.uses && typeof old.uses === 'object') {
    for (const k of Object.keys(old.uses)) {
      const n = Math.floor(num(old.uses[k]));
      if (n > 0 && typeof k === 'string') out.uses[k] = Math.min(MAX_USES, n);
    }
  }
  if (Array.isArray(old.recent)) {
    out.recent = old.recent.filter((r) => r && typeof r.id === 'string').slice(-MASTERY_RECENT_MAX)
      .map((r) => ({ id: r.id, level: Math.min(MASTERY_MAX, Math.max(1, Math.floor(num(r.level, 1)))) }));
  }
  const b = old.lastBonus;
  if (b && typeof b === 'object') out.lastBonus = { gold: money(b.gold), saved: money(b.saved) };
  return out;
}

registerSlice('mastery', { version: 1, defaults: clean(null), migrate: (old) => clean(old) });
const st = () => getSlice('mastery') || clean(null);

// ---------- pure helpers ----------
export function levelFor(uses) {
  const u = Math.max(0, num(uses));
  let lv = 0;
  for (let i = 0; i < MASTERY_USES.length; i++) if (u >= MASTERY_USES[i]) lv = i + 1;
  return lv;
}

const pct = (x) => Math.round(x * 1000) / 10;

export function sentenceFor(level) {
  const lv = Math.min(MASTERY_MAX, Math.max(0, Math.floor(num(level))));
  if (lv === 0) return MASTERY_TEXT.none;
  const g = String(pct(MASTERY_GOLD_PER_LEVEL * lv));
  const t = lv === MASTERY_MAX ? MASTERY_TEXT.top : MASTERY_TEXT.base;
  return t.replace('{n}', String(lv)).replace('{g}', g);
}

// Pure. input: { partGold: {id: gold}, rigParts: [ids], gold, kept, outcome, levels: {id: level} }
// Returns { gold, saved } (Gold to add on top of the normal payout).
export function computeBonus(input) {
  const i = input && typeof input === 'object' ? input : {};
  const levels = i.levels || {};
  const partGold = i.partGold || {};
  const total = Math.max(0, num(i.gold));
  const kept = Math.max(0, Math.min(total, num(i.kept, total)));
  const keepShare = total > 0 ? kept / total : 1; // after a Snap only the kept share earns the bonus
  let raw = 0;
  for (const id of Object.keys(partGold)) {
    const lv = Math.min(MASTERY_MAX, Math.max(0, Math.floor(num(levels[id]))));
    raw += Math.max(0, num(partGold[id])) * MASTERY_GOLD_PER_LEVEL * lv;
  }
  const gold = Math.min(raw * keepShare, kept * MASTERY_BONUS_CAP);
  let saved = 0;
  if (i.outcome === 'snapped') {
    const parts = Array.from(new Set(Array.isArray(i.rigParts) ? i.rigParts : []));
    const top = parts.filter((id) => num(levels[id]) >= MASTERY_MAX).length;
    saved = Math.max(0, total - kept) * Math.min(MASTERY_SNAP_SAVE_CAP, top * MASTERY_SNAP_SAVE_L5);
  }
  return { gold: Math.floor(gold), saved: Math.floor(saved) };
}

// ---------- reading ----------
export function uses(partId) { return Math.floor(num(st().uses[partId])); }
export function level(partId) { return levelFor(uses(partId)); }

export function info(partId) {
  const u = uses(partId);
  const lv = levelFor(u);
  const maxed = lv >= MASTERY_MAX;
  const from = lv === 0 ? 0 : MASTERY_USES[lv - 1];
  const to = maxed ? from : MASTERY_USES[lv];
  return {
    id: String(partId), level: lv, max: MASTERY_MAX, uses: u, maxed, toNext: maxed ? 0 : Math.max(0, to - u),
    fraction: maxed ? 1 : Math.min(1, Math.max(0, (u - from) / Math.max(1, to - from))),
    goldPct: pct(MASTERY_GOLD_PER_LEVEL * lv), sentence: sentenceFor(lv),
  };
}

export function recent() { return st().recent.slice(); }
export function lastBonus() { return st().lastBonus ? { ...st().lastBonus } : null; }

// ---------- writing ----------
export function addUses(partId, n) {
  try {
    const x = Math.floor(num(n));
    if (typeof partId !== 'string' || !partId || x <= 0) return 0;
    const d = st();
    const before = levelFor(d.uses[partId]);
    d.uses[partId] = Math.min(MAX_USES, Math.floor(num(d.uses[partId])) + x);
    const after = levelFor(d.uses[partId]);
    if (after > before) {
      d.recent.push({ id: partId, level: after });
      if (d.recent.length > MASTERY_RECENT_MAX) d.recent.shift();
      bus.emit('mastery:level', { id: partId, level: after });
    }
    markDirty('mastery');
    return x;
  } catch (e) { log.warn('mastery.addUses failed', e && e.message); return 0; }
}

// Cheat: lift a Part to its next level (or set a level directly with `to`).
export function addLevel(partId, to) {
  const cur = level(partId);
  const target = Math.min(MASTERY_MAX, to == null ? cur + 1 : Math.max(0, Math.floor(num(to))));
  if (target <= cur) return cur;
  addUses(partId, MASTERY_USES[target - 1] - uses(partId));
  return level(partId);
}

export function resetAll() {
  const d = st();
  d.uses = {}; d.recent = []; d.lastBonus = null;
  markDirty('mastery');
}

// ---------- run listening ----------
let cur = null;
let started = false;

function begin(p) {
  const rig = p && p.rig && Array.isArray(p.rig.cells) ? p.rig : null;
  cur = { rig, partGold: {}, runUses: {} };
}
function partAt(r, c) {
  const row = cur && cur.rig && cur.rig.cells[r];
  const id = row ? row[c] : null;
  return typeof id === 'string' ? id : null;
}
function use(id, n) {
  if (!id) return;
  const have = cur.runUses[id] || 0;
  const add = Math.min(n, MASTERY_USES_PER_DROP - have);
  if (add <= 0) return;
  cur.runUses[id] = have + add;
}
export function onEvents(events) {
  if (!cur || !Array.isArray(events)) return;
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    if (e.t === 'COLLECT') {
      const id = partAt(e.r, e.c);
      if (!id) continue;
      use(id, 1);
      cur.partGold[id] = (cur.partGold[id] || 0) + Math.max(0, num(e.gold));
    } else if (e.t === 'CHAIN') {
      const a = e.from && partAt(e.from.r, e.from.c), b = e.to && partAt(e.to.r, e.to.c);
      if (a) use(a, 1);
      if (b) use(b, 1);
    }
  }
}

export function onEnded(p) {
  const run = cur; cur = null;
  if (!run || !p || typeof p !== 'object') return null;
  if (s().cheated) return null; // cheated drops never level a Part
  const levelsBefore = {};
  const ids = Object.keys(run.runUses);
  for (const id of ids) levelsBefore[id] = level(id);
  // The bonus uses the levels the Parts had BEFORE this Drop, so it is predictable.
  const rigParts = run.rig ? run.rig.cells.flat().filter((x) => typeof x === 'string') : [];
  for (const id of rigParts) if (levelsBefore[id] == null) levelsBefore[id] = level(id);
  const bonus = computeBonus({ partGold: run.partGold, rigParts, gold: p.gold, kept: p.kept, outcome: p.outcome, levels: levelsBefore });
  for (const id of ids) addUses(id, run.runUses[id]);
  const total = bonus.gold + bonus.saved;
  if (total > 0) addGold(total);
  st().lastBonus = { gold: bonus.gold, saved: bonus.saved };
  markDirty('mastery');
  return bonus;
}

export function start() {
  if (started) return;
  started = true;
  const guard = (fn) => (payload) => { try { fn(payload); } catch (e) { log.error('mastery hook failed', e && e.message); } };
  bus.on('run:started', guard(begin));
  bus.on('run:events', guard((p) => onEvents(p && p.events)));
  bus.on('run:ended', guard(onEnded));
  bus.on('run:aborted', guard(() => { cur = null; }));
}
start();
