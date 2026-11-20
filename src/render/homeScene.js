// Home surface scene as a canvas: dusk sky and village (back layer), grass, stone well, wooden winch (front layer),
// then per frame: turning drum and crank, rope and bucket, six crew looks (0-8), lantern light, dust and fireflies.
// Two cached layers plus three tiny sprites; no allocation per frame. Low quality: pixel ratio 1, few fireflies, no drift.
// Reduce motion: one still frame, no loop.
import { makeCanvas, makeSprite } from './canvasUtil.js';
import { homeLayout, crewSlots, fireflyAt, dustAt, paintBack, paintFront, paintGlow, MARGIN, MAX_CREW } from './art/homeArt.js';
import { paintBucket, drawWinchLive } from './art/homeWell.js';
import { drawCrewMember } from './art/crewDraw.js';
import { LOOKS } from './art/crewLooks.js';

export const FIREFLIES = { high: 14, low: 4 };
export const DUST = { high: 8, low: 2 };

export function createHomeScene(opts = {}) {
  let crew = Math.max(0, Math.min(MAX_CREW, Math.floor(opts.crew) || 0)), low = opts.quality === 'low', reduce = !!opts.reduceMotion;
  let w = 360, h = 640, dpr = 1, L = homeLayout(w, h), t = 0, raf = 0, dead = false, running = false, last = 0;
  let back = null, front = null, lantern = null, fly = null, bucket = null, slots = crewSlots(crew, L), order = sortOrder(slots);
  const canvas = typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null;
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const pt = { x: 0, y: 0, a: 0 };

  function sortOrder(s) { const o = s.map((_, i) => i); o.sort((a, b) => s[a].y - s[b].y || a - b); return o; }
  function free() { for (const c of [back, front, lantern, fly, bucket]) if (c) { try { c.width = 0; c.height = 0; } catch (e) { /* ignore */ } } back = front = lantern = fly = bucket = null; }
  function build() {
    free();
    const rb = Math.min(dpr, low ? 1 : 1.25), rf = Math.min(dpr, low ? 1 : 1.5), wide = w + MARGIN * 2;
    back = makeCanvas(wide * rb, h * rb); front = makeCanvas(wide * rf, h * rf);
    for (const [c, r, fn] of [[back, rb, paintBack], [front, rf, paintFront]]) {
      const g = c && c.getContext('2d'); if (!g) continue;
      g.scale(r, r); try { fn(g, L, wide); } catch (e) { /* keep what was painted */ }
    }
    lantern = makeSprite(96, 96, 1, (g, s) => paintGlow(g, s, '255,196,110'));
    fly = makeSprite(24, 24, 1, (g, s) => paintGlow(g, s, '255,236,150'));
    bucket = makeSprite(36, 40, 2, paintBucket);
  }
  function draw() {
    if (!ctx || dead) return;
    const sx = reduce || low ? 0 : Math.sin(t * 0.05), ox = -MARGIN + sx * MARGIN * 0.5, oxf = -MARGIN + sx * MARGIN * 0.9;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#070a12'; ctx.fillRect(0, 0, w, h);
    if (back) ctx.drawImage(back, ox, 0, w + MARGIN * 2, h);
    if (front) ctx.drawImage(front, oxf, 0, w + MARGIN * 2, h);
    ctx.translate(oxf + MARGIN, 0); // live pieces share the front layer's drift so they stay glued to the well
    const ang = reduce || !slots.length ? 0.7 : t * 1.5, sw = reduce ? 0 : Math.sin(t * 0.9) * 1.6;
    drawWinchLive(ctx, L, ang, sw, bucket);
    const kx = L.crankX + Math.cos(ang) * L.crankR, ky = L.drumY + Math.sin(ang) * L.crankR, tt = reduce ? 0 : t;
    for (let k = 0; k < order.length; k++) {
      const i = order[k], c = slots[i], lk = LOOKS[c.look], lit = (L.lanternX - c.x) * c.face >= 0 ? 1 : -1;
      drawCrewMember(ctx, c.x, c.y, c.s, lk, tt, c.phase, lit, c.face, kx, ky);
    }
    // lantern light (flicker is slow and shallow), dust in the beam, fireflies: all additive
    const fl = reduce ? 1 : 0.88 + 0.08 * Math.sin(t * 5.1) + 0.04 * Math.sin(t * 8.3);
    ctx.globalCompositeOperation = 'lighter';
    if (lantern) { ctx.globalAlpha = 0.5 * fl; ctx.drawImage(lantern, L.lanternX - 80, L.lanternY - 80, 160, 160); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffd890'; ctx.fillRect(L.lanternX - 2, L.lanternY - 2.5, 4, 6);
    if (!reduce) {
      ctx.fillStyle = '#ffe3a1'; const nd = low ? DUST.low : DUST.high;
      for (let i = 0; i < nd; i++) { dustAt(i, t, L, pt); ctx.globalAlpha = pt.a; ctx.fillRect(pt.x, pt.y, 1.6, 1.6); }
      if (fly) { const n = low ? FIREFLIES.low : FIREFLIES.high; for (let i = 0; i < n; i++) { fireflyAt(i, t, L, pt); ctx.globalAlpha = Math.max(0, pt.a); ctx.drawImage(fly, pt.x - 6 - MARGIN, pt.y - 6, 12, 12); } }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function loop(now) {
    if (!running || dead) return;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now; t += dt;
    try { draw(); } catch (e) { /* never throw into the page */ }
    raf = requestAnimationFrame(loop);
  }
  const api = {
    canvas, get crew() { return crew; }, get layout() { return L; },
    resize(nw, nh, nd) {
      if (dead) return; w = Math.max(120, Math.floor(nw) || 360); h = Math.max(160, Math.floor(nh) || 640); dpr = Math.max(1, Math.min(3, Number(nd) || 1));
      if (canvas) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); if (canvas.style) { canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; } }
      L = homeLayout(w, h); slots = crewSlots(crew, L); order = sortOrder(slots); build(); draw();
    },
    setCrew(n) { crew = Math.max(0, Math.min(MAX_CREW, Math.floor(n) || 0)); slots = crewSlots(crew, L); order = sortOrder(slots); if (!running) draw(); },
    setQuality(q) { const l = q === 'low'; if (l === low) return; low = l; if (!dead && canvas) { build(); if (!running) draw(); } },
    setReduceMotion(r) { reduce = !!r; if (reduce) api.stop(); draw(); },
    start() { if (dead || running || reduce || typeof requestAnimationFrame !== 'function') { draw(); return; } running = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf); raf = 0; },
    frame(dtSec) { t += Math.max(0, Number(dtSec) || 0); draw(); },
    memoryBytes() { let b = 0; for (const c of [back, front, lantern, fly, bucket]) if (c) b += c.width * c.height * 4; return b; },
    destroy() { dead = true; api.stop(); free(); },
  };
  return api;
}
