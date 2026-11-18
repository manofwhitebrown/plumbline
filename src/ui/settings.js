// Player settings. Saved in the 'settings' slice. Works even if saving is not ready yet.
import { log, dep } from './soft.js';

export const DEFAULTS = {
  version: 1,
  sound: true, sfx: 0.8, music: 0.6,
  haptics: true,
  reduceMotion: false, largeText: false, colorblind: false,
  quality: 'high',
  loadoutNames: ['Loadout 1', 'Loadout 2', 'Loadout 3'],
};

let data = { ...DEFAULTS };
let slice = null;
const listeners = new Set();

function clean(src, base) {
  const out = { ...(base || DEFAULTS) };
  if (!src || typeof src !== 'object') return out;
  for (const k of ['sound', 'haptics', 'reduceMotion', 'largeText', 'colorblind']) {
    if (typeof src[k] === 'boolean') out[k] = src[k];
  }
  for (const k of ['sfx', 'music']) {
    if (Number.isFinite(src[k])) out[k] = Math.min(1, Math.max(0, src[k]));
  }
  if (src.quality === 'high' || src.quality === 'low') out.quality = src.quality;
  if (Array.isArray(src.loadoutNames)) {
    out.loadoutNames = DEFAULTS.loadoutNames.map((d, i) => {
      const n = src.loadoutNames[i];
      return typeof n === 'string' && n.trim() ? n.trim().slice(0, 14) : d;
    });
  }
  return out;
}

// Connect to the save system when it exists (boot.js hands it in).
export function initSettings() {
  try {
    const save = dep('save');
    if (!save) return data;
    save.registerSlice('settings', { version: 1, defaults: { ...DEFAULTS }, migrate: (old) => clean(old) });
    slice = { get: () => save.getSlice('settings'), dirty: () => save.markDirty('settings') };
    data = clean(slice.get());
    Object.assign(slice.get(), data);
  } catch (e) {
    log.warn('settings: save not ready, using memory only');
  }
  return data;
}

export function getSettings() {
  return data;
}

export function setSetting(key, value) {
  if (!(key in DEFAULTS) || key === 'version') return false;
  const next = clean({ ...data, [key]: value }, data); // bad values keep the old one
  if (JSON.stringify(next[key]) === JSON.stringify(data[key])) return false;
  data = next;
  if (slice) {
    try { Object.assign(slice.get(), data); slice.dirty(); } catch (e) { log.warn('settings: save failed'); }
  }
  for (const fn of listeners) {
    try { fn(data, key); } catch (e) { log.error('settings listener', e); }
  }
  return true;
}

export function onSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Put the settings on the page as attributes so CSS can react.
export function applySettings(root) {
  if (!root || !root.dataset) return;
  root.dataset.reduce = data.reduceMotion ? '1' : '0';
  root.dataset.large = data.largeText ? '1' : '0';
  root.dataset.cb = data.colorblind ? '1' : '0';
}

export function _resetSettingsForTests() {
  data = { ...DEFAULTS };
  slice = null;
  listeners.clear();
}
