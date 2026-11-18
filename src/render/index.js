// Renderer entry. createRenderer(canvas, { reduceMotion, quality }) as in CONTRACT section 9.
// It never throws: every call is guarded, and a bad frame is skipped.
import { createScene } from './scene.js';
import { computeLayout, tileCx, tileCy, RISE_BEATS, HUD_TOP, HUD_BOTTOM } from './layout.js';
import { createCamera } from './camera.js';
import { createWell, PX_PER_M } from './well.js';
import { createRope } from './rope.js';
import { createBucket } from './bucket.js';
import { createItems } from './items.js';
import { createParticles } from './particles.js';
import { createFloaters } from './floaters.js';
import { createVignette } from './vignette.js';
import { createQuality } from './quality.js';
import { createEffects } from './effects.js';
import { drawFx, drawFlash } from './drawFx.js';
import { clearSprites } from './partIcon.js';
import { num, clamp, clamp01, warn } from './safe.js';
import * as partIcon from './partIcon.js';

export { partIcon };

export function createRenderer(canvas, opts = {}) {
  const o = opts || {};
  let ctx = null;
  try { ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null; } catch (e) { warn('no 2d context'); }
  const sc = createScene(), camera = createCamera(), well = createWell(), rope = createRope(), bucket = createBucket();
  const items = createItems(), particles = createParticles(), floaters = createFloaters(), vignette = createVignette();
  let dead = false, W = 360, H = 640, dpr = 1, reduce = !!o.reduceMotion, frameMs = 16;
  const quality = createQuality(o.quality === 'low' ? 'low' : 'high', applyQuality);
  const fx = createEffects({ sc, particles, floaters, camera, rope, bucket, well, vignette });
  const tmp = { x: 0, y: 0 };

  function applyQuality() {
    const q = quality.settings;
    particles.setCap(reduce ? Math.round(q.maxParticles * 0.4) : q.maxParticles);
    well.setLow(q.name === 'low');
  }
  function applyMotion() {
    sc.reduceMotion = reduce; camera.reduceMotion = reduce; rope.reduceMotion = reduce; well.setReduceMotion(reduce); vignette.setReduceMotion(reduce);
    if (reduce) { sc.timeScale = 1; sc.slowT = 0; }
    applyQuality();
  }
  function relayout() {
    computeLayout(sc.L, W, H, dpr, sc.rig.cols, sc.rig.rows);
    items.rebuild(sc.L.itemSize, dpr); bucket.rebuild(sc.L); well.resize(W, H, dpr, quality.level === 'low'); vignette.build(W, H, dpr);
  }
  applyMotion();
  computeLayout(sc.L, W, H, dpr, 4, 3);

  function updateItems(dt) {
    const L = sc.L, list = sc.items.items, hauling = sc.haulT >= 0;
    for (let i = 0; i < list.length; i++) {
      const it = list[i]; if (!it.alive) continue;
      const age = sc.beatPos - it.spawn;
      if (it.state === 0) {
        if (age >= RISE_BEATS) { fx.arrive(it); }
        const k = clamp01(age / RISE_BEATS);
        it.x = L.laneX[it.lane]; it.y = L.spawnY + (L.arriveY - L.spawnY) * k;
        it.fade = clamp01(age / 0.35) * (hauling ? Math.max(0, 1 - sc.haulT / 250) : 1);
        if (age > RISE_BEATS + 2) sc.items.release(it);
      } else if (it.state === 1) { // flying into its tile (80 ms)
        it.t += dt; const k = clamp01(it.t / 80), tx = tileCx(L, it.c), ty = tileCy(L, it.r) + bucket.offY;
        it.x = it.sx + (tx - it.sx) * k; it.y = it.sy + (ty - it.sy) * k; it.fade = 1 - k * 0.3;
        if (k >= 1) { fx.land(it); sc.items.release(it); }
      } else { // fading away (miss or hazard hit)
        it.t += dt; it.fade = 1 - clamp01(it.t / 420); it.y -= dt * 0.02;
        if (it.t >= 420) sc.items.release(it);
      }
    }
  }
  function drawItems(ctx2, flying, t) {
    const list = sc.items.items, size = 1;
    for (let i = 0; i < list.length; i++) {
      const it = list[i]; if (!it.alive || (it.state === 1) !== flying) continue;
      const sc2 = it.state === 1 ? 1 - it.t / 160 : it.state === 2 ? 1 + it.t / 800 : 0.7 + 0.3 * clamp01((sc.beatPos - it.spawn) / 0.4);
      items.draw(ctx2, it.kind, it.tier, it.hazard, it.x, it.y, sc2 * size, it.fade, t, it.seed);
    }
  }

  function step(rawDt, alpha) {
    const dt = clamp(num(rawDt, 16), 0, 250);
    frameMs = frameMs * 0.9 + dt * 0.1;
    quality.sample(dt);
    if (sc.slowT > 0) { sc.slowT -= dt; if (sc.slowT <= 0) sc.timeScale = 1; else sc.timeScale = 0.3 + 0.7 * (1 - sc.slowT / 600); }
    const sdt = dt * sc.timeScale; sc.time += dt;
    const a = clamp01(num(alpha, 0)), cand = sc.beatCount + a;
    sc.beatPos = cand >= sc.beatPos - 0.5 ? Math.max(sc.beatPos, cand) : cand;
    sc.alpha = a;
    if (sc.haulT >= 0) { sc.haulT += dt; sc.depthBase -= dt * 0.03 * Math.min(1, sc.haulT / 200); }
    sc.depthVis = sc.depthBase + (sc.snapped || sc.hauled ? 0 : sc.speed * a);
    if (sc.milestoneT >= 0) { sc.milestoneT += dt; if (sc.milestoneT > 900) sc.milestoneT = -1; }
    if (sc.flashA > 0) sc.flashA = Math.max(0, sc.flashA - dt / 260);
    camera.update(sdt); well.update(sdt); rope.update(sdt); bucket.update(sdt, H); vignette.update(sdt);
    updateItems(sdt); fx.runDue();
    particles.update(sdt); floaters.update(sdt);
    const th = sc.threads.items, rg = sc.rings.items, st = sc.streaks.items;
    for (let i = 0; i < th.length; i++) if (th[i].alive && (th[i].life -= dt) <= 0) sc.threads.release(th[i]);
    for (let i = 0; i < rg.length; i++) if (rg[i].alive && (rg[i].life -= dt) <= 0) sc.rings.release(rg[i]);
    for (let i = 0; i < st.length; i++) { const s = st[i]; if (s.alive) { s.y -= s.v * dt / 1000; if ((s.life -= dt) <= 0) sc.streaks.release(s); } }
    // sparks fall from the rope when strain is high
    if (sc.strain01 > 0.75 && !sc.snapped && Math.random() < dt / 90 && rope.sample(Math.random(), tmp)) particles.emit(0, tmp.x, tmp.y, (Math.random() - 0.5) * 40, 20, 520, 2, '#ffb454', 300, 0.5);
  }

  function paint() {
    const L = sc.L, t = sc.time;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    camera.apply(ctx, W, H);
    well.draw(ctx, sc.depthVis * PX_PER_M, sc.depthVis, t, sc.strain01);
    drawItems(ctx, false, t);
    const oy = bucket.offY;
    rope.draw(ctx, L.cx, -20, L.cx, Math.max(0, L.attachY + oy * 0.0 + (sc.hauled ? Math.min(0, oy) : 0)), sc.strain01, t, sc.depthVis * PX_PER_M);
    bucket.draw(ctx, L, sc.rig, t);
    drawItems(ctx, true, t);
    particles.draw(ctx); drawFx(ctx, sc, oy); floaters.draw(ctx);
    ctx.restore();
    vignette.draw(ctx, W, H); drawFlash(ctx, sc);
  }

  const api = {
    resize(w, h, d) {
      if (dead) return;
      try {
        W = Math.max(1, num(w, W)); H = Math.max(1, num(h, H)); dpr = clamp(num(d, 1) || 1, 1, 2);
        if (canvas) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); if (canvas.style) { canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; } }
        clearSprites(); relayout();
      } catch (e) { warn('resize', e && e.message); }
    },
    setRun(view, rig) {
      if (dead) return;
      try {
        if (rig && Array.isArray(rig.cells)) {
          const cols = rig.cols === 5 ? 5 : 4, rows = rig.rows === 4 ? 4 : 3, changed = cols !== sc.rig.cols || rows !== sc.rig.rows;
          sc.rig.cols = cols; sc.rig.rows = rows; sc.rig.cells = rig.cells; if (changed) relayout();
        }
        if (view && typeof view === 'object') {
          const depth = num(view.depth, 0);
          if (view.status === 'running' && depth + 5 < sc.depthBase && sc.beatCount > 0) { fx.handle({ t: 'RUN_START' }); }
          if (sc.beatCount === 0 || Math.abs(depth - sc.depthBase) > 3) sc.depthBase = depth;
          if (view.maxStrain > 0 && Number.isFinite(view.strain)) { sc.strain01 = clamp01(view.strain / view.maxStrain); vignette.setStrain(sc.strain01); }
          if (typeof view.biomeId === 'string') { well.setBiome(view.biomeId, sc.beatCount === 0); sc.biomeId = view.biomeId; }
          sc.combo = num(view.combo, 0); sc.gold = num(view.gold, 0); sc.status = view.status || sc.status;
        }
      } catch (e) { warn('setRun', e && e.message); }
    },
    pushEvents(events) {
      if (dead || !Array.isArray(events)) return;
      for (let i = 0; i < events.length; i++) { try { fx.handle(events[i]); } catch (e) { warn('event', e && e.message); } }
    },
    frame(dtMs, alpha) {
      if (dead || !ctx) return;
      try { step(dtMs, alpha); paint(); }
      catch (e) { warn('frame', e && e.message); try { ctx.restore(); ctx.restore(); } catch (e2) { /* ignore */ } }
    },
    setQuality(q) { if (!dead) quality.set(q === 'low' ? 'low' : 'high', true); },
    setReduceMotion(v) { reduce = !!v; applyMotion(); },
    safeRect() { return { top: HUD_TOP, bottom: Math.max(HUD_TOP, H - HUD_BOTTOM) }; },
    // Dev info for the lab.
    debugStats() { return { frameMs, particles: particles.count, floaters: floaters.count, items: sc.items.live, quality: quality.level, beatPos: sc.beatPos }; },
    destroy() {
      if (dead) return; dead = true;
      try { particles.clear(); floaters.clear(); sc.reset(); clearSprites(); ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) { /* ignore */ }
      ctx = null;
    },
  };
  return api;
}
export default createRenderer;
