// Tutorial entry point (CONTRACT section 11). New saves only. Skippable. Never shown twice.
import { registerSlice, getSlice, markDirty } from '../core/save.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { createFlow } from './flow.js';
import { createOverlay } from './overlay.js';
import { makeFinder } from './target.js';
import { emptyRig } from './suggest.js';
import { FIRST_DROP_SEED, SAFE_DEPTH, isFirstDropStep } from './steps.js';

registerSlice('tutorial', {
  version: 1,
  defaults: { done: false, skipped: false, stepId: '' },
  migrate: (old) => old,
});

let flow = null;
let overlay = null;

const store = {
  get: () => getSlice('tutorial') || { done: true, skipped: false, stepId: '' },
  set(patch) {
    const s = getSlice('tutorial');
    if (!s) return;
    Object.assign(s, patch);
    markDirty('tutorial');
  },
};

// An old save has played before. We only teach brand new players.
function hasPlayedBefore() {
  const run = getSlice('run');
  const look = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 3) return false;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'number' && v > 0 && /best|depth|runs|drops|total|count|games/i.test(k)) return true;
      if (look(v, depth + 1)) return true;
    }
    return false;
  };
  return look(run, 0);
}

export const tutorial = {
  // Call once when the game has loaded. Does nothing for finished or skipped tutorials.
  start() {
    try {
      if (flow && flow.isActive()) return true;
      const s = store.get();
      if (s.done || s.skipped) return false;
      if (!s.stepId && hasPlayedBefore()) {
        store.set({ done: true });
        return false;
      }
      if (typeof document === 'undefined') return false;
      overlay = createOverlay(document, typeof window !== 'undefined' ? window : null);
      flow = createFlow({
        bus,
        overlay,
        find: makeFinder(document, { stable: true }),
        store,
        log,
        timers: { setTimeout: (f, ms) => { const h = setTimeout(f, ms); if (h && h.unref) h.unref(); return h; }, clearTimeout: (t) => clearTimeout(t), now: () => Date.now() },
      });
      bus.on('tutorial:done', () => overlay && overlay.destroy());
      flow.start(s.stepId || null);
      return true;
    } catch (e) {
      log.error('tutorial start failed', e);
      return false;
    }
  },

  // Safe to call twice. The slice is registered when this file loads, so there is little to do.
  init() {
    try { store.get(); } catch (e) { log.warn('tutorial init failed', e); }
    return true;
  },

  // True until the tutorial is finished or skipped, and only for a player who has not played yet.
  shouldStart() {
    try {
      const s = store.get();
      if (s.done || s.skipped) return false;
      return !!s.stepId || !hasPlayedBefore();
    } catch (e) { return false; }
  },

  isActive() {
    return !!(flow && flow.isActive());
  },

  skip() {
    try {
      if (flow) flow.skip();
      else store.set({ skipped: true, done: true });
      if (overlay) overlay.destroy();
    } catch (e) {
      log.error('tutorial skip failed', e);
    }
  },

  // Options for the first drop only: a fixed seed, a ready rig, and no Snap before 40 m.
  // The Drop button passes these to session.start. Returns null at any other time.
  runOptions() {
    try {
      if (!flow || !flow.isActive() || !isFirstDropStep(flow.currentId())) return null;
      const rig = emptyRig(4, 3);
      rig.cells[2][1] = 'hook';
      return { tutorial: true, seed: FIRST_DROP_SEED, safeUntilDepth: SAFE_DEPTH, rig };
    } catch (e) {
      return null;
    }
  },

  _debug() {
    return { active: tutorial.isActive(), step: flow ? flow.currentId() : null, slice: { ...store.get() } };
  },
};

export default tutorial;
