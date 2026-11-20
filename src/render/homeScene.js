// Home surface scene as a canvas (GFX-1 part 9): dusk well mouth, stone rim, wooden winch and rope,
// crew silhouettes that grow with the crew count, lantern light, stars, fireflies and slow parallax.
// Two cached layers only (back, front); per frame it draws 2 layers, a few shapes and sprites, no allocation.
// Low quality: one pixel ratio 1 and 4 fireflies, no drift. Reduce motion: one still frame, no loop.
import { makeCanvas, makeSprite } from './canvasUtil.js';
import { homeLayout, crewSlots, fireflyAt, paintBack, paintFront, drawCrew, paintGlow, MARGIN, MAX_CREW } from './art/homeArt.js';

export const FIREFLIES = { high: 14, low: 4 };

export function createHomeScene(opts = {}) {
  let crew = Math.max(0, Math.min(MAX_CREW, Math.floor(opts.crew) || 0)), low = opts.quality === 'low', reduce = !!opts.reduceMotion;
  let w = 360, h = 640, dpr = 1, L = homeLayout(w, h), t = 0, raf = 0, dead = false, running = false, last = 0;
  let back = null, front = null, lantern = null, fly = null, slots = crewSlots(crew, L);
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const pt = { x: 0, y: 0, a: 0 };

  function free() { for (const c of [back, front, lantern, fly]) if (c) { try { c.width = 0; c.height = 0; } catch (e) { /* ignore */ } } back = front = lantern = fly = null; }
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
  }
  function draw() {
    if (!ctx || dead) return;
    const sx = reduce || low ? 0 : Math.sin(t * 0.05), ox = -MARGIN + sx * MARGIN * 0.5, oxf = -MARGIN + sx * MARGIN * 0.9;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = '#070a12'; ctx.fillRect(0, 0, w, h);
    if (back) ctx.drawImage(back, ox, 0, w + MARGIN * 2, h);
    if (front) ctx.drawImage(front, oxf, 0, w + MARGIN * 2, h);
    // rope and brass hook swaying a little inside the winch
    const sw = reduce ? 0 : Math.sin(t * 0.9) * 2.2, top = L.beamY + 1, bot = L.wellCy - 4;
    ctx.strokeStyle = '#a8803e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.winchX, top); ctx.quadraticCurveTo(L.winchX + sw, (top + bot) / 2, L.winchX + sw * 1.5, bot); ctx.stroke();
    ctx.strokeStyle = '#e8c984'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.winchX - 1, top); ctx.quadraticCurveTo(L.winchX + sw - 1, (top + bot) / 2, L.winchX + sw * 1.5 - 1, bot); ctx.stroke();
    ctx.strokeStyle = '#d9b26a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(L.winchX + sw * 1.5, bot + 6, 6, -1.2, 2.6); ctx.stroke(); ctx.lineCap = 'butt';
    // lantern light (flicker is slow and shallow) and the crew in front of it
    const fl = reduce ? 1 : 0.86 + 0.1 * Math.sin(t * 5.1) + 0.04 * Math.sin(t * 8.3);
    if (lantern) { ctx.globalAlpha = 0.55 * fl; ctx.drawImage(lantern, L.lanternX - 70, L.lanternY - 70, 140, 140); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#ffd890'; ctx.fillRect(L.lanternX - 2.5, L.lanternY - 3, 5, 7);
    for (let i = 0; i < slots.length; i++) { const c = slots[i]; drawCrew(ctx, c.x, c.y, c.s, reduce ? 0 : Math.sin(t * 1.3 + c.phase) * 0.8); }
    if (fly && !reduce) { const n = low ? FIREFLIES.low : FIREFLIES.high; for (let i = 0; i < n; i++) { fireflyAt(i, t, L, pt); ctx.globalAlpha = Math.max(0, pt.a); ctx.drawImage(fly, pt.x - 6, pt.y - 6, 12, 12); } ctx.globalAlpha = 1; }
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
      L = homeLayout(w, h); slots = crewSlots(crew, L); build(); draw();
    },
    setCrew(n) { crew = Math.max(0, Math.min(MAX_CREW, Math.floor(n) || 0)); slots = crewSlots(crew, L); if (!running) draw(); },
    setQuality(q) { const l = q === 'low'; if (l === low) return; low = l; build(); if (!running) draw(); },
    setReduceMotion(r) { reduce = !!r; if (reduce) api.stop(); draw(); },
    start() { if (dead || running || reduce || typeof requestAnimationFrame !== 'function') { draw(); return; } running = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf); raf = 0; },
    frame(dtSec) { t += Math.max(0, Number(dtSec) || 0); draw(); },
    memoryBytes() { let b = 0; for (const c of [back, front, lantern, fly]) if (c) b += c.width * c.height * 4; return b; },
    destroy() { dead = true; api.stop(); free(); },
  };
  return api;
}
