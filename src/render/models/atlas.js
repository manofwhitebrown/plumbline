// Packs baked sprites into canvases ("pages"). Sprites of the same size share a grid, so there is no wasted space
// and the memory used is exactly what the sprites need. Every sprite has a small empty border (PAD) so scaling
// never smears neighbours into each other.
import { makeCanvas } from '../canvasUtil.js';

export const PAD = 2;

// How a class of `count` sprites of w*h fits into pages no bigger than `max`. Pure maths (also used by tests).
export function gridFor(w, h, count, max = 2048) {
  const bw = w + PAD * 2, bh = h + PAD * 2;
  if (bw > max || bh > max || count < 1) return null;
  const cols = Math.min(Math.floor(max / bw), count), rowsTotal = Math.ceil(count / cols), rowsPer = Math.floor(max / bh);
  const pages = Math.ceil(rowsTotal / rowsPer);
  return { bw, bh, cols, rowsTotal, rowsPer, pages, bytes: pages === 1 ? cols * bw * rowsTotal * bh * 4 : cols * bw * rowsPer * bh * 4 * pages };
}

export function createAtlas(max = 2048, makeCanvasFn = makeCanvas) {
  const classes = new Map(); // "WxH" -> { grid, pages: [], next }
  let bytes = 0;

  // Say in advance how many sprites of this size will come, so pages can be sized exactly.
  function declare(w, h, count) {
    const k = w + 'x' + h, c = classes.get(k);
    const total = (c ? c.count : 0) + count, grid = gridFor(w, h, total, max);
    if (!grid) return false;
    classes.set(k, { grid, count: total, pages: c ? c.pages : [], next: c ? c.next : 0, w, h });
    return true;
  }

  function pageFor(c, index) {
    if (c.pages[index]) return c.pages[index];
    const g = c.grid, rowsHere = Math.min(g.rowsPer, g.rowsTotal - index * g.rowsPer);
    const canvas = makeCanvasFn(g.cols * g.bw, rowsHere * g.bh);
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    bytes += g.cols * g.bw * rowsHere * g.bh * 4;
    return (c.pages[index] = { canvas, ctx });
  }

  // Next free spot for a w*h sprite: { page, x, y } or null (canvas missing / not declared / full).
  function reserve(w, h) {
    const c = classes.get(w + 'x' + h); if (!c || c.next >= c.count) return null;
    const g = c.grid, i = c.next++, perPage = g.cols * g.rowsPer, pi = Math.floor(i / perPage), local = i % perPage;
    const page = pageFor(c, pi); if (!page) return null;
    return { page, x: (local % g.cols) * g.bw + PAD, y: Math.floor(local / g.cols) * g.bh + PAD };
  }

  // Copy finished pixels (Uint8ClampedArray, w*h*4) into a reserved spot.
  function write(slot, pixels, w, h) {
    try {
      const img = slot.page.ctx.createImageData(w, h);
      img.data.set(pixels);
      slot.page.ctx.putImageData(img, slot.x, slot.y);
      return true;
    } catch (e) { return false; }
  }

  return { declare, reserve, write, get bytes() { return bytes; }, get pageCount() { let n = 0; for (const c of classes.values()) n += c.pages.length; return n; } };
}
