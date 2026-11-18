// One place where screens reach the other AIs' modules. Each getter returns the real
// module, or a small safe stand-in so a screen still draws before that module is built.
import { dep, log } from './soft.js';

const iconCache = new Map();
const STARTER = { id: 'hook', name: 'Hook', family: 'collector', tags: ['collector'], desc: 'Collects the item in its lane.', cost: 0, unlock: { type: 'start', value: 0 } };

function emptyRig(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++) cells.push(new Array(cols).fill(null));
  return { cols, rows, cells };
}

const fallbackMeta = {
  gold: () => 0, shards: () => 0, coreDust: () => 0,
  getMods: () => ({ cols: 4, rows: 3, unlockedParts: ['hook'], maxStrain: 100, keepOnSnap: 0.3 }),
  ownedParts: () => ['hook'], canBuyPart: () => false, buyPart: () => ({ ok: false, error: 'Not ready yet.' }),
  addGold() {}, spendGold: () => false, addShards() {}, spendShards: () => false,
  crew: { list: () => [], buy: () => ({ ok: false }), perSecond: () => 0 },
  offline: { peek: () => null, claim: () => 0 },
  collapse: { available: () => false, preview: () => ({ coreDustGain: 0 }), do: () => ({ ok: false }) },
  upgrades: { list: () => [], buy: () => ({ ok: false }) },
  daily: { state: () => ({ streak: 0, canClaim: false, days: [] }), claim: () => ({ ok: false }) },
  quests: { list: () => [] }, achievements: { list: () => [] }, codex: { list: () => [], record() {} },
  stats: { get: () => ({ bestDepth: 0 }) }, tick() {},
};

const fallbackRigs = (() => {
  let rig = emptyRig(4, 3);
  return {
    getRig: () => rig,
    place: () => ({ ok: false, error: 'Not ready yet.' }), remove: () => ({ ok: true }), swap: () => ({ ok: true }),
    clear() { rig = emptyRig(4, 3); return { ok: true }; },
    validate: (r) => ({ ok: true, rig: r || rig }), preview: () => ({ combos: [], power: 0, warnings: [] }),
    loadouts: { save: () => ({ ok: true }), load: () => ({ ok: true }) },
  };
})();

const fallbackSession = {
  start: () => ({ ok: false }), haul: () => ({ ok: false }), pause() {}, resume() {}, abort() {},
  getView: () => ({ status: 'idle', depth: 0, gold: 0, strain: 0, maxStrain: 100, biomeId: 'clay', combo: 0, risk: { beatsToSnap: 9999, goldAtRisk: 0, keepIfSnap: 0 }, goals: [] }),
};

function pickOr(name, fallback) {
  const real = dep(name);
  if (real) return real;
  return fallback;
}

export const api = {
  get meta() { return pickOr('meta', fallbackMeta); },
  get rigs() { return pickOr('rigs', fallbackRigs); },
  get session() { return pickOr('session', fallbackSession); },
  get cheats() { return dep('cheats'); },
  get suggest() { return dep('suggest'); },
  get tutorial() { return dep('tutorial'); },
  get createRenderer() { return dep('createRenderer'); },
  get save() { return dep('save'); },
  // Icon as a picture address for <img>. Cached. If the renderer cannot make one
  // (OffscreenCanvas has no toDataURL), we draw it ourselves on a normal canvas.
  partIcon(id, size) {
    const px = Math.max(16, Math.min(256, Math.round(Number(size)) || 96));
    const key = id + ':' + px;
    const hit = iconCache.get(key);
    if (hit) return hit;
    let url = '';
    try {
      const p = dep('partIcon');
      if (p && typeof p.toDataURL === 'function') url = p.toDataURL(id, px) || '';
      if (!url && p && typeof p.draw === 'function' && typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = px; c.height = px;
        const g = c.getContext('2d');
        if (g) { p.draw(g, id, 0, 0, px, 'idle'); url = c.toDataURL('image/png'); }
      }
    } catch (e) { log.warn('partIcon failed', id); }
    if (url) iconCache.set(key, url);
    return url;
  },
  allParts() {
    try {
      const p = dep('parts');
      const list = p && typeof p.all === 'function' ? p.all() : null;
      return Array.isArray(list) && list.length ? list : [STARTER];
    } catch (e) { return [STARTER]; }
  },
  getPart(id) {
    try {
      const p = dep('parts');
      const got = p && typeof p.get === 'function' ? p.get(id) : null;
      if (got) return got;
    } catch (e) { /* fall through */ }
    return id === 'hook' ? STARTER : null;
  },
  emptyRig,
};
