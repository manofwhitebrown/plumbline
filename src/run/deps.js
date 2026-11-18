// The ONE place where src/run/ reaches other AIs' modules.
// Core files that exist are imported normally. Engine, meta, save and loop are picked up
// with Vite's import.meta.glob, so a missing file never breaks the build (we fail soft instead).
// Tests swap pieces with setDeps().
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { now } from '../core/clock.js';
import { fmt } from '../core/format.js';
import { makeRng } from '../core/rng.js';

function safeGlob(load) {
  try { return load() || {}; } catch (e) { return {}; } // in plain Node there is no glob
}

// Join the exports of all matched files into one object.
function merge(globbed) {
  const out = {};
  for (const mod of Object.values(globbed)) {
    for (const key of Object.keys(mod || {})) if (key !== 'default') out[key] = mod[key];
  }
  return out;
}

const globs = {
  save: safeGlob(() => import.meta.glob('../core/save.js', { eager: true })),
  loop: safeGlob(() => import.meta.glob('../core/loop.js', { eager: true })),
  engine: safeGlob(() => import.meta.glob('../engine/*.js', { eager: true })),
  engineData: safeGlob(() => import.meta.glob('../data/engine.js', { eager: true })),
  parts: safeGlob(() => import.meta.glob(['../engine/parts/*.js', '../data/parts.js'], { eager: true })),
  meta: safeGlob(() => import.meta.glob('../meta/*.js', { eager: true })),
};

export const DEFAULT_MODS = Object.freeze({
  maxStrain: 100, keepOnSnap: 0.3, goldMult: 1, strainMult: 1, luck: 0, startDepth: 0,
  cols: 4, rows: 3, unlockedParts: ['hook'], twist: null, cheat: null,
});

// Used only when the meta game is not there yet. Keeps the screens alive.
const inertMeta = {
  getMods: () => ({ ...DEFAULT_MODS }),
  ownedParts: () => ({ hook: 1 }),
  addGold() {}, addShards() {},
  stats: { get: () => ({}) },
};

function findMeta(m) {
  if (m.meta && typeof m.meta === 'object') return m.meta;
  return typeof m.getMods === 'function' ? m : inertMeta;
}

// A tiny in-memory save, used only if core/save.js is missing.
function memorySave() {
  const slices = {};
  return {
    registerSlice(name, spec) { slices[name] = JSON.parse(JSON.stringify(spec.defaults || {})); },
    getSlice(name) { return slices[name] || (slices[name] = {}); },
    markDirty() {}, saveNow() {},
  };
}

function build() {
  const e = merge(globs.engine);
  const d = merge(globs.engineData);
  const p = merge(globs.parts);
  const saveMod = merge(globs.save);
  const loopMod = merge(globs.loop);
  return {
    bus, log, now, fmt, makeRng,
    engine: typeof e.createRun === 'function' && typeof e.stepBeat === 'function' ? e : null,
    detectCombos: e.detectCombos || p.detectCombos || null,
    getPart: p.getPart || e.getPart || null,
    baseBeatMs: Number(d.BEAT_MS || d.BASE_BEAT_MS || d.beatMs) || 450,
    meta: findMeta(merge(globs.meta)),
    save: typeof saveMod.registerSlice === 'function' ? saveMod : memorySave(),
    createLoop: typeof loopMod.createLoop === 'function' ? loopMod.createLoop : null,
  };
}

export const deps = build();
const original = { ...deps };

export function setDeps(overrides = {}) { Object.assign(deps, overrides); }
export function resetDeps() { Object.assign(deps, original); }

// Call a method that may not exist. Never throws. Returns undefined on any problem.
export function call(obj, name, ...args) {
  try {
    if (obj && typeof obj[name] === 'function') return obj[name](...args);
  } catch (err) {
    deps.log.warn('run: ' + name + ' failed', err && err.message);
  }
  return undefined;
}

export default deps;
