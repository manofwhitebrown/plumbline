// Plumbline motion lab. Fires every MOTION-1 moment on a fake Drop frame so it can be watched at 0.25x to 2x,
// with and without Reduce motion, while a meter records frame times. Plain JavaScript, no dependencies.
import { createStage } from '../src/ui/motion/stage.js';
import { wireDirector } from '../src/ui/motion/wiring.js';
import { createTransitions } from '../src/ui/motion/transitions.js';
import { _resetDropCount } from '../src/render/cinematics/dropStart.js';
import { BIOME_IDS, BIOMES } from '../src/render/palette.js';

const $ = (id) => document.getElementById(id);
const frame = $('frame');
const lab = { reduce: false, speed: 1 };
const log = (m) => { const el = $('log'); const d = document.createElement('div'); d.textContent = (performance.now() / 1000).toFixed(2) + 's  ' + m; el.append(d); while (el.childNodes.length > 120) el.removeChild(el.firstChild); el.scrollTop = el.scrollHeight; };

const stage = createStage({ isReduced: () => lab.reduce, cue: (kind, k) => log('cue ' + kind + ':' + k) });
const handlers = {};
const bus = { on: (n, f) => { (handlers[n] = handlers[n] || []).push(f); return () => {}; }, emit: (n, p) => (handlers[n] || []).forEach((f) => f(p)) };
wireDirector({ bus, stage, getHost: () => frame, biomeName: (id) => id[0].toUpperCase() + id.slice(1) });

let depthN = 100;
const ev = (events) => bus.emit('run:events', { events });
function go(kind) {
  const done = (what) => () => log(what + ' onGo (should be exactly once per play)');
  const ok = {
    'drop-full': () => { _resetDropCount(); return stage.playBlocking(frame, 'drop', { variant: 'full', parts: 6, onGo: done('drop start') }); },
    'drop-quick': () => stage.playBlocking(frame, 'drop', { variant: 'quick', parts: 6, onGo: done('drop start (quick)') }),
    haul: () => stage.playBlocking(frame, 'haul', { onGo: done('haul finish') }),
    snap: () => stage.playBlocking(frame, 'snap', { onGo: done('snap drama') }),
    record: () => { depthN += 12; ev([{ t: 'RECORD', depth: depthN }]); return true; },
    milestone: () => { depthN += 50; ev([{ t: 'MILESTONE', depth: depthN }]); return true; },
    'biome+milestone': () => { ev([{ t: 'MILESTONE', depth: 250 }, { t: 'BIOME', id: 'amber', depth: 250 }]); return true; },
    newrun: () => { bus.emit('run:started', {}); return true; },
  }[kind];
  if (!ok) return;
  const r = ok(); log(kind + (r === false ? ' refused (busy or duplicate)' : ' started') + (lab.reduce ? ' [reduce motion]' : ''));
}
document.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => go(b.dataset.m)));
const biomesRow = $('biomes');
for (const id of BIOME_IDS) { const b = document.createElement('button'); b.textContent = 'Biome card: ' + id; b.style.borderColor = BIOMES[id].glow; b.addEventListener('click', () => { ev([{ t: 'BIOME', id, depth: 100 }]); log('biome ' + id); }); biomesRow.append(b); }

$('speed').addEventListener('input', (e) => { lab.speed = Number(e.target.value); stage.director.setSpeed(lab.speed); $('speedv').textContent = lab.speed + 'x'; });
$('reduce').addEventListener('change', (e) => { lab.reduce = e.target.checked; stage.director.setReduce(lab.reduce); log('Reduce motion ' + (lab.reduce ? 'on' : 'off')); });
$('zones').addEventListener('change', (e) => document.body.classList.toggle('hide-zones', !e.target.checked));
$('skip').addEventListener('click', () => { stage.skip(); log('skipped'); });
frame.addEventListener('pointerdown', () => { if (stage.busy) log('tap: skipped'); });

// ---- sequence and stress --------------------------------------------------------------------
$('seq').addEventListener('click', async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const k of ['drop-full', 'biome-quartz', 'milestone', 'record', 'snap', 'haul']) {
    if (k.startsWith('biome-')) { ev([{ t: 'BIOME', id: k.slice(6), depth: 100 }]); log('biome quartz'); } else go(k);
    while (stage.busy) await wait(100); await wait(250);
  }
  log('sequence done');
});
$('stress').addEventListener('click', () => {
  // Keep the overlay pool full (300) for 6 s while a record plays, and watch the frame time.
  stage.playMoment(frame, { id: 'stress', priority: 3, dedupeMs: 0, build: ({ layer }) => {
    const L = layer(); let acc = 0;
    return { id: 'stress', durationMs: 6000, update(t) {
      const ctx = L.begin(); if (!ctx) return; const w = L.w, h = L.h;
      while (L.pool.live < 300) L.pool.emit(Math.random() * w, h * (0.2 + Math.random() * 0.6), (Math.random() - 0.5) * 60, -20 - Math.random() * 40, 800 + Math.random() * 800, 1.5, '#ffe3a1', 0, (acc++ % 3) ? 0 : 3);
      L.pool.update(16); L.pool.draw(ctx);
    }, finish() { L.clear(); } };
  } });
  ev([{ t: 'RECORD', depth: ++depthN }]); log('stress: 300 particles for 6 s');
});

// ---- transitions demo -----------------------------------------------------------------------
const demo = $('demo'), scr = $('scr');
const tr = createTransitions({ isReduced: () => lab.reduce });
document.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => {
  const [from, to, back] = b.dataset.t.split(':');
  scr.textContent = from;
  const tok = tr.before(scr, from, to, back === 'back');
  scr.textContent = to; tr.after(tok);
  log('transition ' + from + ' to ' + to + (back ? ' (back)' : ''));
}));

// ---- frame meter ----------------------------------------------------------------------------
const times = []; let last = 0, over = 0, frames = 0;
function meter(now) {
  if (last) { const d = now - last; times.push(d); frames++; if (d > 20) over++; if (times.length > 600) times.shift(); }
  last = now; requestAnimationFrame(meter);
}
requestAnimationFrame(meter);
$('resetm').addEventListener('click', () => { times.length = 0; over = 0; frames = 0; });
setInterval(() => {
  if (!times.length) return;
  const s = times.slice().sort((a, b) => a - b); const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = s[Math.floor(s.length * 0.95)], max = s[s.length - 1];
  const row = (k, v, cls) => '<div><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
  $('stats').innerHTML = row('average', avg.toFixed(1) + ' ms', avg <= 17.5 ? 'good' : 'bad') + row('95th percentile', p95.toFixed(1) + ' ms', p95 <= 20 ? 'good' : 'bad') + row('worst', max.toFixed(1) + ' ms', max <= 33 ? 'good' : 'bad')
    + row('frames over 20 ms', over + ' of ' + frames, over / Math.max(1, frames) < 0.02 ? 'good' : 'bad') + row('playing', stage.busy ? (stage.director.current ? stage.director.current.id : 'queued') : 'idle') + row('speed', lab.speed + 'x');
}, 500);
log('lab ready');
