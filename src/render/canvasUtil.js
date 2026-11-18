// Makes small off-screen canvases. Tests and tools can swap the factory.
let factory = null;
export function setCanvasFactory(fn) { factory = fn; }
export function makeCanvas(w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  try {
    if (factory) return factory(w, h);
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  } catch (e) { /* fall through */ }
  return null;
}
// Draw once into a new sprite. painter(ctx, cssW, cssH). Returns canvas or null.
export function makeSprite(cssW, cssH, dpr, painter) {
  const c = makeCanvas(cssW * dpr, cssH * dpr);
  if (!c) return null;
  const g = c.getContext('2d');
  if (!g) return null;
  g.scale(dpr, dpr);
  try { painter(g, cssW, cssH); } catch (e) { /* keep partial sprite */ }
  return c;
}
