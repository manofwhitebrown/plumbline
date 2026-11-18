// Polish layers (AI-2). createPolish({ reduceMotion, quality, makeCanvas }) -> { resize, update, drawBack, drawFront, setQuality, setReduceMotion, destroy, debug }
//
// state = { depth, biomeId, strain01, danger, speed, bucket:{x,y}, lanes, laneCount, arriveY, w, h, time }
// The renderer calls drawBack after the well walls and before items, and drawFront after items and before the vignette.
// Every call is guarded: a bad frame is skipped, nothing throws into the game loop.
// Quality 'low': only the biome blend and a still lantern glow. Reduce motion: no flicker, no drifting, no pulses.
import { createCues } from '../../feel/cues.js';
import { createBlend } from './blend.js';
import { createLighting } from './lighting.js';
import { createAmbience, AMBIENCE_CAP } from './ambience.js';
import { createWallDetail } from './wallDetail.js';
import { clamp, clamp01, fin, POLISH_CAP } from './util.js';

const PX_PER_M = 44; // same as render/well.js

export function createPolish(opts) {
  const o = opts || {};
  let reduce = !!o.reduceMotion, low = o.quality === 'low', dead = false, w = 360, h = 640, dpr = 1, bad = 0;
  const factory = typeof o.makeCanvas === 'function' ? o.makeCanvas : null;
  const getFactory = () => factory;
  const cues = createCues({ reduceMotion: reduce });
  const blend = createBlend(), light = createLighting(getFactory), amb = createAmbience(), walls = createWallDetail(getFactory);
  const view = { strain: 0, maxStrain: 1, combo: 0, status: 'running' };
  const flags = { cone: true, bloom: true, flicker: true, cues };

  function applyFlags() {
    flags.cone = !low; flags.bloom = !low && !reduce; flags.flicker = !reduce && !low;
    if (low || reduce) amb.clear();
    cues.setReduceMotion(reduce);
  }
  applyFlags();

  function safe(fn) {
    try { fn(); } catch (e) { if (++bad < 5 && typeof console !== 'undefined' && console.warn) console.warn('polish:', e && e.message); }
  }
  function clean(s) { // never trust the state
    const st = s && typeof s === 'object' ? s : {};
    return st;
  }

  return {
    resize(nw, nh, nd) {
      if (dead) return;
      safe(() => {
        w = Math.max(1, fin(nw, w)); h = Math.max(1, fin(nh, h)); dpr = clamp(fin(nd, 1) || 1, 1, 2);
        blend.resize(); light.resize(w, h, dpr); amb.resize(w, h); walls.resize(w, h, dpr);
      });
    },
    update(dtMs, state) {
      if (dead) return;
      safe(() => {
        const st = clean(state), dt = clamp(fin(dtMs), 0, 250);
        view.strain = clamp01(fin(st.strain01)); view.maxStrain = 1; view.status = 'running';
        cues.update(dt, view);
        const id = typeof st.biomeId === 'string' ? st.biomeId : 'clay';
        amb.update(dt, { biomeId: id, depth: fin(st.depth), speed: fin(st.speed, 1) }, !low && !reduce, 1);
        if (!low) walls.ensure(id); // one strip per biome, built once, one per frame at most
      });
    },
    drawBack(ctx, state) {
      if (dead || !ctx) return;
      safe(() => {
        const st = clean(state), s = { biomeId: typeof st.biomeId === 'string' ? st.biomeId : 'clay', depth: fin(st.depth), time: fin(st.time) };
        ctx.save();
        blend.draw(ctx, s, w, h);
        light.drawCone(ctx, s, flags);
        if (!low) {
          walls.draw(ctx, s.biomeId, s.depth * PX_PER_M, 0.55, reduce ? 1 : 0.85);
          amb.drawShimmer(ctx, s, reduce ? 0 : s.time, w, h);
          amb.draw(ctx, s, s.time);
        }
        ctx.restore();
      });
    },
    drawFront(ctx, state) {
      if (dead || !ctx) return;
      safe(() => {
        const st = clean(state);
        const s = { biomeId: typeof st.biomeId === 'string' ? st.biomeId : 'clay', depth: fin(st.depth), time: fin(st.time), bucket: st.bucket, lanes: st.lanes, laneCount: fin(st.laneCount), arriveY: fin(st.arriveY, h * 0.7) };
        ctx.save();
        light.drawLantern(ctx, s, flags);
        ctx.restore();
      });
    },
    setQuality(q) { if (dead) return; low = q === 'low'; applyFlags(); },
    setReduceMotion(v) { if (dead) return; reduce = !!v; applyFlags(); },
    destroy() { dead = true; amb.clear(); },
    debug() { return { particles: amb.count, cap: Math.min(POLISH_CAP, AMBIENCE_CAP), strips: walls.built, reduce, low, tension: cues.tension, anticipation: cues.anticipation }; },
  };
}
export default createPolish;
