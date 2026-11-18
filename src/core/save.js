// Save system. Each module registers a "slice" (its own part of the save).
// The save file is one envelope: { v, slices: { name: { v, data } } }.
// Rules: never throw, never lose data we cannot read (it goes to <key>.corrupt), keep working without localStorage.
import { log } from './log.js';
import { bus } from './bus.js';
import { now } from './clock.js';
import { pickStorage, makeMemoryStorage } from './storage.js';

const ENVELOPE_V = 1;
const MAX_BYTES = 5 * 1024 * 1024;
const EXPORT_PREFIX = 'PL1.';

let KEY = 'plumbline.save';
let AUTOSAVE_MS = 10000;
let storage = null;          // chosen lazily
let loaded = false;
let raw = {};                // slices read from storage: name -> { v, data }
const slices = new Map();    // name -> { def, data }
const lastGood = new Map();  // name -> last JSON text that worked
let dirty = false;
let timer = null;
let lifecycleOn = false;

const clone = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

function store() {
  if (!storage) storage = pickStorage();
  return storage;
}

// ---- loading ----

// Keep unreadable text so a human (or a later fix) can still recover it.
function keepCorrupt(text) {
  try { store().setItem(KEY + '.corrupt', text); } catch (err) { log.warn('could not keep corrupt copy', err); }
}

// Check the envelope shape. Returns the slices map, or null.
function readEnvelope(obj) {
  if (!isObj(obj) || typeof obj.v !== 'number' || !isObj(obj.slices)) return null;
  const out = {};
  for (const name of Object.keys(obj.slices)) {
    const s = obj.slices[name];
    if (isObj(s) && typeof s.v === 'number' && Number.isFinite(s.v) && isObj(s.data)) out[name] = { v: s.v, data: s.data };
    else log.warn(`save slice "${name}" is broken and was skipped`);
  }
  return out;
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  let text = null;
  try { text = store().getItem(KEY); } catch (err) { log.warn('could not read the save', err); }
  if (text == null || text === '') return;
  try {
    const env = readEnvelope(JSON.parse(text));
    if (!env) throw new Error('save has the wrong shape');
    raw = env;
  } catch (err) {
    log.error('save is unreadable, starting fresh', err);
    keepCorrupt(text);
    raw = {};
    dirty = true; // write fresh defaults over the broken save
  }
}

// Turn stored { v, data } into live data for a slice: migrate if old, fill missing keys.
function buildData(def, stored) {
  const defaults = isObj(def.defaults) ? def.defaults : {};
  if (!stored) return clone(defaults);
  let data = stored.data;
  try {
    if (stored.v < def.version && typeof def.migrate === 'function') {
      const moved = def.migrate(clone(data), stored.v);
      if (isObj(moved)) data = moved;
      else throw new Error('migrate did not return an object');
    } else if (stored.v > def.version) {
      log.warn(`save slice is from a newer version (${stored.v} > ${def.version}); using it as is`);
    }
  } catch (err) {
    log.error('migration failed, using defaults for this slice', err);
    return clone(defaults);
  }
  const out = clone(data);
  for (const k of Object.keys(defaults)) if (!(k in out)) out[k] = clone(defaults[k]); // fill new keys
  return out;
}

function fillInPlace(target, data) {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, data);
}

// ---- public API ----

export function registerSlice(name, def) {
  try {
    if (typeof name !== 'string' || !name || !def) { log.warn('registerSlice needs a name and a definition'); return null; }
    ensureLoaded();
    installLifecycle();
    const clean = { version: Number.isFinite(def.version) ? def.version : 1, defaults: def.defaults, migrate: def.migrate };
    const existing = slices.get(name);
    if (existing) { existing.def = clean; return existing.data; } // registered twice (hot reload): keep live data
    const stored = raw[name];
    slices.set(name, { def: clean, data: buildData(clean, stored) });
    delete raw[name];
    if (!stored || stored.v !== clean.version) markDirty(name); // first run or migrated: write it out
    return slices.get(name).data;
  } catch (err) {
    log.error('registerSlice failed', err);
    return null;
  }
}

export function getSlice(name) {
  const s = slices.get(name);
  if (!s) { log.warn(`getSlice: "${name}" is not registered`); return null; }
  return s.data;
}

export function markDirty(name) {
  if (name !== undefined && !slices.has(name)) log.warn(`markDirty: "${name}" is not registered`);
  dirty = true;
  if (timer === null) {
    try {
      timer = setTimeout(() => { timer = null; if (dirty) saveNow(); }, AUTOSAVE_MS);
      if (timer && typeof timer.unref === 'function') timer.unref(); // do not keep Node alive in tests
    } catch (err) { log.warn('autosave timer failed', err); }
  }
}

// Build the envelope text one slice at a time, so one bad slice cannot lose the rest.
function buildText() {
  const parts = [];
  for (const [name, s] of slices) {
    let body;
    try {
      body = JSON.stringify({ v: s.def.version, data: s.data });
      lastGood.set(name, body);
    } catch (err) {
      log.error(`slice "${name}" could not be saved, keeping its last good copy`, err);
      body = lastGood.get(name);
      if (!body) continue;
    }
    parts.push(`${JSON.stringify(name)}:${body}`);
  }
  for (const name of Object.keys(raw)) { // slices nobody registered yet: keep them
    try { parts.push(`${JSON.stringify(name)}:${JSON.stringify(raw[name])}`); } catch { /* skip */ }
  }
  return `{"v":${ENVELOPE_V},"t":${Math.floor(now())},"slices":{${parts.join(',')}}}`;
}

export function saveNow() {
  try {
    ensureLoaded();
    if (timer !== null) { clearTimeout(timer); timer = null; }
    const text = buildText();
    try {
      store().setItem(KEY, text);
    } catch (err) {
      // Probably full. Drop the corrupt copy and try once more.
      try { store().removeItem(KEY + '.corrupt'); store().setItem(KEY, text); }
      catch (err2) { log.error('could not write the save', err2); return false; }
    }
    dirty = false;
    return true;
  } catch (err) {
    log.error('saveNow failed', err);
    return false;
  }
}

function resetOne(name, s) {
  fillInPlace(s.data, clone(isObj(s.def.defaults) ? s.def.defaults : {}));
}

export function resetAll() {
  try {
    ensureLoaded();
    for (const [name, s] of slices) resetOne(name, s);
    raw = {};
    lastGood.clear();
    dirty = true;
    saveNow();
    bus.emit('save:reset');
  } catch (err) {
    log.error('resetAll failed', err);
  }
}

// ---- export / import ----

function checksum(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function exportSave() {
  try {
    ensureLoaded();
    const text = buildText();
    return `${EXPORT_PREFIX}${checksum(text)}.${toBase64(text)}`;
  } catch (err) {
    log.error('exportSave failed', err);
    return '';
  }
}

export function importSave(code) {
  try {
    ensureLoaded();
    if (typeof code !== 'string') return { ok: false, error: 'Paste your save code first.' };
    const clean = code.replace(/\s+/g, '');
    if (!clean.startsWith(EXPORT_PREFIX)) return { ok: false, error: 'That is not a Plumbline save code.' };
    if (clean.length > MAX_BYTES * 1.4) return { ok: false, error: 'That save code is too big.' };
    const dot = clean.indexOf('.', EXPORT_PREFIX.length);
    if (dot < 0) return { ok: false, error: 'That save code looks cut off.' };
    const sum = clean.slice(EXPORT_PREFIX.length, dot);
    let text;
    try { text = fromBase64(clean.slice(dot + 1)); } catch { return { ok: false, error: 'That save code looks cut off.' }; }
    if (checksum(text) !== sum) return { ok: false, error: 'That save code looks damaged. Copy it again.' };
    let env;
    try { env = readEnvelope(JSON.parse(text)); } catch { env = null; }
    if (!env) return { ok: false, error: 'That save code could not be read.' };

    // Everything checked. Now replace the live save.
    const next = {};
    for (const [name, s] of slices) {
      next[name] = buildData(s.def, env[name]);
      delete env[name];
    }
    for (const [name, s] of slices) fillInPlace(s.data, next[name]);
    raw = env;           // slices nobody registered yet
    lastGood.clear();
    dirty = true;
    if (!saveNow()) return { ok: false, error: 'Your device could not store the save.' };
    bus.emit('save:imported');
    return { ok: true };
  } catch (err) {
    log.error('importSave failed', err);
    return { ok: false, error: 'Something went wrong. Nothing was changed.' };
  }
}

// ---- autosave on leave ----

function installLifecycle() {
  if (lifecycleOn) return;
  lifecycleOn = true;
  try {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', () => { if (dirty) saveNow(); });
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) saveNow(); });
    }
  } catch (err) { log.warn('could not watch page leave', err); }
}

// ---- for tests only ----

// Start fresh with a chosen storage. Clears every slice and timer.
export function _configure({ storage: st, key, autosaveMs } = {}) {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  slices.clear(); lastGood.clear(); raw = {}; loaded = false; dirty = false;
  storage = st || makeMemoryStorage();
  if (key) KEY = key;
  if (autosaveMs) AUTOSAVE_MS = autosaveMs;
}
export const _isDirty = () => dirty;

export const save = { registerSlice, getSlice, markDirty, saveNow, resetAll, exportSave, importSave };
export default save;
