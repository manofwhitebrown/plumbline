// Ambience: small calm particles per biome, from a fixed pool (no allocation after start).
// clay dust, quartz twinkles, amber pollen and fireflies, magma embers and heat shimmer, void wisps and stars.
import { biomePalette, makeRng, clamp, clamp01, fin, POLISH_CAP } from './util.js';
import { TOKENS } from '../palette.js';

export const AMBIENCE_CAP = 80; // leaves room under the 120 polish total

// kind: [vx range, vy range (px/s, negative = up), size range, life range ms, peak alpha, blinks, colour key]
const KINDS = [
  { vx: [-4, 4], vy: [2, 8], size: [1, 2], life: [5000, 9000], a: 0.35, blink: false, col: 'mote' },      // 0 dust
  { vx: [0, 0], vy: [0, 0], size: [1, 2], life: [1400, 2600], a: 0.7, blink: true, col: 'white' },        // 1 twinkle
  { vx: [-8, 8], vy: [-6, 3], size: [1, 2], life: [6000, 10000], a: 0.4, blink: false, col: 'mote' },     // 2 pollen
  { vx: [-12, 12], vy: [-8, 8], size: [2, 3], life: [4000, 7000], a: 0.75, blink: true, col: 'glow' },    // 3 firefly
  { vx: [-6, 6], vy: [-34, -14], size: [1, 2.5], life: [2500, 4500], a: 0.7, blink: false, col: 'ember' }, // 4 ember
  { vx: [-5, 5], vy: [-6, -1], size: [2, 3], life: [6000, 10000], a: 0.22, blink: false, col: 'wisp' },   // 5 wisp
  { vx: [0, 0], vy: [0, 0], size: [1, 1.5], life: [2000, 4000], a: 0.8, blink: true, col: 'white' },      // 6 star
];
// per biome: [kind, weight] list and the base number of particles at the surface
const BIOME_MIX = {
  clay: { n: 22, mix: [[0, 1]] },
  quartz: { n: 20, mix: [[1, 3], [0, 1]] },
  amber: { n: 26, mix: [[2, 3], [3, 1]] },
  magma: { n: 24, mix: [[4, 1]] },
  void: { n: 24, mix: [[5, 2], [6, 2]] },
  abyss: { n: 22, mix: [[0, 1], [1, 1], [5, 1], [4, 1]] },
};

export function createAmbience() {
  const N = AMBIENCE_CAP;
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const age = new Float32Array(N), life = new Float32Array(N), size = new Float32Array(N), ph = new Float32Array(N);
  const kind = new Uint8Array(N), alive = new Uint8Array(N);
  const rng = makeRng(7);
  const colors = {}; // biome -> { mote, glow, ember, white, wisp } as css strings, built once
  let count = 0, w = 360, h = 640, acc = 0, ready = null;

  function colorsFor(id) {
    if (colors[id]) return colors[id];
    const p = biomePalette(id);
    return (colors[id] = { mote: p.mote, glow: p.glow, ember: '#ff9a5a', white: '#e6efff', wisp: p.crack });
  }
  function pickKind(mix) {
    let total = 0; for (let i = 0; i < mix.length; i++) total += mix[i][1];
    let r = rng() * total;
    for (let i = 0; i < mix.length; i++) { r -= mix[i][1]; if (r <= 0) return mix[i][0]; }
    return mix[0][0];
  }
  function spawn(id) {
    let i = -1;
    for (let k = 0; k < N; k++) if (!alive[k]) { i = k; break; }
    if (i < 0) return false;
    const mix = (BIOME_MIX[id] || BIOME_MIX.clay).mix, kd = pickKind(mix), K = KINDS[kd];
    kind[i] = kd; alive[i] = 1; age[i] = 0; ph[i] = rng() * 6.2832;
    life[i] = rng.range(K.life[0], K.life[1]); size[i] = rng.range(K.size[0], K.size[1]);
    vx[i] = rng.range(K.vx[0], K.vx[1]); vy[i] = rng.range(K.vy[0], K.vy[1]);
    x[i] = rng() * w; y[i] = kd === 4 ? h * (0.7 + rng() * 0.35) : rng() * h;
    count++;
    return true;
  }
  const api = {
    get count() { return count; },
    resize(nw, nh) { w = nw; h = nh; },
    clear() { alive.fill(0); count = 0; acc = 0; },
    // enabled=false drains the pool quietly (particles fade out by finishing their life quickly)
    update(dt, state, enabled, rate) {
      const id = BIOME_MIX[state.biomeId] ? state.biomeId : 'clay';
      const d = clamp(fin(dt), 0, 100) / 1000;
      const target = enabled ? Math.min(N, Math.round(BIOME_MIX[id].n * (1 + 0.5 * clamp01(state.depth / 1000)) * clamp01(rate))) : 0;
      const speed = clamp(1 + 0.02 * fin(state.speed), 0.5, 2);
      for (let i = 0; i < N; i++) {
        if (!alive[i]) continue;
        age[i] += d * 1000 * (enabled ? 1 : 4);
        if (age[i] >= life[i]) { alive[i] = 0; count--; continue; }
        const K = KINDS[kind[i]];
        x[i] += vx[i] * d + Math.sin(age[i] * 0.0011 + ph[i]) * 4 * d * (K.vx[0] === K.vx[1] ? 0 : 1);
        y[i] += vy[i] * d - (enabled ? state.speed * 0 : 0);
        if (x[i] < -4) x[i] += w + 8; else if (x[i] > w + 4) x[i] -= w + 8;
        if (y[i] < -4) y[i] += h + 8; else if (y[i] > h + 4) y[i] -= h + 8;
      }
      acc += d * speed * 6; // at most about 6 new ones per second per update stream
      while (acc >= 1 && count < target) { acc -= 1; spawn(id); }
      if (acc > 2) acc = 2;
      ready = id;
    },
    draw(ctx, state, time) {
      if (count <= 0) return;
      const cs = colorsFor(BIOME_MIX[state.biomeId] ? state.biomeId : 'clay');
      let lastCol = '';
      for (let i = 0; i < N; i++) {
        if (!alive[i]) continue;
        const K = KINDS[kind[i]], t = age[i] / life[i];
        let a = K.a * Math.min(1, t * 5) * Math.min(1, (1 - t) * 5); // fade in and out
        if (K.blink) a *= 0.5 + 0.5 * Math.sin(time * 0.003 + ph[i] * 3);
        if (a < 0.02) continue;
        const col = cs[K.col];
        if (col !== lastCol) { ctx.fillStyle = col; lastCol = col; }
        ctx.globalAlpha = a;
        const s = size[i];
        ctx.fillRect(x[i] - s / 2, y[i] - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    },
    // Slow heat shimmer for magma: three faint bands that sway. Cheap rects.
    drawShimmer(ctx, state, time, w2, h2) {
      if (state.biomeId !== 'magma') return;
      ctx.fillStyle = '#ff8a55';
      for (let i = 0; i < 3; i++) {
        const yy = h2 * (0.55 + i * 0.14) + Math.sin(time * 0.0007 + i * 2) * 10;
        ctx.globalAlpha = 0.03 + 0.015 * Math.sin(time * 0.0011 + i);
        ctx.fillRect(0, yy, w2, 14);
      }
      ctx.globalAlpha = 1;
    },
  };
  return api;
}
