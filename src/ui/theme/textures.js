// Texture and backdrop painters (UIART-1). Pure canvas 2D, seeded, so the same seed always
// gives the same pixels. Nothing here touches the DOM unless installTextures() is called,
// and every entry point is safe when canvas is missing (it just does nothing).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

function glow(ctx, x, y, r, [R, G, B], a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(R, G, B, a));
  g.addColorStop(1, rgba(R, G, B, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function vgrad(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function stars(ctx, w, h, rnd, n, maxY, alpha = 0.7) {
  for (let i = 0; i < n; i++) {
    const s = rnd() < 0.15 ? 1.4 : 0.8;
    ctx.fillStyle = rgba(255, 240, 215, alpha * (0.35 + rnd() * 0.65));
    ctx.fillRect(rnd() * w, rnd() * maxY, s, s);
  }
}
function hills(ctx, w, y, amp, color, rnd, steps = 8) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, y + amp * (rnd() - 0.5));
  for (let i = 1; i <= steps; i++) ctx.lineTo((w * i) / steps, y + amp * (rnd() - 0.5));
  ctx.lineTo(w, 9999); ctx.lineTo(0, 9999); ctx.closePath(); ctx.fill();
}

// ---- Tileable material textures (128 x 128) ----
export function paintMetal(ctx, w, h, seed = 11) {
  const rnd = mulberry32(seed);
  vgrad(ctx, w, h, [[0, '#222c45'], [0.5, '#1a2239'], [1, '#161d33']]);
  for (let y = 0; y < h; y++) {
    const light = rnd() < 0.5;
    ctx.fillStyle = light ? rgba(190, 205, 240, 0.01 + rnd() * 0.025) : rgba(0, 0, 8, 0.03 + rnd() * 0.06);
    ctx.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 90; i++) { ctx.fillStyle = rgba(200, 215, 255, rnd() * 0.035); ctx.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 30, 1); }
}
export function paintLeather(ctx, w, h, seed = 23) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#2e2019'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    const x = rnd() * w, y = rnd() * h, r = 1.2 + rnd() * 3.2;
    ctx.fillStyle = rnd() < 0.5 ? rgba(0, 0, 0, 0.05 + rnd() * 0.08) : rgba(255, 190, 130, 0.012 + rnd() * 0.02);
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 6.2832); ctx.fill(); }
  }
  for (let i = 0; i < 14; i++) { ctx.strokeStyle = rgba(0, 0, 0, 0.1); ctx.lineWidth = 0.7; ctx.beginPath(); const x = rnd() * w, y = rnd() * h; ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30); ctx.stroke(); }
}
export function paintStone(ctx, w, h, seed = 37) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#2a2d3b'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = rnd() * h, r = 3 + rnd() * 14;
    ctx.fillStyle = rnd() < 0.5 ? rgba(8, 8, 18, 0.07 + rnd() * 0.1) : rgba(200, 205, 230, 0.02 + rnd() * 0.035);
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 6.2832); ctx.fill(); }
  }
  for (let i = 0; i < 2000; i++) { ctx.fillStyle = rgba(rnd() < 0.5 ? 0 : 255, rnd() < 0.5 ? 0 : 255, 255, 0.04 * rnd()); ctx.fillRect(rnd() * w, rnd() * h, 1, 1); }
}
export function paintGrain(ctx, w, h, seed = 51) {
  const rnd = mulberry32(seed);
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.35; i++) { const d = rnd() < 0.5; ctx.fillStyle = d ? rgba(0, 0, 0, 0.1 * rnd()) : rgba(255, 255, 255, 0.05 * rnd()); ctx.fillRect(rnd() * w, rnd() * h, 1, 1); }
}
export const TILES = { metal: paintMetal, leather: paintLeather, stone: paintStone, grain: paintGrain };

// ---- Screen backdrops (painted once each, then cached) ----
function home(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#1c1233'], [0.38, '#4a2a4c'], [0.55, '#7a4636'], [0.62, '#1a1220'], [1, '#07060d']]);
  stars(ctx, w, h, rnd, 70, h * 0.4, 0.8);
  glow(ctx, w * 0.5, h * 0.56, w * 0.9, [255, 150, 90], 0.35);
  hills(ctx, w, h * 0.6, 14, '#15101c', rnd);
  // the well rim: a ring of stones seen at a slant
  const cx = w / 2, cy = h * 0.74;
  ctx.fillStyle = '#0a0710'; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.34, h * 0.07, 0, 0, 6.2832); ctx.fill();
  // a low stone wall: two stacked rows of blocks, the front row catching the dusk light
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * 6.2832 + row * 0.09, front = Math.sin(a) > -0.15;
      if (!front && row === 1) continue;
      const x = cx + Math.cos(a) * w * 0.35, y = cy + Math.sin(a) * h * 0.07 + (row ? 7 : 0) * (front ? 1 : 0);
      const lit = (front ? 0.5 : 0.22) * (0.8 + rnd() * 0.4) * (row ? 0.7 : 1);
      ctx.fillStyle = rgba(86 * lit + 14, 66 * lit + 12, 72 * lit + 18, 1);
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.055, h * 0.018, 0, 0, 6.2832); ctx.fill();
    }
  }
  glow(ctx, cx, cy, w * 0.3, [255, 190, 120], 0.12);
}
function rig(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#1d140e'], [0.6, '#2b1b11'], [1, '#120b07']]);
  for (let x = 0; x < w; x += 22) { ctx.fillStyle = rgba(0, 0, 0, 0.25); ctx.fillRect(x, 0, 2, h * 0.7); }
  glow(ctx, w * 0.2, h * 0.14, w * 0.9, [255, 190, 110], 0.5);
  ctx.fillStyle = '#0f0805'; ctx.fillRect(0, h * 0.74, w, h * 0.26);
  for (let y = h * 0.74; y < h; y += 7) { ctx.fillStyle = rgba(255, 190, 120, 0.05 * rnd()); ctx.fillRect(0, y, w, 1); }
  ctx.fillStyle = '#3a2616'; ctx.fillRect(0, h * 0.73, w, 4);
  // hanging tools
  ctx.strokeStyle = rgba(110, 100, 90, 0.55); ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { const x = w * (0.55 + i * 0.1); ctx.beginPath(); ctx.arc(x, h * 0.3, 7 + i * 2, 0, 6.2832); ctx.moveTo(x, h * 0.3 + 7 + i * 2); ctx.lineTo(x, h * 0.3 + 40 + i * 6); ctx.stroke(); }
  // the lamp itself
  ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.arc(w * 0.2, h * 0.14, 4, 0, 6.2832); ctx.fill();
}
function crew(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#0b1230'], [0.5, '#1a2447'], [0.72, '#2a2740'], [1, '#09080f']]);
  stars(ctx, w, h, rnd, 80, h * 0.55, 0.8);
  hills(ctx, w, h * 0.7, 18, '#11101c', rnd, 7);
  glow(ctx, w * 0.5, h * 0.84, w * 0.8, [255, 140, 70], 0.4);
  for (const [x, s] of [[0.18, 1], [0.82, 0.8]]) {
    const cx = w * x, by = h * 0.85, tw = 70 * s, th = 80 * s;
    ctx.fillStyle = '#17131f'; ctx.beginPath(); ctx.moveTo(cx - tw, by); ctx.lineTo(cx, by - th); ctx.lineTo(cx + tw, by); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(255, 150, 80, 0.2); ctx.beginPath(); ctx.moveTo(cx - 12 * s, by); ctx.lineTo(cx, by - 34 * s); ctx.lineTo(cx + 12 * s, by); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#ff9a4d'; ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.8); ctx.lineTo(w * 0.5 - 7, h * 0.85); ctx.lineTo(w * 0.5 + 7, h * 0.85); ctx.closePath(); ctx.fill();
}
function workshop(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#120b0c'], [0.7, '#1f0f0d'], [1, '#2c0f08']]);
  for (let y = 0; y < h; y += 20) for (let x = (y / 20) % 2 ? -20 : 0; x < w; x += 40) { ctx.fillStyle = rgba(255, 120, 60, 0.03 + 0.03 * rnd()); ctx.fillRect(x + 1, y + 1, 38, 18); }
  glow(ctx, w * 0.5, h * 0.95, w * 1.1, [255, 100, 40], 0.65);
  glow(ctx, w * 0.5, h * 0.9, w * 0.5, [255, 190, 90], 0.35);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba(255, 170 + rnd() * 60, 80, 0.2 + rnd() * 0.5); ctx.fillRect(w * (0.25 + rnd() * 0.5), h * (0.4 + rnd() * 0.55), 1.6, 1.6); }
  for (const [x0, x1] of [[0, w * 0.22], [w, w * 0.78]]) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(6,3,3,.92)'); g.addColorStop(1, 'rgba(6,3,3,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), h);
  }
}
function codex(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#120e18'], [1, '#08060c']]);
  const rows = 6, rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = 4;
    while (x < w - 6) {
      const bw = 7 + rnd() * 11, bh = rh * (0.55 + rnd() * 0.3), hue = rnd();
      const c = hue < 0.33 ? [70, 28, 34] : hue < 0.66 ? [30, 44, 64] : [58, 46, 24];
      ctx.fillStyle = rgba(c[0], c[1], c[2], 0.95); ctx.fillRect(x, (r + 1) * rh - bh - 6, bw, bh);
      ctx.fillStyle = rgba(255, 220, 160, 0.08); ctx.fillRect(x + 1, (r + 1) * rh - bh - 6, 1.2, bh);
      x += bw + 1;
    }
    ctx.fillStyle = '#1f1610'; ctx.fillRect(0, (r + 1) * rh - 6, w, 6);
  }
  glow(ctx, w * 0.75, h * 0.2, w * 0.8, [255, 200, 120], 0.2);
}
function rewards(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#0d0a14'], [0.6, '#17101c'], [1, '#07050a']]);
  const g = ctx.createLinearGradient(w * 0.5, 0, w * 0.5, h);
  g.addColorStop(0, rgba(255, 215, 130, 0.28)); g.addColorStop(1, rgba(255, 215, 130, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w * 0.42, 0); ctx.lineTo(w * 0.58, 0); ctx.lineTo(w * 0.95, h); ctx.lineTo(w * 0.05, h); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 90; i++) { const x = rnd() * w, y = h * (0.78 + rnd() * 0.22), r = 3 + rnd() * 5; ctx.fillStyle = rgba(120 + rnd() * 60, 90 + rnd() * 40, 20, 0.85); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = rgba(255, 220, 120, 0.25); ctx.fillRect(x - r * 0.4, y - r * 0.3, r * 0.5, 1); }
  for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba(255, 240, 190, 0.2 + rnd() * 0.4); ctx.fillRect(rnd() * w, h * (0.2 + rnd() * 0.7), 1.5, 1.5); }
}
function settings(ctx, w, h, rnd) {
  vgrad(ctx, w, h, [[0, '#070b1c'], [0.6, '#10183a'], [1, '#05070f']]);
  stars(ctx, w, h, rnd, 110, h * 0.7, 0.85);
  glow(ctx, w * 0.72, h * 0.16, w * 0.55, [170, 190, 255], 0.28);
  ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.16, 15, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#10183a'; ctx.beginPath(); ctx.arc(w * 0.72 + 6, h * 0.16 - 3, 13, 0, 6.2832); ctx.fill();
  hills(ctx, w, h * 0.82, 26, '#0a0e22', rnd, 6);
  hills(ctx, w, h * 0.9, 18, '#05070f', rnd, 7);
}
export const BACKDROPS = { home, rig, crew, workshop, codex, rewards, settings };
export const BACKDROP_IDS = Object.keys(BACKDROPS);
export const BACKDROP_SIZE = { w: 270, h: 480 };

// ---- Building and installing ----
// `make(w, h)` returns a canvas (document.createElement in the browser, @napi-rs/canvas in tests).
function safeCanvas(make, w, h) {
  try { const c = make(w, h); const ctx = c && c.getContext && c.getContext('2d'); return ctx ? { c, ctx } : null; } catch (e) { return null; }
}
export function paintTile(make, name, size = 128, seed) {
  const fn = TILES[name]; const cv = fn && safeCanvas(make, size, size);
  if (!cv) return null;
  fn(cv.ctx, size, size, seed);
  return cv.c.toDataURL('image/png');
}
export function paintBackdrop(make, id, seed = 7) {
  const fn = BACKDROPS[id]; const { w, h } = BACKDROP_SIZE; const cv = fn && safeCanvas(make, w, h);
  if (!cv) return null;
  fn(cv.ctx, w, h, mulberry32(seed + id.length * 131));
  return cv.c.toDataURL('image/jpeg', 0.82);
}
const cache = new Map();
export function backdropUrl(id, make) {
  if (cache.has(id)) return cache.get(id);
  const url = paintBackdrop(make || browserCanvas, id);
  if (url) cache.set(id, url);
  return url;
}
export function browserCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
export function buildTileVars(make) {
  const vars = {};
  for (const n of Object.keys(TILES)) { const u = paintTile(make, n); if (u) vars['--tx-' + n] = `url("${u}")`; }
  return vars;
}
export function installTextures(root) {
  const el = root || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el || !el.style) return {};
  const vars = buildTileVars(browserCanvas);
  for (const k of Object.keys(vars)) el.style.setProperty(k, vars[k]);
  return vars;
}
