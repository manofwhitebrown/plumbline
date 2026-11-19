// cinematics/rewards.js: the reward moments.
//   makeDailyChest   a chest opens, items burst out and fly to their counters        (1800 ms, canvas)
//   makeCollapse     the well drains and refills with violet light, Core Dust spirals into the counter (2600 ms, canvas)
//   makeAchievement  an unlock banner drops in with a glint                          (2000 ms, DOM)
//   makeCodexFlip    a page flips and the new entry glows                            (1600 ms, DOM)
//   makePartDrop     the bought part tile drops onto the rig and settles             (900 ms, DOM)
// Celebrations may run past 1.2 s. All are skippable (the runner applies finish()), click-through, and Reduce motion shows nothing.
import { ease, seg, glow, rgba, TOKENS } from './common.js';

export const DAILY_MS = 1800, COLLAPSE_MS = 2600, ACH_MS = 2000, CODEX_MS = 1600, PART_MS = 900;
const VIOLET = '#b583ff';
const pt = (p, w, h, dx, dy) => ({ x: p && Number.isFinite(p.x) ? p.x : dx * w, y: p && Number.isFinite(p.y) ? p.y : dy });

export function makeDailyChest(layer, opts) {
  const o = opts || {}; const cue = typeof o.cue === 'function' ? o.cue : () => {};
  const r = layer.pool.rnd; let opened = false;
  const N = 14, items = [];
  for (let i = 0; i < N; i++) items.push({ a: -1.2 - r() * 0.8 + (i % 2 ? 0.5 : -0.5), s: 70 + r() * 70, kind: i % 3 === 0 ? 'shard' : 'gold', delay: 520 + i * 40 });
  return {
    id: 'dailyChest', durationMs: DAILY_MS,
    update(t) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2, cy = h * 0.46;
      const goldT = pt(o.targets && o.targets.gold, w, h, 0.25, 38), shardT = pt(o.targets && o.targets.shards, w, h, 0.75, 38);
      const rise = seg(t, 0, 260, ease.settle), open = seg(t, 300, 260, ease.out), fade = 1 - seg(t, 1500, 300);
      ctx.fillStyle = 'rgba(2,1,8,' + (0.45 * rise * fade) + ')'; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(cx, cy + (1 - rise) * 24);
      glow(ctx, 0, -20, 150, TOKENS.gold, 0.35 * open);
      ctx.fillStyle = '#5a3b1d'; ctx.fillRect(-36, -4, 72, 40);
      ctx.fillStyle = '#8a6420'; ctx.fillRect(-36, 10, 72, 5);
      ctx.save(); ctx.translate(-36, -4); ctx.rotate(-open * 1.25); ctx.fillStyle = '#6f4a22'; ctx.fillRect(0, -16, 72, 16); ctx.restore();
      ctx.restore();
      if (open > 0.4 && !opened) { opened = true; cue('open'); }
      for (const it of items) {
        const k = (t - it.delay) / 1100; if (k <= 0) continue;
        const kk = Math.min(1, k), burst = ease.out(Math.min(1, kk * 2.2)), home = ease.in(Math.max(0, (kk - 0.4) / 0.6));
        const bx = cx + Math.cos(it.a) * it.s * burst, by = cy - 20 + Math.sin(it.a) * it.s * burst, tg = it.kind === 'shard' ? shardT : goldT;
        const x = bx + (tg.x - bx) * home, y = by + (tg.y - by) * home;
        ctx.globalAlpha = (1 - 0.7 * home) * fade; ctx.fillStyle = it.kind === 'shard' ? TOKENS.shard : TOKENS.gold;
        if (it.kind === 'shard') { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill(); } else { ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    },
    finish() { layer.clear(); },
  };
}

export function makeCollapse(layer, opts) {
  const o = opts || {}; const cue = typeof o.cue === 'function' ? o.cue : () => {};
  const r = layer.pool.rnd; const N = 20, dust = [];
  for (let i = 0; i < N; i++) dust.push({ a: r() * 6.28, rad: 50 + r() * 90, delay: 1400 + i * 28 });
  let drained = false;
  return {
    id: 'collapse', durationMs: COLLAPSE_MS,
    update(t) {
      const ctx = layer.begin(); if (!ctx) return;
      const w = layer.w, h = layer.h, cx = w / 2, top = h * 0.2, bot = h * 0.8, ww = w * 0.34;
      const tg = pt(o.target, w, h, 0.5, 38);
      const fade = 1 - seg(t, 2300, 300), intro = seg(t, 0, 200);
      ctx.fillStyle = 'rgba(2,1,8,' + (0.55 * intro * fade) + ')'; ctx.fillRect(0, 0, w, h);
      // the well: a column that drains (top edge falls), then refills with violet light (top edge rises)
      const drain = seg(t, 100, 800, ease.inOut), refill = seg(t, 900, 800, ease.inOut), level = 1 - drain + refill; // 1 full .. 0 empty .. 1 full
      const lvl = Math.max(0, Math.min(1, level));
      ctx.save(); ctx.globalAlpha = fade;
      ctx.strokeStyle = 'rgba(141,151,184,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(cx - ww / 2, top, ww, bot - top);
      const fy = bot - (bot - top) * lvl, violet = seg(t, 900, 600);
      const g = ctx.createLinearGradient(0, fy, 0, bot); g.addColorStop(0, rgba(violet > 0.01 ? VIOLET : TOKENS.goldSoft, 0.85)); g.addColorStop(1, rgba(violet > 0.01 ? '#5a2fa8' : '#8a6420', 0.9));
      ctx.fillStyle = g; ctx.fillRect(cx - ww / 2 + 2, fy, ww - 4, bot - fy - 1);
      glow(ctx, cx, fy, ww * 1.4, VIOLET, 0.35 * violet);
      ctx.restore();
      if (t > 900 && !drained) { drained = true; cue('drained'); }
      // Core Dust spirals up out of the well and into the counter
      for (const d of dust) {
        const k = (t - d.delay) / 1000; if (k <= 0 || k >= 1) continue;
        const e = ease.in(k), ang = d.a + k * 7, rad = d.rad * (1 - e);
        const x = cx + (tg.x - cx) * e + Math.cos(ang) * rad * (1 - e), y = top + (tg.y - top) * e + Math.sin(ang) * rad * 0.5 * (1 - e);
        ctx.globalAlpha = Math.min(1, k * 4) * (1 - 0.5 * e) * fade; ctx.fillStyle = VIOLET; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    finish() { layer.clear(); },
  };
}

// ---- DOM moments ----------------------------------------------------------------------------
function el(doc, tag, css, text) { const e = doc.createElement(tag); e.style.cssText = css; if (text != null) e.textContent = text; return e; }
function mount(host, doc, node) { if (host && host.appendChild) host.appendChild(node); return node; }

export function makeAchievement(host, opts) {
  const o = opts || {}; const doc = o.doc || (typeof document !== 'undefined' ? document : null);
  let n = null, glint = null;
  if (doc && host) {
    n = el(doc, 'div', 'position:absolute;left:50%;top:calc(env(safe-area-inset-top, 0px) + 12px);margin-left:-150px;width:300px;pointer-events:none;z-index:95;opacity:0;padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,#2a2210,#1b1410);border:1px solid rgba(246,196,83,.6);box-shadow:0 8px 24px rgba(0,0,0,.5),0 0 24px rgba(246,196,83,.25);overflow:hidden;will-change:transform,opacity');
    n.setAttribute('aria-hidden', 'true'); n.className = 'cine-ach';
    n.append(el(doc, 'div', 'font:600 11px/1.2 var(--font-body, inherit);letter-spacing:.14em;text-transform:uppercase;color:#f6c453', 'Achievement unlocked'), el(doc, 'div', 'font:700 16px/1.3 var(--font-display, inherit);color:#eef2ff;margin-top:2px', String(o.title || 'Achievement')));
    glint = el(doc, 'div', 'position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.35),rgba(255,255,255,0));opacity:0;will-change:transform,opacity');
    n.append(glint); mount(host, doc, n);
  }
  return {
    id: 'achievement', durationMs: ACH_MS,
    update(t) {
      if (!n) return;
      const inP = seg(t, 0, 420, ease.settle), out = seg(t, 1650, 350, ease.in);
      n.style.opacity = String(Math.min(seg(t, 0, 160), 1 - out));
      n.style.transform = 'translate3d(0,' + ((-70 * (1 - inP)) - 30 * out).toFixed(1) + 'px,0)';
      const gp = seg(t, 380, 600, ease.inOut); glint.style.opacity = String(Math.sin(gp * Math.PI)); glint.style.transform = 'translate3d(' + (-120 + gp * 460).toFixed(1) + '%,0,0)';
    },
    finish() { if (n && n.remove) n.remove(); n = null; },
  };
}

export function makeCodexFlip(host, opts) {
  const o = opts || {}; const doc = o.doc || (typeof document !== 'undefined' ? document : null);
  let wrap = null, page = null, label = null;
  if (doc && host) {
    wrap = el(doc, 'div', 'position:absolute;left:50%;top:38%;width:180px;height:120px;margin-left:-90px;pointer-events:none;z-index:95;perspective:600px;opacity:0;will-change:opacity');
    wrap.setAttribute('aria-hidden', 'true'); wrap.className = 'cine-codex';
    const book = el(doc, 'div', 'position:absolute;inset:0;border-radius:6px;background:#1d2740;border:1px solid #2a3555;box-shadow:0 10px 28px rgba(0,0,0,.55)');
    page = el(doc, 'div', 'position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#e9e0c8,#f6efdc);transform-origin:left center;backface-visibility:hidden;will-change:transform');
    label = el(doc, 'div', 'position:absolute;left:8px;right:8px;top:50%;transform:translateY(-50%);text-align:center;font:700 14px/1.3 var(--font-display, inherit);color:#f6c453;text-shadow:0 0 14px rgba(246,196,83,.8);opacity:0;will-change:opacity', String(o.name || 'New entry'));
    wrap.append(book, label, page); mount(host, doc, wrap);
  }
  return {
    id: 'codexFlip', durationMs: CODEX_MS,
    update(t) {
      if (!wrap) return;
      wrap.style.opacity = String(Math.min(seg(t, 0, 200), 1 - seg(t, 1350, 250)));
      page.style.transform = 'rotateY(' + (-170 * seg(t, 200, 650, ease.inOut)).toFixed(1) + 'deg)';
      const g = seg(t, 760, 300), pulse = 0.75 + 0.25 * Math.sin(Math.max(0, t - 760) / 120);
      label.style.opacity = String(g * pulse);
    },
    finish() { if (wrap && wrap.remove) wrap.remove(); wrap = null; },
  };
}

export function makePartDrop(host, opts) {
  const o = opts || {}; const doc = o.doc || (typeof document !== 'undefined' ? document : null);
  let tile = null; const tx = Number.isFinite(o.x) ? o.x : 0.5, ty = Number.isFinite(o.y) ? o.y : 0.45; // fractions of the host
  if (doc && host) {
    tile = el(doc, 'div', 'position:absolute;left:' + (tx * 100) + '%;top:' + (ty * 100) + '%;width:72px;height:72px;margin:-36px 0 0 -36px;pointer-events:none;z-index:95;border-radius:14px;background:#1d2740 center/70% no-repeat;border:1px solid rgba(246,196,83,.6);box-shadow:0 10px 24px rgba(0,0,0,.5),0 0 22px rgba(246,196,83,.3);opacity:0;will-change:transform,opacity');
    tile.setAttribute('aria-hidden', 'true'); tile.className = 'cine-part';
    if (o.src) tile.style.backgroundImage = 'url("' + String(o.src).replace(/"/g, '') + '")';
    mount(host, doc, tile);
  }
  return {
    id: 'partDrop', durationMs: PART_MS,
    update(t) {
      if (!tile) return;
      const fall = seg(t, 0, 380, ease.in), settle = seg(t, 380, 360, ease.settle), out = seg(t, 760, 140);
      const y = t < 380 ? -(1 - fall) * 220 : 0; // falls, lands, then squashes and settles in place
      const squash = t < 380 ? 1 : 1 + 0.12 * Math.sin(settle * Math.PI) * (1 - settle);
      tile.style.opacity = String(Math.min(seg(t, 0, 120), 1 - out));
      tile.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + (1 + (squash - 1) * 0.5).toFixed(3) + ',' + (2 - squash).toFixed(3) + ')';
    },
    finish() { if (tile && tile.remove) tile.remove(); tile = null; },
  };
}

// A short flight of small pieces from one point to another (Results: shards fly into the shard pill). 700 ms, canvas.
export const FLIGHT_MS = 700;
export function makeFlight(layer, opts) {
  const o = opts || {}; const n = Math.max(1, Math.min(12, o.count | 0 || 6)); const r = layer.pool.rnd;
  const from = o.from || { x: layer.w * 0.5, y: layer.h * 0.5 }, to = o.to || { x: layer.w * 0.8, y: 38 };
  const color = o.color || TOKENS.shard; const bits = [];
  for (let i = 0; i < n; i++) bits.push({ delay: i * 45, bend: (r() - 0.5) * 80 });
  return {
    id: 'flight', durationMs: FLIGHT_MS,
    update(t) {
      const ctx = layer.begin(); if (!ctx) return;
      for (const b of bits) {
        const k = (t - b.delay) / 480; if (k <= 0 || k >= 1) continue;
        const e = ease.inOut(k), x = from.x + (to.x - from.x) * e + Math.sin(e * Math.PI) * b.bend, y = from.y + (to.y - from.y) * e;
        ctx.globalAlpha = Math.min(1, k * 5) * (1 - 0.5 * e); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 3.5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 3.5, y); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    finish() { layer.clear(); },
  };
}
