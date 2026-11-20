// DEPTH-1: the deep-shaft layer. createDepth({ quality, reduceMotion }) ->
//   { resize(w, h, dpr), update(dtMs, state), drawWalls(ctx, state), drawForeground(ctx, state), pushEvents(events),
//     setQuality(q), setReduceMotion(v), destroy(), debug(), active }
// Quality ladder: 'high' all of it, 'medium' fewer slices and no motion blur, 'low' nothing (the renderer's flat well shows).
// Reduce motion also draws nothing. Every call is guarded: a bad frame is skipped and never throws into the game loop.
// The layer times itself; if it stays over its 3 ms budget it steps down one level on its own.
import { makeCanvas } from '../canvasUtil.js';
import * as artKit from '../art/index.js';
import { createAssets } from './assets.js';
import { createWalls } from './walls.js';
import { createForeground } from './foreground.js';
import { createDepthCam } from './camera.js';
import { createLight } from './light.js';
import { BIOME_EDGES, BUDGET_MS, GOV_FRAMES, CAM, LEVELS } from './constants.js';
import { fin, clamp, biomeIndexAt, biomeIndexOf, nextEdge } from './math.js';
import { BIOME_ORDER } from './constants.js';

const FADE_IN_MS = 450;
export const normQuality = (q) => (q === 'low' || q === 'medium' || q === 'high' ? q : 'high');

export function createDepth(opts) {
  const o = opts || {};
  let level = normQuality(o.quality), reduce = !!o.reduceMotion, dead = false, bad = 0;
  let W = 360, H = 640, dpr = 1, margin = 40, laneTop = 120, depthNow = 0, prevDepth = NaN, vel = 0, time = 0, fade = 0, bucketY = 240, forced = -1, danger = 0, laneCount = 4;
  let cost = 0, costFrame = 0, over = 0, demoted = false, releaseT = 0, drawnThisFrame = false;
  const mk = typeof o.makeCanvas === 'function' ? o.makeCanvas : makeCanvas;
  const now = typeof o.now === 'function' ? o.now : (typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now());
  const artTex = typeof o.wallTexture === 'function' ? o.wallTexture : (typeof artKit['wallTexture'] === 'function' ? artKit['wallTexture'] : null);
  const assets = createAssets({ mk, now, wallTexture: artTex });
  const light = createLight(), cam = createDepthCam({ reduceMotion: reduce }), walls = createWalls({ mk, assets, light }), fg = createForeground({ mk });
  const keep = [0, 0, 0];
  light.setReduceMotion(reduce); walls.setLevel(level === 'low' ? 'medium' : level);

  const flat = () => dead || reduce || level === 'low';
  function safe(fn) { try { return fn(); } catch (e) { if (++bad < 5 && typeof console !== 'undefined' && console.warn) console.warn('depth:', e && e.message); return undefined; } }

  // Read the renderer's state without trusting it.
  function read(st) {
    const s = st && typeof st === 'object' ? st : null;
    depthNow = clamp(fin(s && s.depth, depthNow), -100, 1e7);
    if (s && typeof s.biomeId === 'string' && BIOME_ORDER.includes(s.biomeId)) {
      const fi = biomeIndexOf(s.biomeId); forced = fi === biomeIndexAt(depthNow) ? -1 : fi; // a cheat that forces a biome off its depth
    } else forced = -1;
    danger = clamp(fin(s && s.danger, danger), 0, 1);
    bucketY = clamp(fin(s && s.bucket && s.bucket.y, bucketY), 0, 5000);
    laneTop = clamp(2 * bucketY - fin(s && s.arriveY, bucketY + 100) + 15, 60, H * 0.6); // top of the bucket, about
    const ln = s && s.lanes, n = fin(s && s.laneCount, laneCount);
    if (ln && n >= 2 && ln.length >= 2 && Number.isFinite(ln[0]) && Number.isFinite(ln[1])) { const sp = ln[1] - ln[0]; if (sp > 4) margin = clamp(ln[0] - sp / 2, 8, W * 0.4); laneCount = n; }
    else margin = W * 0.12;
  }
  function setLevel(l, auto) {
    if (l === level) return;
    level = l; walls.setLevel(l === 'low' ? 'medium' : l); over = 0; cost = 0;
    if (auto) demoted = true; else demoted = false;
  }
  function request() {
    const bi = forced >= 0 ? forced : biomeIndexAt(depthNow);
    assets.request(bi, 3);
    if (forced < 0) {
      if (nextEdge(depthNow) - depthNow < 40 && bi + 1 < BIOME_ORDER.length) assets.request(bi + 1, 2);
      if (bi > 0 && depthNow - BIOME_EDGES[bi - 1] < 6) assets.request(bi - 1, 1);
    }
  }

  const api = {
    get active() { return !flat() && walls.ready && assets.ready(forced >= 0 ? forced : biomeIndexAt(depthNow)); },
    resize(w, h, d) {
      if (dead) return;
      safe(() => { W = Math.max(1, fin(w, W)); H = Math.max(1, fin(h, H)); dpr = clamp(fin(d, 1) || 1, 1, 3); walls.setSize(W, H, dpr); assets.setSilScale(Math.min(dpr, 1.5)); });
    },
    update(dtMs, state) {
      if (dead) return;
      safe(() => {
        const t0 = now(), dt = clamp(fin(dtMs), 0, 250);
        read(state); time = fin(state && state.time, time + dt);
        // governor: last frame's cost, smoothed; step down when over budget for a while
        if (costFrame > 0) { cost = cost ? cost * 0.92 + costFrame * 0.08 : costFrame; costFrame = 0; }
        if (o.govern !== false && !flat() && cost > BUDGET_MS) { if (++over >= GOV_FRAMES) setLevel(level === 'high' ? 'medium' : 'low', true); } else over = Math.max(0, over - 2);
        // depth speed in m/s (a jump, such as a new run, counts as zero)
        const dD = depthNow - prevDepth;
        if (!Number.isFinite(prevDepth) || Math.abs(dD) > 3 || dt <= 0) vel = 0; else vel += (clamp(dD / dt * 1000, -60, 60) - vel) * 0.2;
        prevDepth = depthNow;
        if (flat()) { fade = 0; return; }
        cam.update(dt, fin(state && state.strain01));
        light.setBucket(bucketY, laneCount); light.update(dt, time);
        request(); assets.step(1.0);
        if ((releaseT += dt) > 2500) { releaseT = 0; const b = forced >= 0 ? forced : biomeIndexAt(depthNow); keep[0] = b; keep[1] = Math.min(5, b + 1); keep[2] = Math.max(0, b - 1); assets.release(keep); }
        if (assets.ready(forced >= 0 ? forced : biomeIndexAt(depthNow))) fade = Math.min(1, fade + dt / FADE_IN_MS);
        costFrame += now() - t0;
      });
    },
    drawWalls(ctx, state) {
      drawnThisFrame = false;
      if (flat() || !ctx) return false;
      return safe(() => {
        const t0 = now();
        read(state);
        if (!walls.rebuild(margin)) return false;
        if (!assets.ready(forced >= 0 ? forced : biomeIndexAt(depthNow)) || fade <= 0) return false;
        walls.ensureMask(margin);
        if (!walls.render(depthNow, { forced, time, bucketY, danger })) return false;
        walls.blit(ctx, cam, fade, level === 'medium');
        drawnThisFrame = true;
        costFrame += now() - t0;
        return true;
      }) === true;
    },
    drawForeground(ctx, state) {
      if (flat() || !ctx || !drawnThisFrame) return false;
      return safe(() => {
        const t0 = now();
        fg.draw(ctx, assets, depthNow, W, H, margin, laneTop, vel, cam, level === 'high', forced);
        costFrame += now() - t0;
        return true;
      }) === true;
    },
    pushEvents(events) {
      if (dead || reduce || !Array.isArray(events)) return;
      safe(() => { for (let i = 0; i < events.length; i++) { const ev = events[i]; cam.push(ev); light.push(ev); } });
    },
    setQuality(q) { if (dead) return; safe(() => { setLevel(normQuality(q), false); }); },
    setReduceMotion(v) { if (dead) return; reduce = !!v; cam.setReduceMotion(reduce); light.setReduceMotion(reduce); if (reduce) fade = 0; },
    destroy() { dead = true; safe(() => { walls.destroy(); fg.destroy(); light.clear(); }); },
    debug() {
      return {
        level, reduce, active: api.active, slices: walls.slices, slicesDrawn: walls.drawn, layerScale: walls.ls, blur: level === 'high', demoted,
        pool: { cap: light.pulses.length, live: light.live }, canvases: assets.canvases, costMs: cost, fgDrawn: fg.drawn,
        cam: { dx: cam.dx, dy: cam.dy, roll: cam.roll, zoom: cam.zoom }, vel, margin, forced,
      };
    },
  };
  return api;
}
export default createDepth;
