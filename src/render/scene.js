// Shared visual state: layout, rising items, scheduled flashes, rings, timers.
import { createPool } from './pool.js';
import { createLayout } from './layout.js';

export function createScene() {
  const sc = {
    L: createLayout(),
    time: 0, timeScale: 1, slowT: 0,
    beatCount: 0, beatPos: 0, alpha: 0, depthBase: 0, speed: 1, depthVis: 0,
    haulT: -1, snapped: false, hauled: false,
    flashA: 0, flashColor: '#fff', flashTimes: [0, 0, 0], reduceMotion: false,
    strain01: 0, status: 'idle', biomeId: 'clay', combo: 0, gold: 0,
    rig: { cols: 4, rows: 3, cells: [] },
    milestoneT: -1,
    // rising things (gems, ore, hazards, relics)
    items: createPool(48, () => ({ kind: 'gem', tier: 1, hazard: null, lane: 0, spawn: 0, state: 0, out: 0, gold: 0, combo: 0, r: 0, c: 0, ar: -1, ac: -1, sd: 0, t: 0, x: 0, y: 0, sx: 0, sy: 0, seed: 0, fade: 1 })),
    // things to do when an item arrives (part flashes, chain threads)
    due: createPool(96, () => ({ type: 0, at: 0, r: 0, c: 0, r2: 0, c2: 0 })),
    threads: createPool(8, () => ({ r: 0, c: 0, r2: 0, c2: 0, life: 0 })),
    rings: createPool(14, () => ({ x: 0, y: 0, r0: 4, r1: 40, life: 0, max: 300, color: '#fff', w: 2 })),
    streaks: createPool(30, () => ({ x: 0, y: 0, len: 20, v: 600, life: 0 })),
    reset() {
      sc.items.clear(); sc.due.clear(); sc.threads.clear(); sc.rings.clear(); sc.streaks.clear();
      sc.beatCount = 0; sc.beatPos = 0; sc.alpha = 0; sc.depthBase = 0; sc.speed = 1; sc.depthVis = 0;
      sc.haulT = -1; sc.snapped = false; sc.hauled = false; sc.flashA = 0; sc.slowT = 0; sc.timeScale = 1; sc.milestoneT = -1; sc.strain01 = 0;
    },
  };
  return sc;
}
