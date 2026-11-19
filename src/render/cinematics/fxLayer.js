// cinematics/fxLayer.js: a click-through overlay canvas (plus a grey tint layer for desaturation) on top of a host element.
// It never takes pointer events, so Haul Up and every other control keep working under it.
// Layout is read once on attach and on resize (ResizeObserver), never per frame. Only opacity changes on the tint.
import { createCinePool } from './pool.js';

export function createFxLayer(host, opts) {
  const o = opts || {};
  const doc = o.doc || (typeof document !== 'undefined' ? document : null);
  const layer = { w: 360, h: 640, dpr: 1, ctx: null, canvas: null, tintEl: null, pool: createCinePool(o.maxParticles, o.rand), host, dead: false };
  if (!doc || !host || !host.appendChild) return layer; // headless: draws go nowhere, nothing throws
  const wrap = doc.createElement('div');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.className = 'cine-layer';
  wrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:40;contain:strict;overflow:hidden';
  const tint = doc.createElement('div');
  tint.style.cssText = 'position:absolute;inset:0;background:#8a8a8a;mix-blend-mode:color;opacity:0;will-change:opacity';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  wrap.append(tint, canvas); host.appendChild(wrap);
  layer.canvas = canvas; layer.tintEl = tint; layer.wrap = wrap;
  try { layer.ctx = canvas.getContext('2d'); } catch (e) { layer.ctx = null; }
  let ro = null;
  function fit() {
    try {
      const r = host.getBoundingClientRect ? host.getBoundingClientRect() : null;
      const w = Math.max(1, Math.round((r && r.width) || layer.w)), h = Math.max(1, Math.round((r && r.height) || layer.h));
      const d = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
      if (w === layer.w && h === layer.h && d === layer.dpr && canvas.width) return;
      layer.w = w; layer.h = h; layer.dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
    } catch (e) { /* keep the old size */ }
  }
  fit();
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(fit); ro.observe(host); }
  layer.begin = () => { if (layer.ctx) { layer.ctx.setTransform(layer.dpr, 0, 0, layer.dpr, 0, 0); layer.ctx.clearRect(0, 0, layer.w, layer.h); } return layer.ctx; };
  layer.setTint = (a) => { if (tint) tint.style.opacity = String(Math.max(0, Math.min(0.7, a || 0))); };
  layer.clear = () => { layer.pool.clear(); layer.setTint(0); if (layer.ctx) layer.ctx.clearRect(0, 0, canvas.width, canvas.height); };
  layer.destroy = () => { layer.dead = true; if (ro) ro.disconnect(); ro = null; layer.pool.clear(); if (wrap.remove) wrap.remove(); layer.ctx = null; };
  return layer;
}

// A layer with the same surface that draws nothing: used by tests and the lab's headless checks.
export function createNullLayer(w, h, rand) {
  const noop = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : () => {}), set: () => true });
  const calls = { n: 0 };
  const ctx = new Proxy({}, { get: (t, k) => { if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} }); return () => { calls.n++; }; }, set: () => true });
  return { w: w || 360, h: h || 640, dpr: 1, ctx, calls, tint: 0, pool: createCinePool(300, rand), begin() { return ctx; }, setTint(a) { this.tint = a; }, clear() { this.pool.clear(); this.tint = 0; }, destroy() {}, noop };
}
