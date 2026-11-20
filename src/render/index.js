// Renderer entry. createRenderer(canvas, { reduceMotion, quality }) as in CONTRACT section 9.
// It never throws: every call is guarded, and a bad frame is skipped.
import { createScene } from './scene.js';
import { computeLayout, tileCx, tileCy, RISE_BEATS, HUD_TOP, HUD_BOTTOM, MAX_COL } from './layout.js';
import { createCamera } from './camera.js';
import { createWell, PX_PER_M } from './well.js';
import { createRope } from './rope.js';
import { destroyRopeTiles } from './art/ropeArt.js'; // [GFX-1]
import { destroyLantern } from './art/lanternArt.js'; // [GFX-1]
import { createBucket } from './bucket.js';
import { createItems } from './items.js';
import { createParticles } from './particles.js';
import { createFloaters } from './floaters.js';
import { createVignette } from './vignette.js';
import { createQuality } from './quality.js';
import { createFxSprites } from './art/fxSprites.js'; // [GFX-1] pre-rendered effect sprites
import { createEffects } from './effects.js';
import { drawFx, drawFlash } from './drawFx.js';
import { clearSprites } from './partIcon.js';
import { num, clamp, clamp01, warn } from './safe.js';
import { TOKENS } from './palette.js';
import { createPolish } from './polish/index.js'; // [AI-2] polish hook
import { createDepth } from './depth/index.js'; // [DEPTH-1] depth hook
import * as partIcon from './partIcon.js';
import { models } from './models/index.js'; // [MODEL-1]

export { partIcon };

export function createRenderer(canvas, opts = {}) {
  const o = opts || {};
  let ctx = null;
  try { ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null; } catch (e) { warn('no 2d context'); }
  const sc = createScene(), camera = createCamera(), well = createWell(), rope = createRope(), bucket = createBucket();
  const items = createItems(), particles = createParticles(), floaters = createFloaters(), vignette = createVignette();
  let dead = false, hidden = false, sized = false, W = 360, H = 640, CW = 360, colX = 0, dpr = 1, reduce = !!o.reduceMotion, frameMs = 16;
  const lay = { trim: false }; // [GFX-1] quality steps that were switched off before dropping to 'low'
  const quality = createQuality(o.quality === 'low' ? 'low' : 'high', applyQuality);
  const fx = createEffects({ sc, particles, floaters, camera, rope, bucket, well, vignette });
  const fxSprites = createFxSprites(); particles.setSprites(fxSprites); // [GFX-1]
  const tmp = { x: 0, y: 0 };
  // [AI-2] polish hook: extra light, ambience and wall detail. Keep these calls when editing (see docs/manager/POLISH_SPLIT.md).
  const polish = createPolish({ reduceMotion: reduce, quality: o.quality === 'low' ? 'low' : 'high' });
  const depthLayer = createDepth({ reduceMotion: reduce, quality: o.quality === 'low' ? 'low' : 'high' }); // [DEPTH-1] shaft depth layer (all calls guarded inside; see docs/requests/DEPTH-1-to-NEW-7-hook.md)
  const pst = { depth: 0, biomeId: 'clay', strain01: 0, danger: 0, speed: 1, bucket: { x: 0, y: 0 }, lanes: null, laneCount: 4, arriveY: 0, w: 360, h: 640, time: 0 };
  function fillPolish() {
    const L = sc.L;
    pst.depth = sc.depthVis; pst.biomeId = sc.biomeId || 'clay'; pst.strain01 = sc.strain01; pst.danger = sc.strain01; pst.speed = sc.speed;
    pst.bucket.x = L.cx; pst.bucket.y = L.top + L.bucketH * 0.5 + bucket.offY; pst.lanes = L.laneX; pst.laneCount = L.cols; pst.arriveY = L.arriveY; pst.w = CW; pst.h = H; pst.time = sc.time;
  }

  function applyQuality() {
    const q = quality.settings;
    const baseCap = reduce ? Math.round(q.maxParticles * 0.4) : q.maxParticles;
    particles.setCap(lay.trim ? Math.round(baseCap * 0.6) : baseCap); // [GFX-1] lay.trim = quality step 2
    polish.setQuality(q.name); depthLayer.setQuality(q.name); // [DEPTH-1]
    models.setEnabled(q.name !== 'low'); // [MODEL-1] baked 3D art only on high quality
    well.setLow(q.name === 'low');
    items.setLow(q.name === 'low'); // [GFX-1]
    rope.low = q.name === 'low'; bucket.low = rope.low; // [GFX-1] flat rope and still lantern on low quality
    fx.state.low = q.name === 'low'; try { fxSprites.rebuild(dpr, q.name === 'low'); } catch (e) { /* flat particles stay */ } // [GFX-1]
  }
  function applyMotion() {
    sc.reduceMotion = reduce; camera.reduceMotion = reduce; rope.reduceMotion = reduce; bucket.reduceMotion = reduce; well.setReduceMotion(reduce); vignette.setReduceMotion(reduce); items.setReduceMotion(reduce);
    if (reduce) { sc.timeScale = 1; sc.slowT = 0; }
    polish.setReduceMotion(reduce); depthLayer.setReduceMotion(reduce); // [DEPTH-1]
    applyQuality();
  }
  function relayout() {
    CW = Math.min(W, MAX_COL); colX = Math.floor((W - CW) / 2);
    computeLayout(sc.L, CW, H, dpr, sc.rig.cols, sc.rig.rows);
    items.rebuild(sc.L.itemSize, dpr); bucket.rebuild(sc.L); well.resize(CW, H, dpr, quality.level === 'low'); vignette.build(CW, H, dpr); polish.resize(CW, H, dpr); depthLayer.resize(CW, H, dpr); // [DEPTH-1]
    try { fxSprites.rebuild(dpr, quality.level === 'low'); } catch (e) { /* flat particles stay */ } // [GFX-1]
  }
  // [GFX-1] Cheapest-to-lose layers go first when frames run slow; the player's 'high' brings them back.
  quality.registerLayer('fx-extras', { importance: 1, cost: 3, off() { fx.state.extras = false; }, on() { fx.state.extras = true; } });
  quality.registerLayer('particle-trim', { importance: 2, cost: 5, off() { lay.trim = true; applyQuality(); }, on() { lay.trim = false; applyQuality(); } });
  applyMotion();
  computeLayout(sc.L, CW, H, dpr, 4, 3);

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
    frameMs = frameMs * 0.9 + dt * 0.1; models.noteFrame(frameMs); // [MODEL-1] baking backs off when the game is slow
    quality.sample(num(rawDt, 16)); // raw time: a hidden tab must not count as slow
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
    fillPolish(); polish.update(dt, pst); depthLayer.update(dt, pst); // [DEPTH-1]
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
    ctx.fillStyle = TOKENS.ink900; ctx.fillRect(0, 0, W, H); // outside the column, and behind camera shake
    ctx.save();
    if (colX > 0) { ctx.translate(colX, 0); ctx.beginPath(); ctx.rect(0, 0, CW, H); ctx.clip(); } // wide window: centred column
    ctx.save();
    camera.apply(ctx, CW, H);
    well.draw(ctx, sc.depthVis * PX_PER_M, sc.depthVis, t, sc.strain01);
    depthLayer.drawWalls(ctx, pst); // [DEPTH-1] covers the flat well when active
    polish.drawBack(ctx, pst);
    drawItems(ctx, false, t);
    const oy = bucket.offY;
    rope.draw(ctx, L.cx, -20, L.cx, Math.max(0, L.attachY + oy * 0.0 + (sc.hauled ? Math.min(0, oy) : 0)), sc.strain01, t, sc.depthVis * PX_PER_M);
    bucket.draw(ctx, L, sc.rig, t);
    drawItems(ctx, true, t);
    depthLayer.drawForeground(ctx, pst); // [DEPTH-1] edge silhouettes, never over lanes
    polish.drawFront(ctx, pst);
    particles.draw(ctx); drawFx(ctx, sc, oy); floaters.draw(ctx);
    ctx.restore();
    vignette.draw(ctx, CW, H); drawFlash(ctx, sc);
    ctx.restore();
  }

  const api = {
    resize(w, h, d) {
      if (dead) return;
      try {
        const nw = Math.max(1, num(w, W)), nh = Math.max(1, num(h, H)), nd = clamp(num(d, 1) || 1, 1, 2); // dpr is capped at 2
        if (nw === W && nh === H && nd === dpr && canvas && canvas.width === Math.round(nw * nd) && sized) return; // nothing changed: keep sprites
        W = nw; H = nh; dpr = nd; sized = true;
        if (canvas) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); if (canvas.style) { canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; } }
        rope.dpr = dpr; clearSprites(); relayout(); // [GFX-1] rope tiles follow the pixel ratio
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
      depthLayer.pushEvents(events); // [DEPTH-1]
    },
    frame(dtMs, alpha) {
      if (dead || !ctx || hidden) return;
      try { step(dtMs, alpha); paint(); }
      catch (e) { warn('frame', e && e.message); try { ctx.restore(); ctx.restore(); } catch (e2) { /* ignore */ } }
    },
    setQuality(q) { if (!dead) quality.set(q === 'low' ? 'low' : 'high', true); },
    setReduceMotion(v) { reduce = !!v; applyMotion(); },
    // The band where the bucket and items live. top/bottom are the HUD limits; the rest is where things really are.
    safeRect() {
      const L = sc.L, bottom = Math.max(HUD_TOP, H - HUD_BOTTOM);
      return { top: HUD_TOP, bottom, left: colX, right: colX + CW, width: CW, height: Math.max(0, bottom - HUD_TOP), bucketTop: L.top, bucketBottom: L.top + L.bucketH, tile: L.tile };
    },
    // Tab hidden / shown. While hidden, frames are skipped; on return the slow-frame count starts fresh.
    setHidden(v) { const h = !!v; if (h === hidden) return; hidden = h; if (!h) { frameMs = 16; quality.sample(0); } },
    // Dev info for the lab.
    debugStats() { return { frameMs, particles: particles.count, floaters: floaters.count, items: sc.items.live, rings: sc.rings.live, threads: sc.threads.live, streaks: sc.streaks.live, recycled: particles.pool.stats.recycled + sc.items.stats.recycled, quality: quality.level, beatPos: sc.beatPos, dpr, width: W, height: H, column: CW }; },
    // Dev only: fire n particles from the bucket (used by the lab to test the 300 cap).
    debugBurst(n) { if (dead) return; const L = sc.L; particles.burst(L.cx, L.top + L.bucketH / 2, Math.max(0, n | 0), '#ffe3a1', 220, 0, 1400, 2.4, 60); },
    destroy() {
      if (dead) return; dead = true;
      try { particles.clear(); floaters.clear(); sc.reset(); clearSprites(); ctx && ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) { /* ignore */ }
      try { destroyRopeTiles(); destroyLantern(); } catch (e) { /* ignore */ } // [GFX-1]
      try { polish.destroy(); } catch (e) { /* ignore */ }
      try { items.destroy(); } catch (e) { /* ignore */ } // [GFX-1] frees the sprite atlas
      try { fxSprites.destroy(); } catch (e) { /* ignore */ } // [GFX-1]
      try { depthLayer.destroy(); } catch (e) { /* ignore */ } // [DEPTH-1]
      ctx = null;
    },
  };
  return api;
}
export default createRenderer;
