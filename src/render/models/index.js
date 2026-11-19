// Sprite registry for the baked 3D models.
//   models.bake(keys, size, quality, opts)  queue the work (never blocks)
//   models.getSprite(key, frame)            -> { img, x, y, w, h } or null   (draw with drawImage(img, x, y, w, h, ...))
//   models.ready(key?)                      true when everything (or that key) is baked
// Baking is spread over many game frames (about 5 ms each). If the canvas API is missing, everything returns null
// and the old flat art keeps working.
import { DEFS, ALL_KEYS } from './defs.js';
import { planBake, sliceBudgetMs } from './plan.js';
import { createAtlas } from './atlas.js';
import { fitCamera, createFrameJob } from './bake.js';
import { makeCanvas } from '../canvasUtil.js';

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

export function createModels(options = {}) {
  const auto = options.auto !== false;
  let atlases = new Map(), sigs = new Map(), enabled = true, entries = new Map(), queue = [], job = null, timer = 0, bakeMs = 0, total = 0, doneCount = 0, lastFrameMs = 16, failed = false;
  const canvasFn = options.makeCanvas || makeCanvas;

  function supported() {
    try { const c = canvasFn(2, 2); const g = c && c.getContext && c.getContext('2d'); return !!(g && g.createImageData && g.putImageData); } catch (e) { return false; }
  }

  function reset() {
    if (timer && typeof cancelAnimationFrame === 'function') try { cancelAnimationFrame(timer); } catch (e) { /* ignore */ }
    timer = 0; atlases = new Map(); sigs = new Map(); entries = new Map(); queue = []; job = null; bakeMs = 0; total = 0; doneCount = 0; failed = false;
  }

  // keys: array of model keys (or null for all). size: item sprite size in device pixels.
  // opts: { seed, bucket: { w, h, innerW, innerH } } sizes in device pixels.
  function bake(keys, size, quality = 'high', opts = {}) {
    try {
      if (!supported()) { failed = true; return false; }
      const list = keys && keys.length ? keys.filter((k) => DEFS[k]) : ALL_KEYS;
      const s = list.join(',') + '|' + Math.round(size) + '|' + quality + '|' + (opts.seed || 1) + '|' + (opts.bucket ? [opts.bucket.w, opts.bucket.h].join('x') : '');
      const group = opts.group || 'items';
      if (sigs.get(group) === s && !failed) return true;
      sigs.set(group, s); failed = false;
      for (const [k, e] of entries) if (e.group === group) entries.delete(k); // replace this group only
      queue = queue.filter((q) => q.e.group !== group); if (job && job.item.e.group === group) job = null;
      const { plan } = planBake(list, size, quality, opts.bucket || null);
      const atlas = createAtlas(2048, canvasFn); atlases.set(group, atlas);
      const classCount = new Map();
      for (const p of plan) classCount.set(p.w + 'x' + p.h, (classCount.get(p.w + 'x' + p.h) || 0) + p.frames);
      for (const [k, n] of classCount) { const [w, h] = k.split('x').map(Number); atlas.declare(w, h, n); }
      for (const p of plan) {
        const e = { group, atlas, key: p.key, w: p.w, h: p.h, frames: p.frames, ss: p.ss, seed: opts.seed || 1, bucket: opts.bucket || null, regions: [], done: 0 };
        for (let f = 0; f < p.frames; f++) { e.regions.push({ img: null, x: 0, y: 0, w: p.w, h: p.h, ready: false }); queue.push({ e, f }); }
        entries.set(p.key, e);
      }
      total = queue.length + doneCount;
      queue.sort((a, b) => a.f - b.f); // first frame of every model first: everything shows something early
      if (auto) schedule();
      return true;
    } catch (err) { failed = true; return false; }
  }

  function meshFor(e) {
    const d = DEFS[e.key], o = d.size === 'bucket' ? { aspect: e.bucket ? e.bucket.innerW / e.bucket.innerH : 248 / 208, tilt: d.tilt, part: d.part } : undefined;
    return d.build(e.seed, o);
  }
  function startJob(item) {
    const e = item.e, d = DEFS[e.key];
    if (!e.mesh) {
      e.mesh = meshFor(e);
      const fitMesh = d.part ? d.build(e.seed, { aspect: e.bucket ? e.bucket.innerW / e.bucket.innerH : 248 / 208, tilt: d.tilt, part: 'all' }) : e.mesh;
      const fill = d.size === 'bucket' && e.bucket ? e.bucket.innerW / e.bucket.w : d.fill;
      e.cam = fitCamera(Object.assign({}, d, { fill }), fitMesh, e.w, e.h);
    }
    const slot = e.atlas.reserve(e.w, e.h);
    if (!slot) return null;
    return { item, slot, run: createFrameJob(d, e.mesh, e.cam, e.w, e.h, e.ss, item.f, e.frames, Math.max(8, Math.round(16000 / (e.w * e.ss)))) };
  }

  // Do up to budgetMs of baking. Returns how many frames are still waiting.
  function step(budgetMs = 5) {
    if (!queue.length && !job) return 0;
    const t0 = now();
    try {
      while (now() - t0 < budgetMs && (job || queue.length)) {
        if (!job) { const item = queue.shift(); job = startJob(item); if (!job) { doneCount++; continue; } }
        if (job.run.step()) {
          const { item, slot } = job, e = item.e;
          if (e.atlas.write(slot, job.run.pixels, e.w, e.h)) { const r = e.regions[item.f]; r.img = slot.page.canvas; r.x = slot.x; r.y = slot.y; r.ready = true; e.done++; }
          doneCount++; job = null;
          if (e.done + 0 >= e.frames) e.mesh = null; // free the mesh when the model is complete
        }
      }
    } catch (err) { failed = true; queue = []; job = null; }
    bakeMs += now() - t0;
    return queue.length + (job ? 1 : 0);
  }

  function schedule() {
    if (timer || failed) return;
    const tick = () => {
      timer = 0;
      const t = now();
      if (step(sliceBudgetMs(lastFrameMs)) > 0) { lastFrameMs = Math.max(lastFrameMs * 0.9, 1); timer = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(tick) : setTimeout(tick, 16); }
      void t;
    };
    timer = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(tick) : setTimeout(tick, 16);
  }

  return {
    supported, bake, step, reset, keys: () => ALL_KEYS.slice(),
    // The renderer can tell us how long its last frame took, so baking backs off when the game is busy.
    noteFrame(ms) { if (Number.isFinite(ms)) lastFrameMs = ms; },
    ready(key) {
      if (failed || !enabled || entries.size === 0) return false;
      if (key) { const e = entries.get(key); return !!e && e.done >= e.frames; }
      return queue.length === 0 && !job;
    },
    // The renderer turns baked art on (high quality) or off (low quality: the old flat art is used).
    setEnabled(on) { enabled = !!on; },
    get enabled() { return enabled && !failed; },
    frameCount(key) { const e = entries.get(key); return e ? e.frames : 0; },
    // Frame numbers wrap, so callers can just count up. Returns null until that frame is baked.
    getSprite(key, frame = 0) {
      if (!enabled) return null;
      const e = entries.get(key); if (!e || e.regions.length === 0) return null;
      const n = e.regions.length, i = ((Math.floor(frame) % n) + n) % n, r = e.regions[i];
      return r.ready ? r : null;
    },
    progress() { return total ? Math.min(1, doneCount / total) : 0; },
    stats() { let bytes = 0, pages = 0; for (const a of atlases.values()) { bytes += a.bytes; pages += a.pageCount; } return { bytes, pages, bakeMs, frames: total, done: doneCount, failed }; },
  };
}

// The one shared registry the game uses.
export const models = createModels();
