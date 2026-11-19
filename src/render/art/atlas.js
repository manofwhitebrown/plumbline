// Texture atlas: packs many small sprites into a few big canvases (shelf packing), with named regions.
// Packing is pure maths and testable without a canvas; painting only happens if a canvas exists.
import { makeCanvas } from '../canvasUtil.js';

// Builds the lookup key: kind, tier, biome, size (and an optional frame number).
export function spriteKey(kind, tier = 0, biome = 'any', size = 0, frame = 0) {
  return `${kind}|${tier | 0}|${biome}|${size | 0}|${frame | 0}`;
}

// Pure shelf packer. Returns { x, y } or null when the sheet is full.
export function createPacker(width, height, pad = 1) {
  let shelfY = 0, shelfH = 0, cursorX = 0;
  return {
    width, height,
    get usedHeight() { return shelfY + shelfH; },
    place(w, h) {
      const pw = w + pad, ph = h + pad;
      if (pw > width || ph > height) return null;
      if (cursorX + pw > width) { shelfY += shelfH; shelfH = 0; cursorX = 0; }
      if (shelfY + ph > height) return null;
      const pos = { x: cursorX, y: shelfY };
      cursorX += pw; if (ph > shelfH) shelfH = ph;
      return pos;
    },
  };
}

// The atlas. add(key, w, h, painter) paints into the sheet; get(key) returns a region.
export function createAtlas({ sheetSize = 1024, dpr = 1, pad = 2 } = {}) {
  const sheets = [];  // { canvas, ctx, packer }
  const regions = new Map();
  let bytes = 0;

  function newSheet() {
    const canvas = makeCanvas(sheetSize, sheetSize);
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    const s = { canvas, ctx, packer: createPacker(sheetSize, sheetSize, pad) };
    sheets.push(s); bytes += sheetSize * sheetSize * 4;
    return s;
  }

  return {
    get bytes() { return bytes; },
    get size() { return regions.size; },
    get sheetCount() { return sheets.length; },
    has: (key) => regions.has(key),
    get: (key) => regions.get(key) || null,
    // cssW x cssH is the size on screen; the sheet stores it at dpr scale.
    add(key, cssW, cssH, painter) {
      if (regions.has(key)) return regions.get(key);
      const w = Math.max(1, Math.ceil(cssW * dpr)), h = Math.max(1, Math.ceil(cssH * dpr));
      let sheet = sheets[sheets.length - 1] || newSheet();
      let pos = sheet.packer.place(w, h);
      if (!pos) { sheet = newSheet(); pos = sheet.packer.place(w, h); }
      if (!pos) return null; // sprite bigger than a whole sheet
      const region = { key, sheet: sheets.indexOf(sheet), canvas: sheet.canvas, x: pos.x, y: pos.y, w, h, cssW, cssH };
      if (sheet.ctx && painter) {
        try {
          sheet.ctx.save();
          sheet.ctx.beginPath(); sheet.ctx.rect(pos.x, pos.y, w, h); sheet.ctx.clip();
          sheet.ctx.translate(pos.x, pos.y); sheet.ctx.scale(dpr, dpr);
          painter(sheet.ctx, cssW, cssH);
        } catch (e) { /* keep partial sprite, never throw into the loop */ }
        finally { try { sheet.ctx.restore(); } catch (e) { /* ignore */ } }
      }
      regions.set(key, region);
      return region;
    },
    // Draws a region at x,y (css px) scaled to dw x dh. Safe if region or canvas is missing.
    draw(ctx, key, x, y, dw, dh) {
      const r = regions.get(key);
      if (!r || !r.canvas || !ctx) return false;
      ctx.drawImage(r.canvas, r.x, r.y, r.w, r.h, x, y, dw === undefined ? r.cssW : dw, dh === undefined ? r.cssH : dh);
      return true;
    },
    // Frees every offscreen canvas.
    destroy() {
      for (const s of sheets) { if (s.canvas) { s.canvas.width = 1; s.canvas.height = 1; } }
      sheets.length = 0; regions.clear(); bytes = 0;
    },
  };
}
