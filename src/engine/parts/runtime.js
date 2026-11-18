// Runtime helpers the engine calls once per beat. Parts never touch the engine directly:
// they act through ctx and write into run.fx (speed, strain, bonus) which the engine reads.
//
// Engine order for one beat:
//   fx = beginBeat(run, emit)        // parts tick; read fx.speedAdd before moving
//   ... depth += speed, spawn row ...
//   for each lane: processLane(run, lane, item, emit, rng)
//   finishBeat(run, emit, rng)       // after-grab parts + dangers
//   then read fx.collected / fx.missed / fx.hazards and add fx.strainDelta, fx.bonusValue
import { getPart } from './index.js';
import { stateOf, num, isLoot, capValue } from './util.js';
import { log } from '../../core/log.js';

const MAX_QUEUE = 24;

// Make (or fetch) the per-run scratch object. It lives on the run, so every run starts clean.
export function ensureFx(run) {
  if (run.fx && run.fx.version === 1) return run.fx;
  const fx = {
    version: 1, rig: null, cells: [], pre: [], post: [], hazCells: [],
    speedAdd: 0, strainDelta: 0, bonusValue: 0, fired: 0,
    firedMask: new Uint8Array(64), doubleRow: new Uint8Array(8), reveal: [0, 0, 0, 0, 0, 0, 0, 0],
    collected: [], nCollected: 0, missed: [], nMissed: 0, hazards: [], nHazards: 0,
    queue: [], qLen: 0, fuseQueue: [], fqLen: 0,
    out: null, inWalk: false, chR: -1, chC: -1, ctx: null, cap: 64,
  };
  fx.ctx = makeCtx(run, fx);
  run.fx = fx;
  return fx;
}

function makeCtx(run, fx) {
  const ctx = {
    run, r: 0, c: 0, lane: 0, dLane: 0, partId: '', rng: null,
    emit(ev) {
      if (!ev) return;
      if (ev.t === 'FIRE') {
        fx.fired++;
        fx.firedMask[ev.r * 8 + ev.c] = 1;
        if (fx.inWalk) {
          if (fx.chR >= 0 && (fx.chR !== ev.r || fx.chC !== ev.c) && fx.out) {
            fx.out({ t: 'CHAIN', from: { r: fx.chR, c: fx.chC }, to: { r: ev.r, c: ev.c } });
          }
          fx.chR = ev.r; fx.chC = ev.c;
        }
      }
      if (fx.out) fx.out(ev);
    },
    neighbor(dr, dc) {
      const rig = run.rig;
      const r = ctx.r + dr, c = ctx.c + dc;
      if (!rig || !rig.cells || r < 0 || c < 0 || r >= rig.rows || c >= rig.cols) return null;
      const id = rig.cells[r] && rig.cells[r][c];
      return typeof id === 'string' && getPart(id) ? { partId: id, r, c } : null;
    },
    hasFired(r, c) { return fx.firedMask[r * 8 + c] === 1; },
    // Hand a copy of an item to another lane. It continues upward from this row.
    spawn(lane, item) {
      if (fx.qLen >= MAX_QUEUE) return;
      const q = fx.queue[fx.qLen] || (fx.queue[fx.qLen] = {});
      q.lane = lane; q.row = ctx.r; q.item = item; q.skipR = ctx.r; q.skipC = ctx.c;
      q.fromR = ctx.r; q.fromC = ctx.c;
      fx.qLen++;
    },
  };
  return ctx;
}

// Look at the rig once and sort the parts into the lists the walker needs.
function prepare(run, fx) {
  const rig = run.rig;
  if (fx.rig === rig && fx.cols === (rig && rig.cols)) return;
  fx.rig = rig; fx.cols = rig && rig.cols;
  fx.cells.length = 0; fx.hazCells.length = 0; fx.pre.length = 0; fx.post.length = 0;
  if (!rig || !Array.isArray(rig.cells)) return;
  const rows = Math.min(num(rig.rows, 0), 8), cols = Math.min(num(rig.cols, 0), 8);
  for (let r = 0; r < rows; r++) {
    fx.pre[r] = []; fx.post[r] = [];
    for (let c = 0; c < cols; c++) {
      const id = rig.cells[r] && rig.cells[r][c];
      const def = getPart(id);
      if (!def) continue;
      const cell = { r, c, def };
      fx.cells.push(cell);
      if (def.onItem) (def.family === 'collector' || def.collects ? fx.post[r] : fx.pre[r]).push(cell);
      if (def.onHazard) fx.hazCells.push(cell);
    }
  }
  fx.hazCells.sort((a, b) => (a.def.hazardPriority || 3) - (b.def.hazardPriority || 3));
}

function setCtx(fx, cell, lane) {
  const ctx = fx.ctx;
  ctx.r = cell.r; ctx.c = cell.c; ctx.partId = cell.def.id;
  ctx.lane = lane === undefined ? cell.c : lane;
  ctx.dLane = ctx.lane - cell.c;
  return ctx;
}

function safe(fn, a, b) {
  try { return { ok: true, v: fn(a, b) }; } catch (e) {
    log.warn('part error', e && e.message);
    return { ok: false, v: undefined };
  }
}

// Called first each beat. Parts tick (strain, speed, cooldowns).
export function beginBeat(run, emit, rng) {
  const fx = ensureFx(run);
  try {
    fx.out = emit; fx.inWalk = false; fx.ctx.rng = rng || null;
    prepare(run, fx);
    fx.speedAdd = 0; fx.strainDelta = 0; fx.bonusValue = 0; fx.fired = 0;
    fx.firedMask.fill(0); fx.doubleRow.fill(0); fx.reveal.fill(0);
    fx.nCollected = 0; fx.nMissed = 0; fx.nHazards = 0; fx.qLen = 0;
    for (let i = 0; i < fx.cells.length; i++) {
      const cell = fx.cells[i];
      if (cell.def.onBeat) safe(cell.def.onBeat, setCtx(fx, cell));
    }
  } catch (e) { log.warn('beginBeat failed', e && e.message); }
  return fx;
}

function record(list, n, fields) {
  const rec = list[n] || (list[n] = {});
  for (const k in fields) rec[k] = fields[k];
  return rec;
}

// One item rises up one lane. Fills fx.collected, fx.missed or fx.hazards.
export function processLane(run, lane, item, emit, rng) {
  const fx = ensureFx(run);
  try {
    if (!item || typeof item !== 'object' || !Number.isInteger(lane) || lane < 0) return;
    fx.out = emit; fx.ctx.rng = rng || fx.ctx.rng;
    prepare(run, fx);
    if (Object.isFrozen(item)) item = Object.assign({}, item);
    item.tier = Math.min(6, Math.max(1, Math.floor(num(item.tier, 1))));
    item.value = capValue(Math.max(0, num(item.value, 0)));
    item.collected = false;
    const rows = fx.pre.length;
    fx.qLen = 0;
    const q0 = fx.queue[0] || (fx.queue[0] = {});
    q0.lane = lane; q0.row = rows - 1; q0.item = item; q0.skipR = -1; q0.skipC = -1; q0.fromR = -1; q0.fromC = -1;
    fx.qLen = 1;
    for (let qi = 0; qi < fx.qLen && qi < MAX_QUEUE; qi++) walk(run, fx, fx.queue[qi]);
    fx.qLen = 0;
  } catch (e) { log.warn('processLane failed', e && e.message); }
  fx.inWalk = false;
}

function inReach(list, d) {
  for (let i = 0; i < list.length; i++) if (list[i] === d) return true;
  return false;
}

function walk(run, fx, q) {
  let item = q.item;
  const lane = q.lane;
  fx.inWalk = true; fx.chR = q.fromR; fx.chC = q.fromC;
  for (let row = q.row; row >= 0; row--) {
    for (let pass = 0; pass < 2; pass++) {
      const list = pass === 0 ? fx.pre[row] : fx.post[row];
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const cell = list[i];
        if (cell.r === q.skipR && cell.c === q.skipC) continue;
        const def = cell.def;
        if (!inReach(def.reach, lane - cell.c)) continue;
        const times = fx.doubleRow[row] && def.family === 'processor' ? 2 : 1;
        for (let t = 0; t < times; t++) {
          const res = safe(def.onItem, setCtx(fx, cell, lane), item);
          if (!res.ok) continue;
          if (res.v === null) { fx.inWalk = false; return; } // the part removed the item
          if (res.v && typeof res.v === 'object') item = res.v;
          if (item.collected) {
            record(fx.collected, fx.nCollected++, { item, lane, r: cell.r, c: cell.c, echo: false });
            fx.inWalk = false; return;
          }
        }
      }
    }
  }
  fx.inWalk = false;
  if (item.kind === 'hazard') record(fx.hazards, fx.nHazards++, { lane, item, absR: -1, absC: -1, blasted: false });
  else if (item.kind !== 'empty') record(fx.missed, fx.nMissed++, { lane, item });
}

// After every lane is done: after-grab hooks, then dangers.
export function finishBeat(run, emit, rng) {
  const fx = ensureFx(run);
  try {
    fx.out = emit; fx.inWalk = false; fx.ctx.rng = rng || fx.ctx.rng;
    prepare(run, fx);
    const n0 = fx.nCollected;
    for (let i = 0; i < n0; i++) {
      const rec = fx.collected[i];
      for (let k = 0; k < fx.cells.length; k++) {
        const cell = fx.cells[k];
        if (cell.def.onCollect) safe((c, r) => cell.def.onCollect(c, r), setCtx(fx, cell, rec.lane), rec);
      }
    }
    for (let k = 0; k < fx.cells.length; k++) {
      const cell = fx.cells[k];
      if (cell.def.onBeatEnd) safe((c, n) => cell.def.onBeatEnd(c, n), setCtx(fx, cell), n0);
    }
    settleHazards(run, fx);
  } catch (e) { log.warn('finishBeat failed', e && e.message); }
  return fx;
}

function settleHazards(run, fx) {
  const gold = num(run.mods && run.mods.hazardGold, 0);
  // Pass 1: blockers (Plate, Shield).
  for (let i = 0; i < fx.nHazards; i++) {
    const rec = fx.hazards[i];
    for (let k = 0; k < fx.hazCells.length && rec.absR < 0; k++) {
      const cell = fx.hazCells[k];
      if (cell.def.blastsDangers || !inReach(cell.def.hazardReach, rec.lane - cell.c)) continue;
      const res = safe((c, h) => cell.def.onHazard(c, h), setCtx(fx, cell, rec.lane), rec.item);
      if (res.ok && res.v === true) { rec.absR = cell.r; rec.absC = cell.c; if (gold > 0) fx.bonusValue += gold; }
    }
  }
  // Pass 2: Fuses. A blown-up danger can set off the Fuse in its own column.
  fx.fqLen = 0;
  for (let i = 0; i < fx.nHazards; i++) if (fx.hazards[i].absR < 0) fx.fuseQueue[fx.fqLen++] = fx.hazards[i];
  for (let qi = 0; qi < fx.fqLen && qi < 64; qi++) {
    const rec = fx.fuseQueue[qi];
    for (let k = 0; k < fx.hazCells.length; k++) {
      const cell = fx.hazCells[k];
      if (!cell.def.blastsDangers || !inReach(cell.def.hazardReach, rec.lane - cell.c)) continue;
      const before = fx.nHazards;
      safe((c, h) => cell.def.onHazard(c, h), setCtx(fx, cell, rec.lane), rec.item);
      if (gold > 0) { /* blasted dangers pay the twist bonus too */
        for (let j = 0; j < before; j++) if (fx.hazards[j].blasted && !fx.hazards[j].paid) { fx.hazards[j].paid = true; fx.bonusValue += gold; }
      }
    }
  }
  for (let i = 0; i < fx.nHazards; i++) fx.hazards[i].paid = false;
}

// Apply passive() of every placed part. Returns a NEW mods object.
export function applyPassives(rig, mods) {
  let out = Object.assign({}, mods);
  try {
    if (!rig || !Array.isArray(rig.cells)) return out;
    for (let r = 0; r < Math.min(num(rig.rows, 0), 8); r++) {
      for (let c = 0; c < Math.min(num(rig.cols, 0), 8); c++) {
        const def = getPart(rig.cells[r] && rig.cells[r][c]);
        if (def && def.passive) {
          const next = def.passive(out);
          if (next && typeof next === 'object') out = next;
        }
      }
    }
  } catch (e) { log.warn('applyPassives failed', e && e.message); }
  return out;
}

export { stateOf, isLoot };
