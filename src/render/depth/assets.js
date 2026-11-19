// Everything the depth layer paints once and then reuses: wall textures (with 3 mip levels, left and mirrored right),
// door/rib ring sprites, light lobes, gem pulse glows, foreground silhouettes, and the shading mask.
// Heavy work is cut into small steps (step(budgetMs)) so no frame ever hitches. Nothing here runs per frame except step().
import { fbm, ridged } from '../art/noise.js';
import { hash2, seedFrom, makePrng } from '../art/prng.js';
import { hexToRgb, mix, lighten, darken, rgbToCss } from '../art/color.js';
import { biomePalette, tierColors } from '../palette.js';
import { BIOME_ORDER, STYLE, TEX_W, TEX_H, COURSE_H, OV } from './constants.js';
import { paintSilhouette, SIL_W, SIL_H } from './silhouettes.js';
import { fin, clamp, smoothstep } from './math.js';

const RING_W = 256, RING_H = 64;

function startTexJob(mk, biomeId) {
  const base = mk(TEX_W, TEX_H); if (!base) return null;
  const g = base.getContext('2d'); if (!g || !g.createImageData) return null;
  const pal = biomePalette(biomeId), st = STYLE[biomeId] || STYLE.clay, seed = seedFrom('depth:' + biomeId);
  const courses = TEX_H / COURSE_H, bounds = [], maps = [];
  for (let c = 0; c < courses; c++) {
    const r = makePrng(seed + c * 131), b = [];
    let x = -r.range(0, 60); b.push(x);
    while (x < TEX_W + 90) { x += r.range(44, 82); b.push(x); }
    bounds.push(Float32Array.from(b));
    const map = new Uint8Array(TEX_W); let k = 0;
    for (let px = 0; px < TEX_W; px++) { while (b[k + 1] <= px) k++; map[px] = k; }
    maps.push(map);
  }
  return { base, g, img: g.createImageData(TEX_W, TEX_H), row: 0, seed, bounds, maps, wall: hexToRgb(pal.wall), dark: hexToRgb(pal.wallDark), crack: hexToRgb(pal.crack), crackK: st.crack };
}

function texRows(j, r0, r1) {
  const d = j.img.data, ns = 6 / TEX_H, cs = 12 / TEX_H, s = j.seed, w = j.wall, k0 = j.dark, ck = j.crack;
  for (let y = r0; y < r1; y++) {
    const c = (y / COURSE_H) | 0, yin = y - c * COURSE_H, map = j.maps[c], bd = j.bounds[c], dyb = COURSE_H - yin;
    for (let x = 0; x < TEX_W; x++) {
      const k = map[x], x0 = bd[k], x1 = bd[k + 1], dxl = x - x0, dxr = x1 - x;
      let r, g, b;
      if (dxl < 1.4 || dxr < 1.2 || yin < 1.4) { r = k0[0] * 0.6; g = k0[1] * 0.6; b = k0[2] * 0.6; }
      else {
        let f = (0.74 + 0.5 * hash2(c, k, s)) * (0.78 + 0.44 * fbm(x * ns, y * ns, s, 2, 6));
        if (yin < 5) f += 0.2 * (1 - yin / 5);
        if (dyb < 6) f -= 0.34 * (1 - dyb / 6);
        if (dxl < 4) f += 0.08;
        if (dxr < 4) f -= 0.12;
        f += (hash2(x, y, s + 3) - 0.5) * 0.1;
        r = w[0] * f; g = w[1] * f; b = w[2] * f;
      }
      if (j.crackK > 0) {
        const rr = ridged(x * cs, y * cs, s + 9, 2, 12);
        if (rr > 0.8) { const a = Math.min(1, (rr - 0.8) / 0.2) * j.crackK; r += (ck[0] - r) * a; g += (ck[1] - g) * a; b += (ck[2] - b) * a; }
      }
      const o = (y * TEX_W + x) * 4;
      d[o] = r > 255 ? 255 : r; d[o + 1] = g > 255 ? 255 : g; d[o + 2] = b > 255 ? 255 : b; d[o + 3] = 255;
    }
  }
}

function levels(mk, base, flip) {
  const c0 = mk(TEX_W, TEX_H * 2), c1 = mk(TEX_W / 2, TEX_H), c2 = mk(TEX_W / 4, TEX_H / 2);
  if (!c0 || !c1 || !c2) return null;
  const g0 = c0.getContext('2d'), g1 = c1.getContext('2d'), g2 = c2.getContext('2d');
  if (!g0 || !g1 || !g2) return null;
  if (flip) { g0.translate(TEX_W, 0); g0.scale(-1, 1); }
  g0.drawImage(base, 0, 0); g0.drawImage(base, 0, TEX_H);
  g1.imageSmoothingEnabled = true; g2.imageSmoothingEnabled = true;
  g1.drawImage(c0, 0, 0, TEX_W, TEX_H * 2, 0, 0, TEX_W / 2, TEX_H);
  g2.drawImage(c1, 0, 0, TEX_W / 2, TEX_H, 0, 0, TEX_W / 4, TEX_H / 2);
  return [c0, c1, c2];
}

function paintRing(g, pal) {
  const wall = hexToRgb(pal.wall), dark = hexToRgb(pal.wallDark), glow = hexToRgb(pal.glow);
  g.fillStyle = rgbToCss(lighten(wall, 0.16)); g.fillRect(0, 0, RING_W, 18);
  g.fillStyle = rgbToCss(darken(wall, 0.22)); g.fillRect(0, 18, RING_W, 28);
  g.fillStyle = rgbToCss(darken(dark, 0.45)); g.fillRect(0, 46, RING_W, 18);
  g.fillStyle = rgbToCss(glow, 0.55); g.fillRect(0, 17, RING_W, 2);
  g.fillStyle = 'rgba(2,1,8,0.38)'; for (let x = 20; x < RING_W; x += 44) g.fillRect(x, 19, 2, 27);
  g.globalCompositeOperation = 'destination-in';
  const m = g.createLinearGradient(0, 0, RING_W, 0);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.16, 'rgba(0,0,0,0.95)'); m.addColorStop(0.5, 'rgba(0,0,0,0.32)'); m.addColorStop(0.84, 'rgba(0,0,0,0.95)'); m.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = m; g.fillRect(0, 0, RING_W, RING_H);
  g.globalCompositeOperation = 'source-over';
}

function radial(mk, size, rgb, a0) {
  const c = mk(size, size); if (!c) return null;
  const g = c.getContext('2d'); if (!g) return null;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, rgbToCss(rgb, a0)); gr.addColorStop(0.45, rgbToCss(rgb, a0 * 0.35)); gr.addColorStop(1, rgbToCss(rgb, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

export function createAssets(o) {
  const mk = o.mk, now = o.now || (() => Date.now());
  const art = typeof o.wallTexture === 'function' ? o.wallTexture : null;
  const E = []; // one entry per biome index
  let canvases = 0, silScale = 1;
  const mkc = (w, h) => { const c = mk(w, h); if (c) canvases++; return c; };
  const pulses = [];
  for (let t = 1; t <= 6; t++) pulses.push(radial(mkc, 64, t === 6 ? [236, 220, 255] : hexToRgb(tierColors(t).base), 0.95));

  function entry(i) {
    if (!E[i]) E[i] = { want: 0, job: null, tex: null, ring: null, lobe: null, sils: null, silN: 0, failed: false, id: BIOME_ORDER[i] };
    return E[i];
  }
  function buildTexture(e) {
    const base = e.job.base;
    const L = levels(mkc, base, false), R = levels(mkc, base, true);
    if (L && R) e.tex = { L, R };
    else e.failed = true;
    e.job = null;
  }
  function tryArt(e) {
    if (!art) return false;
    try {
      const t = art(e.id, 0);
      if (!t || !(t.width >= 32) || !(t.height >= 32)) return false;
      const base = mkc(TEX_W, TEX_H), g = base && base.getContext('2d'); if (!g) return false;
      g.drawImage(t, 0, 0, t.width, t.height, 0, 0, TEX_W, TEX_H);
      e.job = { base }; buildTexture(e); return !!e.tex;
    } catch (err) { return false; }
  }
  function silList(e) { return STYLE[e.id].sil; }

  const api = {
    get canvases() { return canvases; },
    request(i, prio) { const e = entry(clamp(i | 0, 0, BIOME_ORDER.length - 1)); e.want = Math.max(e.want, prio); },
    tex(i) { const e = E[i]; return e ? e.tex : null; },
    ring(i) { const e = E[i]; return e ? e.ring : null; },
    lobe(i) { const e = E[i]; return e ? e.lobe : null; },
    sils(i) { const e = E[i]; return e && e.sils && e.silN >= silList(e).length * 2 ? e.sils : null; },
    pulse(tier) { return pulses[clamp(Math.floor(fin(tier, 1)), 1, 6) - 1] || null; },
    setSilScale(s) { const v = clamp(fin(s, 1), 1, 2); if (v === silScale) return; silScale = v; for (const e of E) if (e) { e.sils = null; e.silN = 0; } },
    // Free everything for biomes nobody asked for lately.
    release(keep) { for (let i = 0; i < E.length; i++) if (E[i] && !keep.includes(i)) { E[i] = undefined; } },
    // Does a little work. Returns true while more is waiting.
    step(budgetMs) {
      const t0 = now(); let any = false;
      // most wanted first
      let best = -1, bw = 0;
      for (let i = 0; i < E.length; i++) { const e = E[i]; if (e && !e.failed && e.want > bw && !api.complete(i)) { best = i; bw = e.want; } }
      if (best < 0) return false;
      const e = E[best]; any = true;
      if (!e.tex) {
        if (!e.job && !tryArt(e)) { e.job = startTexJob(mkc, e.id); if (!e.job) { e.failed = true; return false; } }
        if (!e.tex && e.job.img) {
          const j = e.job;
          while (j.row < TEX_H && now() - t0 < budgetMs) { const r1 = Math.min(TEX_H, j.row + 4); texRows(j, j.row, r1); j.row = r1; }
          if (j.row >= TEX_H) { j.g.putImageData(j.img, 0, 0); buildTexture(e); }
        }
        return true;
      }
      if (!e.ring) { const c = mkc(RING_W, RING_H), g = c && c.getContext('2d'); if (g) { paintRing(g, biomePalette(e.id)); e.ring = c; } else e.ring = false; return true; }
      if (!e.lobe) { e.lobe = radial(mkc, 128, hexToRgb(biomePalette(e.id).glow), 0.9) || false; return true; }
      const list = silList(e);
      if (!e.sils) e.sils = [];
      if (e.silN < list.length * 2) {
        const n = e.silN, kind = list[n >> 1], v = n & 1, pal = biomePalette(e.id);
        const c = mkc(Math.ceil(SIL_W * silScale), Math.ceil(SIL_H * silScale)), g = c && c.getContext('2d');
        if (g) { g.scale(silScale, silScale); paintSilhouette(g, kind, pal, seedFrom(e.id + kind + v)); }
        e.sils.push({ kind, canvas: c || null }); e.silN++;
        return true;
      }
      return any;
    },
    complete(i) { const e = E[i]; if (!e) return false; if (e.failed) return true; return !!(e.tex && e.ring !== null && e.lobe !== null && e.sils && e.silN >= silList(e).length * 2); },
    ready(i) { const e = E[i]; return !!(e && e.tex); },
  };
  return api;
}

// The shading mask: ink that darkens the inner part of each wall (it grazes away from us), plus a soft dim under the HUD bar.
// Layer space: the canvas covers (-OV .. W+OV) x (-OV .. H+OV) CSS px at scale ls.
export function buildMask(mk, W, H, ls, margin, wallWidthAt) {
  const Wl = Math.max(1, Math.round((W + OV * 2) * ls)), Hl = Math.max(1, Math.round((H + OV * 2) * ls));
  const c = mk(Wl, Hl); if (!c) return null;
  const g = c.getContext('2d'); if (!g || !g.createImageData) return null;
  const img = g.createImageData(Wl, Hl), d = img.data;
  for (let ly = 0; ly < Hl; ly++) {
    const y = ly / ls - OV, wI = wallWidthAt(Math.max(0, y)), ds = Math.min(wI * 0.5, Math.max(6, margin * 0.7));
    const top = 0.4 * (1 - smoothstep(56, 132, y));
    for (let lx = 0; lx < Wl; lx++) {
      const x = lx / ls - OV, xe = Math.min(x, W - x);
      let a = 0;
      if (xe < wI) a = 0.82 * smoothstep(ds, wI, xe);
      else if (xe < wI + 10) a = 0.82 * (1 - (xe - wI) / 10); // feathered inner edge hides the slice steps
      if (top > 0 && xe < wI + 20) a = 1 - (1 - a) * (1 - top);
      if (a > 0.004) { const o = (ly * Wl + lx) * 4; d[o] = 2; d[o + 1] = 1; d[o + 2] = 8; d[o + 3] = a * 255; }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
