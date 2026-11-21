// Plumbline speed lab (PERF-2). Plays one scripted Drop on the real renderer and records every frame.
// Query: biome (clay..abyss), quality (auto | high | low), seconds, w, h, dpr, particles (held at this many).
// The Drop is a worst case on purpose: a full rig, a full row of gems and dangers every step, chains and
// hits every step, high strain, and the particle count held at the cap. This stands in for a boss or
// encounter (the renderer has no boss picture of its own; it only draws events).
// Result: window.__perf (JSON). Plain JavaScript, no dependencies.
import { createRenderer } from '../src/render/index.js';
import { PART_KEYS } from '../src/render/partIcon.js';
import { BIOME_IDS } from '../src/render/palette.js';

const q = new URLSearchParams(location.search);
const P = {
  biome: BIOME_IDS.includes(q.get('biome')) ? q.get('biome') : 'clay',
  quality: ['auto', 'high', 'low'].includes(q.get('quality')) ? q.get('quality') : 'auto',
  seconds: Math.max(2, Math.min(120, Number(q.get('seconds')) || 20)),
  warm: Math.max(0, Math.min(30, q.has('warm') ? Number(q.get('warm')) : 6)), // seconds at the start that are played but not counted (textures are still being made)
  w: Number(q.get('w')) || 360, h: Number(q.get('h')) || 640, dpr: Number(q.get('dpr')) || 2,
  particles: Math.max(0, Math.min(300, q.has('particles') ? Number(q.get('particles')) : 300)),
  reduce: q.get('reduce') === '1',
};
const BIOME_START = { clay: 0, quartz: 100, amber: 250, magma: 450, void: 700, abyss: 1000 };
const BEAT_MS = 450, HAZ = ['rock', 'bat', 'root', 'steam', 'void'];
const cv = document.getElementById('cv'), out = document.getElementById('out');
if (q.get('bench') === 'depth') { runDepthBench(); } else { runDrop(); }

// Depth-layer-only timing: every stage is flushed so its own cost shows. ?bench=depth&level=high|medium&biome=clay
async function runDepthBench() {
  const { createDepth } = await import('../src/render/depth/index.js');
  const level = q.get('level') === 'medium' ? 'medium' : 'high', stages = {}, order = []; let tLast = 0, probeCtx = null;
  const prof = (name, g) => { try { g.getImageData(0, 0, 1, 1); } catch (e) { /* ignore */ } const t = performance.now(); if (name === 'start') { tLast = t; return; } stages[name] = (stages[name] || 0) + (t - tLast); if (!order.includes(name)) order.push(name); tLast = t; };
  const d = createDepth({ quality: level, govern: false, prof });
  cv.width = P.w * P.dpr; cv.height = P.h * P.dpr; const ctx = cv.getContext('2d'); ctx.setTransform(P.dpr, 0, 0, P.dpr, 0, 0);
  d.resize(P.w, P.h, P.dpr);
  const st = { depth: BIOME_START[P.biome] + 20, biomeId: P.biome, strain01: 0.8, danger: 0.8, speed: 1, bucket: { x: P.w / 2, y: P.h * 0.4 }, lanes: [P.w * 0.2, P.w * 0.4, P.w * 0.6, P.w * 0.8], laneCount: 4, arriveY: P.h * 0.62, w: P.w, h: P.h, time: 0 };
  const frames = Math.max(30, Math.round(P.seconds * 6)), tot = new Float32Array(frames); let k = 0, warm = 20;
  await new Promise((res) => { function f() { st.depth += 0.1; st.time += 16.7; d.update(16.7, st); const t0 = performance.now(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, P.w, P.h); const ok = d.drawWalls(ctx, st); d.drawForeground(ctx, st); ctx.getImageData(0, 0, 1, 1); const e = performance.now() - t0; if (warm > 0) { warm--; for (const n in stages) stages[n] = 0; } else tot[k++] = e; if (k >= frames) return res(); setTimeout(f, 0); } f(); });
  const sorted = Array.from(tot).sort((a, b) => a - b), per = {}; for (const n of order) per[n] = +(stages[n] / frames).toFixed(2);
  window.__perf = { bench: 'depth', level, biome: P.biome, throttleNote: 'set by runner', frames, medianMs: +sorted[frames >> 1].toFixed(2), p95Ms: +sorted[Math.floor(frames * 0.95)].toFixed(2), meanStageMs: per, active: d.debug().active };
  out.textContent = JSON.stringify(window.__perf, null, 1);
}
function runDrop() {

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const cols = 4, rows = 3, cells = [];
for (let r = 0, n = 0; r < rows; r++) { const row = []; for (let c = 0; c < cols; c++) row.push(PART_KEYS[n++ % PART_KEYS.length]); cells.push(row); }
const rig = { cols, rows, cells };
const S = { depth: BIOME_START[P.biome] + 20, beat: 0, strain: 82, max: 100, gold: 0, combo: 0 };
const view = () => ({ status: 'running', depth: S.depth, strain: S.strain, maxStrain: S.max, biomeId: P.biome, combo: S.combo, gold: S.gold });

const r = createRenderer(cv, { reduceMotion: P.reduce, quality: P.quality === 'low' ? 'low' : 'high' });
r.resize(P.w, P.h, P.dpr);
if (P.quality !== 'auto') r.setQuality(P.quality); else r.setQuality('auto');
r.setRun(view(), rig);
r.pushEvents([{ t: 'RUN_START', seed: 1 }, { t: 'BIOME', id: P.biome, depth: S.depth }]);
r.setRun(view(), rig);

function beatEvents() {
  S.beat++; S.depth++;
  const ev = [{ t: 'BEAT', i: S.beat, depth: S.depth, speed: 1 }];
  const lanes = [], outs = [];
  for (let c = 0; c < cols; c++) {
    const hazard = c === S.beat % cols || c === (S.beat + 2) % cols;
    const item = hazard ? { kind: 'hazard', tier: 1, hazard: HAZ[(S.beat + c) % 5], value: 0 } : { kind: rnd() < 0.2 ? 'relic' : 'gem', tier: 1 + Math.floor(rnd() * 6), value: 1 };
    lanes.push(item);
    const row = rows - 1;
    if (hazard) outs.push({ t: 'HAZARD', lane: c, hazard: item.hazard, absorbedBy: c % 2 ? { r: row, c } : null, strainDelta: c % 2 ? 0 : 4 });
    else {
      S.combo++; S.gold += 50;
      outs.push({ t: 'FIRE', r: row, c, partId: cells[row][c] }, { t: 'COLLECT', lane: c, item, gold: 50 + c, combo: S.combo, r: row, c });
      if (c < cols - 1) outs.push({ t: 'CHAIN', from: { r: row, c }, to: { r: row - 1, c: c + 1 } });
    }
  }
  ev.push({ t: 'SPAWN', i: S.beat, lanes }); for (const e of outs) ev.push(e);
  ev.push({ t: 'STRAIN', value: S.strain, max: S.max, delta: 0 });
  if (S.beat % 12 === 0) ev.push({ t: 'MILESTONE', depth: S.depth });
  return ev;
}

// Recording buffers are allocated once, so the lab itself adds no garbage during the run.
const N = Math.ceil((P.seconds + P.warm) * 130) + 600;
const gap = new Float32Array(N), js = new Float32Array(N), tierAt = new Uint8Array(N), partAt = new Uint16Array(N);
let n = 0, warmIdx = -1, last = 0, beatAcc = 0, t0 = 0, done = false, tierNow = 0;
const TIER_NAMES = ['high', 'medium', 'reduced', 'minimal'];
let tierChanges = '';

function loop(now) {
  if (done) return;
  if (!last) { last = now; t0 = now; requestAnimationFrame(loop); return; }
  const dt = now - last; last = now;
  beatAcc += dt; let evs = null;
  while (beatAcc >= BEAT_MS) { beatAcc -= BEAT_MS; evs = beatEvents(); r.setRun(view(), rig); r.pushEvents(evs); }
  const a = Math.min(1, beatAcc / BEAT_MS);
  if (n % 3 === 0) { const d = r.debugStats(); if (d.particles < P.particles) r.debugBurst(P.particles - d.particles); partAt[Math.min(n, N - 1)] = d.particles; if (d.tierStep !== tierNow) { tierChanges += ((now - t0) / 1000).toFixed(1) + 's:' + TIER_NAMES[d.tierStep] + (d.quality === 'low' ? '(low)' : '') + ' '; tierNow = d.tierStep; } }
  const s = performance.now(); r.frame(dt, a); const e = performance.now() - s;
  if (n < N) { gap[n] = dt; js[n] = e; tierAt[n] = tierNow; n++; }
  if (warmIdx < 0 && now - t0 >= P.warm * 1000) warmIdx = n;
  if (now - t0 >= (P.seconds + P.warm) * 1000) return finish();
  requestAnimationFrame(loop);
}
function pct(arr, count, p) { const c = Array.prototype.slice.call(arr, 0, count).sort((x, y) => x - y); return c.length ? c[Math.min(c.length - 1, Math.floor(p * c.length))] : 0; }
function finish() {
  done = true;
  const skip = Math.max(0, Math.min(n - 10, warmIdx < 0 ? 0 : warmIdx)); // frames after the warm-up
  const g = gap.subarray(skip, n), j = js.subarray(skip, n), m = g.length;
  const stat = (arr) => ({ median: +pct(arr, arr.length, 0.5).toFixed(2), p95: +pct(arr, arr.length, 0.95).toFixed(2), worst: +Math.max(...arr).toFixed(2) });
  let worstJs = 0, over = 0, stalls = 0, worstAt = 0, wv = 0, el = 0; for (let i = 0; i < m; i++) { if (g[i] > 25) over++; if (g[i] > 1000) stalls++; el += g[i]; if (g[i] > wv) { wv = g[i]; worstAt = el; worstJs = j[i]; } }
  let pcount = 0, pmax = 0; for (let i = 0; i < n; i += 3) { pcount++; if (partAt[i] > pmax) pmax = partAt[i]; }
  const d = r.debugStats();
  window.__perf = { biome: P.biome, quality: P.quality, reduce: P.reduce, w: P.w, h: P.h, dpr: P.dpr, seconds: P.seconds, warm: P.warm, frames: m,
    interval: stat(g), jsFrame: stat(j), overBudgetShare: +(over / m).toFixed(3), stalls, worstAtSec: +(worstAt / 1000).toFixed(1), worstDrawMs: +worstJs.toFixed(1), maxParticles: pmax, finalTier: TIER_NAMES[d.tierStep], finalQuality: d.quality, tierLog: tierChanges.trim(),
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null };
  out.textContent = JSON.stringify(window.__perf, null, 1);
}
requestAnimationFrame(loop);

}
