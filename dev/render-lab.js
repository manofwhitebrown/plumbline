// Plumbline render lab. A sandbox for the canvas: send every CONTRACT event with fake data,
// move strain / depth / biome, edit the rig (all 26 parts), and watch frame time and pool counters.
// Open with `npm run dev`, then /dev/render-lab.html. Plain JavaScript, no dependencies.
import { createRenderer } from '../src/render/index.js';
import { EVENT_NAMES } from '../src/render/effects.js';
import { PART_KEYS, draw as drawIcon, toDataURL } from '../src/render/partIcon.js';
import { BIOME_IDS } from '../src/render/palette.js';

const $ = (id) => document.getElementById(id);
const BEAT_MS = 450;
const BIOME_AT = [0, 100, 250, 450, 700, 1000];
const HAZARDS = ['rock', 'bat', 'root', 'steam', 'void'];
const SIZES = [['320 x 568', 320, 568], ['360 x 640', 360, 640], ['375 x 667', 375, 667], ['390 x 844', 390, 844], ['412 x 915', 412, 915], ['430 x 932', 430, 932],
  ['768 x 1024', 768, 1024], ['844 x 390 (sideways)', 844, 390], ['1024 x 768', 1024, 768], ['1440 x 900', 1440, 900]];

// ---- lab state --------------------------------------------------------------------------------
const S = {
  beat: 0, depth: 0, strain: 20, max: 100, biome: 'clay', combo: 0, gold: 0, status: 'running',
  w: 360, h: 640, dpr: 2, rig: { cols: 4, rows: 3, cells: [] }, pick: 'hook',
  row: null, extra: [], seed: 12345, hazardCycle: 0,
};
let renderer = null, paused = false, auto = true, acc = 0, lastNow = 0, destroyedOnce = false;

function rnd() { // small seeded random so a lab run can be repeated
  S.seed = (S.seed * 1664525 + 1013904223) >>> 0; return S.seed / 4294967296;
}
function log(msg, bad) {
  const el = $('log'); const d = document.createElement('div');
  d.textContent = new Date().toLocaleTimeString() + '  ' + msg; if (bad) d.style.color = '#ff4d5e';
  el.appendChild(d); while (el.childNodes.length > 80) el.removeChild(el.firstChild); el.scrollTop = el.scrollHeight;
}
window.addEventListener('error', (e) => log('ERROR ' + e.message, true));
window.addEventListener('unhandledrejection', (e) => log('ERROR ' + (e.reason && e.reason.message || e.reason), true));

// ---- rig --------------------------------------------------------------------------------------
function blankCells(cols, rows) { const c = []; for (let r = 0; r < rows; r++) c.push(new Array(cols).fill(null)); return c; }
function setGrid(cols, rows, keep) {
  const old = S.rig.cells, cells = blankCells(cols, rows);
  if (keep) for (let r = 0; r < Math.min(rows, old.length); r++) for (let c = 0; c < Math.min(cols, (old[r] || []).length); c++) cells[r][c] = old[r][c];
  S.rig = { cols, rows, cells };
}
function fillParts(from, to) {
  const { cols, rows } = S.rig; setGrid(cols, rows, false); let n = from;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (n < Math.min(to, PART_KEYS.length)) S.rig.cells[r][c] = PART_KEYS[n++];
  rigChanged();
}
function parts() { const out = []; for (let r = 0; r < S.rig.rows; r++) for (let c = 0; c < S.rig.cols; c++) if (S.rig.cells[r][c]) out.push({ r, c, id: S.rig.cells[r][c] }); return out; }
function partInColumn(c) { let hit = null; for (let r = 0; r < S.rig.rows; r++) if (S.rig.cells[r][c]) hit = { r, c, id: S.rig.cells[r][c] }; return hit; }
function rigChanged() { buildGrid(); pushView(); }

// ---- events -----------------------------------------------------------------------------------
function view() { return { status: S.status, depth: S.depth, strain: S.strain, maxStrain: S.max, biomeId: S.biome, combo: S.combo, gold: S.gold }; }
function pushView() { if (renderer) renderer.setRun(view(), S.rig); }
function send(events) { if (!renderer) return; renderer.pushEvents(events); for (const e of events) if (e.t !== 'BEAT' && e.t !== 'SPAWN' && e.t !== 'STRAIN') log(e.t + ' ' + JSON.stringify(e).slice(0, 90)); }

function emptyRow() { const lanes = []; for (let c = 0; c < S.rig.cols; c++) lanes.push({ kind: 'empty', tier: 1, value: 0 }); return { lanes, out: new Array(S.rig.cols).fill(null) }; }
function freeLane(row) { for (let k = 0; k < S.rig.cols; k++) { const c = (Math.floor(rnd() * S.rig.cols) + k) % S.rig.cols; if (row.lanes[c].kind === 'empty') return c; } return Math.floor(rnd() * S.rig.cols); }
function collectOutcome(lane, item) {
  const p = partInColumn(lane) || { r: S.rig.rows - 1, c: lane, id: 'hook' };
  S.combo++; const gold = Math.round(item.tier * item.tier * 3 * (1 + 0.1 * Math.min(S.combo, 10))); S.gold += gold;
  const ev = [{ t: 'FIRE', r: p.r, c: p.c, partId: p.id }, { t: 'COLLECT', lane, item, gold, combo: S.combo, r: p.r, c: p.c }];
  const nb = parts().find((q) => q.c === lane + 1 || q.c === lane - 1); if (nb && rnd() < 0.5) ev.splice(1, 0, { t: 'CHAIN', from: { r: p.r, c: p.c }, to: { r: nb.r, c: nb.c } });
  return ev;
}
function missOutcome(lane, item) { S.combo = 0; return [{ t: 'MISS', lane, item }]; }
function hazardOutcome(lane, item, absorb) {
  const a = absorb ? (parts().find((p) => p.id === 'shield' || p.id === 'plate') || parts()[0] || { r: 0, c: lane }) : null;
  return [{ t: 'HAZARD', lane, hazard: item.hazard, absorbedBy: a ? { r: a.r, c: a.c } : null, strainDelta: a ? 0 : 3 + Math.floor(rnd() * 4) }];
}
function place(row, kind, tier, hazard, outcome) { // put one item in a free lane of the pending row
  const lane = freeLane(row), item = { kind, tier, hazard, value: Math.pow(3, tier - 1) };
  if (kind === 'hazard') item.hazard = hazard || HAZARDS[Math.floor(rnd() * HAZARDS.length)];
  row.lanes[lane] = item; row.out[lane] = outcome ? () => outcome(lane, item) : null;
}
function pendingRow() { if (!S.row) S.row = emptyRow(); return S.row; }

function randomRow() {
  const row = emptyRow();
  for (let c = 0; c < S.rig.cols; c++) {
    const roll = rnd(), tier = 1 + Math.min(5, Math.floor(-Math.log(1 - rnd() * 0.97) * 1.4));
    if (roll < 0.15) place1(row, c, 'hazard', 1, HAZARDS[Math.floor(rnd() * 5)], (l, it) => hazardOutcome(l, it, rnd() < 0.4));
    else if (roll < 0.3) place1(row, c, 'ore', 1, null, (l, it) => (rnd() < 0.6 ? collectOutcome(l, it) : missOutcome(l, it)));
    else if (roll < 0.36) place1(row, c, 'relic', 3, null, (l, it) => collectOutcome(l, it));
    else if (roll < 0.46) { /* empty lane */ }
    else place1(row, c, 'gem', tier, null, (l, it) => (partInColumn(l) && rnd() < 0.8 ? collectOutcome(l, it) : missOutcome(l, it)));
  }
  return row;
}
function place1(row, c, kind, tier, hazard, outcome) { const item = { kind, tier, hazard: hazard || undefined, value: Math.pow(3, tier - 1) }; row.lanes[c] = item; row.out[c] = () => outcome(c, item); }

function doBeat() {
  S.beat++; S.depth += 1;
  const ev = [{ t: 'BEAT', i: S.beat, depth: S.depth, speed: 1 }];
  if (S.depth % 50 === 0) ev.push({ t: 'MILESTONE', depth: S.depth });
  const row = S.row || (auto ? randomRow() : null); S.row = null;
  let outs = [];
  if (row) { ev.push({ t: 'SPAWN', i: S.beat, lanes: row.lanes }); for (let c = 0; c < row.out.length; c++) if (row.out[c]) outs = outs.concat(row.out[c]()); }
  for (const e of outs) ev.push(e);
  for (const e of S.extra) ev.push(e); S.extra = [];
  ev.push({ t: 'STRAIN', value: S.strain, max: S.max, delta: 0 });
  if (S.auto_biome) { let b = 0; for (let i = 0; i < BIOME_AT.length; i++) if (S.depth >= BIOME_AT[i]) b = i; if (BIOME_IDS[b] !== S.biome) setBiome(BIOME_IDS[b], false); }
  pushView(); renderer.pushEvents(ev);
  $('sDepth').value = Math.min(1500, S.depth); $('vDepth').textContent = S.depth + ' m';
}
function setBiome(id, quiet) {
  S.biome = id; $('sBiome').value = BIOME_IDS.indexOf(id); $('vBiome').textContent = id;
  if (renderer) { renderer.pushEvents([{ t: 'BIOME', id, depth: S.depth }]); pushView(); }
  if (!quiet) log('BIOME ' + id);
}
function restart() {
  S.beat = 0; S.depth = 0; S.combo = 0; S.gold = 0; S.status = 'running'; S.row = null; S.extra = [];
  send([{ t: 'RUN_START', seed: 1 }]); pushView();
  $('sDepth').value = 0; $('vDepth').textContent = '0 m';
}

const BUTTONS = [
  ['RUN_START', restart],
  ['BEAT (step)', () => doBeat()],
  ['SPAWN row', () => { S.row = randomRow(); S.row.out.fill(null); log('SPAWN queued for the next beat'); }],
  ['FIRE', () => { const p = parts(); const q = p.length ? p[Math.floor(rnd() * p.length)] : { r: 0, c: 0, id: 'hook' }; S.extra.push({ t: 'FIRE', r: q.r, c: q.c, partId: q.id }); }],
  ['CHAIN', () => { const p = parts(); if (p.length < 2) return log('Put 2 parts in the rig first.'); const a = p[Math.floor(rnd() * p.length)]; let b = p[Math.floor(rnd() * p.length)]; if (b === a) b = p[(p.indexOf(a) + 1) % p.length]; S.extra.push({ t: 'CHAIN', from: { r: a.r, c: a.c }, to: { r: b.r, c: b.c } }); }],
  ['COLLECT gem', () => place(pendingRow(), 'gem', 1 + Math.floor(rnd() * 5), null, collectOutcome)],
  ['COLLECT prism (tier 6)', () => place(pendingRow(), 'gem', 6, null, collectOutcome)],
  ['COLLECT relic', () => place(pendingRow(), 'relic', 3, null, collectOutcome)],
  ['MISS', () => place(pendingRow(), 'gem', 2, null, missOutcome)],
  ['HAZARD hits rope', () => { S.hazardCycle = (S.hazardCycle + 1) % 5; place(pendingRow(), 'hazard', 1, HAZARDS[S.hazardCycle], (l, it) => hazardOutcome(l, it, false)); }],
  ['HAZARD absorbed', () => place(pendingRow(), 'hazard', 1, 'rock', (l, it) => hazardOutcome(l, it, true))],
  ['All hazards in one row', () => { const row = pendingRow(); for (let c = 0; c < S.rig.cols; c++) row.lanes[c] = { kind: 'hazard', tier: 1, hazard: HAZARDS[c % 5], value: 0 }, row.out[c] = ((cc) => () => hazardOutcome(cc, row.lanes[cc], false))(c); }],
  ['All gem tiers in one row', () => { const row = pendingRow(); for (let c = 0; c < S.rig.cols; c++) { const t = c + 1 + (c === S.rig.cols - 1 ? 1 : 0); row.lanes[c] = { kind: 'gem', tier: Math.min(6, t), value: 1 }; row.out[c] = ((cc) => () => collectOutcome(cc, row.lanes[cc]))(c); } }],
  ['STRAIN', () => { S.strain = Math.min(S.max, S.strain + 10); $('sStrain').value = S.strain; $('vStrain').textContent = Math.round(S.strain); send([{ t: 'STRAIN', value: S.strain, max: S.max, delta: 10 }]); pushView(); }],
  ['BIOME (next)', () => setBiome(BIOME_IDS[(BIOME_IDS.indexOf(S.biome) + 1) % BIOME_IDS.length])],
  ['MILESTONE', () => send([{ t: 'MILESTONE', depth: Math.round(S.depth / 50) * 50 }])],
  ['SNAP', () => { S.status = 'snapped'; send([{ t: 'SNAP', goldLost: 70, goldKept: 30 }]); }],
  ['HAUL', () => { S.status = 'hauled'; send([{ t: 'HAUL', gold: S.gold, depth: S.depth }]); }],
  ['RECORD', () => send([{ t: 'RECORD', depth: S.depth }])],
];
function buildButtons() {
  const wrap = $('events'); BUTTONS.forEach(([name, fn]) => { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { try { fn(); } catch (e) { log('ERROR ' + e.message, true); } }; wrap.appendChild(b); });
  const names = BUTTONS.map((b) => b[0].split(' ')[0].replace(/\(.*/, '')); const missing = EVENT_NAMES.filter((n) => !names.includes(n));
  if (missing.length) log('Buttons missing for: ' + missing.join(', '), true);
}

// ---- rig editor and icon gallery --------------------------------------------------------------
function buildPalette() {
  const wrap = $('palette'); wrap.textContent = '';
  const mk = (id, label) => { const b = document.createElement('button'); b.dataset.id = id || ''; if (id) { const im = new Image(); im.src = toDataURL(id, 80); im.alt = ''; b.appendChild(im); } const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
    b.onclick = () => { S.pick = id; for (const x of wrap.children) x.classList.toggle('on', x === b); }; wrap.appendChild(b); return b; };
  mk(null, 'erase'); PART_KEYS.forEach((k) => mk(k, k));
  for (const x of wrap.children) if (x.dataset.id === S.pick) x.classList.add('on');
}
function buildGrid() {
  const g = $('grid'); g.textContent = ''; g.style.gridTemplateColumns = 'repeat(' + S.rig.cols + ', 52px)';
  for (let r = 0; r < S.rig.rows; r++) for (let c = 0; c < S.rig.cols; c++) {
    const id = S.rig.cells[r][c], b = document.createElement('button'); b.className = 'cell' + (id ? '' : ' empty'); b.title = id || 'empty';
    if (id) { const im = new Image(); im.src = toDataURL(id, 80); im.alt = id; b.appendChild(im); }
    b.onclick = () => { S.rig.cells[r][c] = S.pick; rigChanged(); };
    b.oncontextmenu = (e) => { e.preventDefault(); S.rig.cells[r][c] = null; rigChanged(); };
    g.appendChild(b);
  }
}
function drawGallery() {
  const cv = $('gal'), dpr = Math.min(3, window.devicePixelRatio || 1), W = 860, pad = 8;
  const rows96 = Math.ceil(PART_KEYS.length / 8), H = 24 + pad * 2 + 20 + rows96 * (96 + 22) + 10;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#141b2e'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#8d97b8'; g.font = '11px system-ui'; g.fillText('24 px', pad, 12);
  PART_KEYS.forEach((k, i) => drawIcon(g, k, pad + i * 32, 18, 24, 'idle'));
  g.fillText('96 px (idle, then the first row again as firing)', pad, 62);
  PART_KEYS.forEach((k, i) => { const x = pad + (i % 8) * 104, y = 68 + Math.floor(i / 8) * 118; drawIcon(g, k, x, y, 96, i < 8 ? 'firing' : 'idle'); g.fillStyle = '#8d97b8'; g.fillText(k, x, y + 108); });
}

// ---- size, quality, motion --------------------------------------------------------------------
function applySize() {
  if (!renderer) return; renderer.resize(S.w, S.h, S.dpr);
  const f = $('frame'); f.style.width = S.w + 'px'; f.style.height = S.h + 'px';
  document.querySelector('.zone.top').style.height = '88px'; const zb = document.querySelector('.zone.bottom'); zb.style.height = '120px';
  pushView();
}
function boot() {
  if (renderer) renderer.destroy();
  const q = $('qSel').value;
  renderer = createRenderer($('cv'), { reduceMotion: $('cReduce').checked, quality: q === 'low' ? 'low' : 'high' });
  if (q !== 'auto') renderer.setQuality(q);
  applySize(); restart();
}

// ---- stats ------------------------------------------------------------------------------------
const times = new Float32Array(120); let ti = 0, tn = 0, fpsFrames = 0, fpsT = 0, fps = 0, heapLast = 0, allocBytes = 0, allocT = 0, allocRate = 0;
function stat(label, value, cls) { return '<div><span>' + label + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + value + '</b></div>'; }
function updateStats(dt) {
  times[ti] = dt; ti = (ti + 1) % times.length; tn = Math.min(tn + 1, times.length);
  fpsFrames++; fpsT += dt; if (fpsT >= 500) { fps = fpsFrames * 1000 / fpsT; fpsFrames = 0; fpsT = 0; }
  let sum = 0, max = 0, slow = 0; for (let i = 0; i < tn; i++) { sum += times[i]; if (times[i] > max) max = times[i]; if (times[i] > 24) slow++; }
  const pm = performance.memory; if (pm) { const d = pm.usedJSHeapSize - heapLast; if (d > 0 && heapLast) allocBytes += d; heapLast = pm.usedJSHeapSize; allocT += dt; if (allocT >= 1000) { allocRate = allocBytes / (allocT / 1000) / 1024; allocBytes = 0; allocT = 0; } }
  if (ti % 6) return;
  const d = renderer ? renderer.debugStats() : {}, sr = renderer ? renderer.safeRect() : {};
  $('stats').innerHTML = stat('FPS', fps.toFixed(0), fps >= 55 ? 'good' : fps < 40 ? 'bad' : '') + stat('frame ms (avg)', (sum / Math.max(1, tn)).toFixed(1)) + stat('frame ms (max)', max.toFixed(1), max > 24 ? 'bad' : '') + stat('slow frames', slow + ' / ' + tn)
    + stat('particles', d.particles + ' / 300', d.particles >= 300 ? 'bad' : '') + stat('floaters', d.floaters) + stat('items', d.items) + stat('rings', d.rings) + stat('threads', d.threads) + stat('streaks', d.streaks) + stat('recycled slots', d.recycled)
    + stat('quality', d.quality) + stat('canvas', d.width + 'x' + d.height + ' @' + d.dpr + 'x') + stat('column', d.column + ' px') + stat('safe band', sr.top + '..' + sr.bottom) + stat('bucket', sr.bucketTop + '..' + sr.bucketBottom)
    + (pm ? stat('JS heap', (pm.usedJSHeapSize / 1048576).toFixed(1) + ' MB') + stat('allocation', allocRate.toFixed(0) + ' KB/s', allocRate > 150 ? 'bad' : 'good') : '');
  $('statsNote').textContent = pm ? 'Allocation counts heap growth between garbage collections (Chrome only). Near 0 KB/s with auto-run off means no per-frame garbage.' : 'Heap numbers need Chrome.';
}

// ---- main loop --------------------------------------------------------------------------------
function loop(now) {
  requestAnimationFrame(loop);
  const dt = lastNow ? now - lastNow : 16; lastNow = now;
  if (!paused) { acc += Math.min(dt, 250); while (acc >= BEAT_MS) { acc -= BEAT_MS; try { doBeat(); } catch (e) { log('ERROR ' + e.message, true); } } }
  if (renderer) renderer.frame(dt, Math.min(0.999, acc / BEAT_MS));
  updateStats(dt);
}

// ---- wire up the controls ---------------------------------------------------------------------
function wire() {
  $('sStrain').oninput = (e) => { S.strain = +e.target.value; $('vStrain').textContent = S.strain; send([{ t: 'STRAIN', value: S.strain, max: S.max, delta: 0 }]); pushView(); };
  $('sDepth').oninput = (e) => { S.depth = +e.target.value; $('vDepth').textContent = S.depth + ' m'; if (S.auto_biome) { let b = 0; for (let i = 0; i < BIOME_AT.length; i++) if (S.depth >= BIOME_AT[i]) b = i; setBiome(BIOME_IDS[b], true); } pushView(); };
  $('sBiome').oninput = (e) => setBiome(BIOME_IDS[+e.target.value]);
  $('cAutoBiome').onchange = (e) => { S.auto_biome = e.target.checked; };
  $('cAutoRun').onchange = (e) => { auto = e.target.checked; };
  $('cPause').onchange = (e) => { paused = e.target.checked; };
  $('cReduce').onchange = (e) => { renderer.setReduceMotion(e.target.checked); log('Reduce motion ' + (e.target.checked ? 'on' : 'off')); };
  $('qSel').onchange = () => { boot(); log('Quality: ' + $('qSel').value); };
  const sel = $('sizeSel'); SIZES.forEach(([n, w, h], i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; sel.appendChild(o); }); sel.value = 1;
  sel.onchange = () => { const s = SIZES[+sel.value]; S.w = s[1]; S.h = s[2]; applySize(); };
  $('dprSel').onchange = (e) => { S.dpr = +e.target.value; applySize(); log('Pixel density ' + S.dpr + (S.dpr > 2 ? ' (the renderer caps it at 2)' : '')); };
  $('bRotate').onclick = () => { const t = S.w; S.w = S.h; S.h = t; applySize(); };
  $('bJitter').onclick = () => { const w0 = S.w, h0 = S.h; let n = 0; const id = setInterval(() => { const s = SIZES[Math.floor(rnd() * SIZES.length)]; S.w = s[1]; S.h = s[2]; applySize(); if (++n > 20) { clearInterval(id); S.w = w0; S.h = h0; applySize(); log('Resize storm done: no errors.'); } }, 150); };
  $('cZones').onchange = (e) => { $('frame').classList.toggle('show-zones', e.target.checked); document.querySelector('.zone.bottom').style.display = e.target.checked ? 'block' : 'none'; };
  $('bStress').onclick = () => { for (let i = 0; i < 6; i++) setTimeout(() => renderer.debugBurst(60), i * 120); };
  $('bDestroy').onclick = () => { renderer.destroy(); renderer.destroy(); renderer.frame(16, 0); renderer.pushEvents([{ t: 'SNAP' }]); log('destroy x2, then frame and events after destroy: no errors'); setTimeout(boot, 300); };
  $('bHide').onclick = () => { renderer.setHidden(true); log('Hidden for 3 s...'); setTimeout(() => { renderer.setHidden(false); renderer.frame(3000, 0.5); log('Back. Quality is still ' + renderer.debugStats().quality); }, 3000); };
  $('rCols').onchange = (e) => { setGrid(+e.target.value, S.rig.rows, true); rigChanged(); };
  $('rRows').onchange = (e) => { setGrid(S.rig.cols, +e.target.value, true); rigChanged(); };
  $('bFillA').onclick = () => fillParts(0, 20); $('bFillB').onclick = () => fillParts(6, 26);
  $('bClear').onclick = () => { setGrid(S.rig.cols, S.rig.rows, false); rigChanged(); };
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|SELECT|BUTTON/.test(e.target.tagName)) { e.preventDefault(); doBeat(); } });
  document.addEventListener('visibilitychange', () => { if (renderer) renderer.setHidden(document.hidden); if (!document.hidden) { lastNow = 0; acc = 0; } });
}

setGrid(4, 3, false); fillParts(0, 12); buildButtons(); buildPalette(); drawGallery(); wire(); boot();
window.lab = { S, get renderer() { return renderer; }, doBeat, send, restart, boot, BUTTONS };
requestAnimationFrame(loop);
