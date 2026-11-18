// The bucket: wood and brass, a swinging lantern, and the rig tiles on its face.
import { makeSprite } from './canvasUtil.js';
import { getSprite } from './partIcon.js';
import { easeOut, clamp01 } from './safe.js';

const FLASH_MS = 140;

export function createBucket() {
  let body = null, glow = null, kw = -1, kh = -1, kd = -1;
  const flash = new Float32Array(20);
  const b = { offY: 0, tilt: 0, lift: 0, fall: 0, fallV: 0, mode: 0 /* 0 idle, 1 lifting, 2 falling */, t: 0 };

  function build(L) {
    body = makeSprite(L.bucketW + 24, L.bucketH + 24, L.dpr, (g) => {
      const x = 12, y = 12, w = L.bucketW, h = L.bucketH, taper = 8;
      g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
      g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + w, y + 6); g.lineTo(x + w - taper, y + h); g.lineTo(x + taper, y + h); g.closePath(); g.fillStyle = '#3a2412'; g.fill(); g.restore();
      // staves
      const n = Math.round(w / 14);
      for (let i = 0; i < n; i++) {
        const sx = x + (w * i) / n, sw = w / n + 0.5;
        const gr = g.createLinearGradient(sx, 0, sx + sw, 0);
        gr.addColorStop(0, i % 2 ? '#7a4a24' : '#6a3f1e'); gr.addColorStop(0.5, i % 2 ? '#94602f' : '#845328'); gr.addColorStop(1, '#4a2a14');
        g.fillStyle = gr; g.fillRect(sx, y + 6, sw, h - 6);
      }
      // dark inner plate behind the tiles
      g.fillStyle = 'rgba(10,8,14,0.78)'; const px = x + L.pad - 4, pw = w - L.pad * 2 + 8;
      g.beginPath(); if (g.roundRect) g.roundRect(px, y + L.rim + 2, pw, L.tile * L.rows + L.pad * 2 - 8, 12); else g.rect(px, y + L.rim + 2, pw, L.tile * L.rows + L.pad * 2 - 8); g.fill();
      // side shading so it looks round
      const sh = g.createLinearGradient(x, 0, x + w, 0);
      sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(0.2, 'rgba(0,0,0,0)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = sh; g.fillRect(x, y + 6, w, h - 6);
      // brass rings
      for (const ry of [y + 22, y + h - 12]) {
        const gr = g.createLinearGradient(0, ry - 5, 0, ry + 5); gr.addColorStop(0, '#ffe3a1'); gr.addColorStop(0.5, '#d9a441'); gr.addColorStop(1, '#7a5a22');
        g.fillStyle = gr; g.fillRect(x + 1, ry - 5, w - 2, 10);
      }
      // rim with light on top edge
      const rg = g.createLinearGradient(0, y, 0, y + 14); rg.addColorStop(0, '#ffeeb8'); rg.addColorStop(0.4, '#e0ac48'); rg.addColorStop(1, '#8a6226');
      g.beginPath(); if (g.roundRect) g.roundRect(x - 4, y, w + 8, 15, 7); else g.rect(x - 4, y, w + 8, 15); g.fillStyle = rg; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 6, y + 2, w - 12, 2);
    });
    glow = makeSprite(64, 64, 1, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,120,0.9)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
  }

  return Object.assign(b, {
    rebuild(L) { build(L); kw = L.bucketW; kh = L.bucketH; kd = L.dpr; },
    ensure(L) { if (L.bucketW !== kw || L.bucketH !== kh || L.dpr !== kd) { build(L); kw = L.bucketW; kh = L.bucketH; kd = L.dpr; } }, // numbers only: no string per frame
    flash(r, c, cols) { const i = r * cols + c; if (i >= 0 && i < 20) flash[i] = FLASH_MS; },
    flashLevel(r, c, cols) { const i = r * cols + c; return i >= 0 && i < 20 ? flash[i] : 0; },
    reset() { b.mode = 0; b.offY = 0; b.tilt = 0; b.lift = 0; b.fall = 0; b.fallV = 0; flash.fill(0); },
    startLift() { b.mode = 1; b.lift = 0; },
    startFall() { b.mode = 2; b.fall = 0; b.fallV = -60; },
    dip(px) { b.offY = Math.max(b.offY, px); },
    update(dtMs, h) {
      b.t += dtMs;
      for (let i = 0; i < 20; i++) if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dtMs);
      b.offY *= Math.pow(0.004, dtMs / 1000);
      if (b.mode === 1) { b.lift += dtMs; b.offY = -easeOut(b.lift / 900) * (h * 0.7); }
      else if (b.mode === 2) { b.fallV += 1400 * dtMs / 1000; b.fall += b.fallV * dtMs / 1000; b.tilt = Math.min(0.5, b.tilt + dtMs / 2500); b.offY = b.fall; }
    },
    // yOffset is added to all bucket drawing. Returns the offset used.
    draw(ctx, L, rig, t, lanternSprite) {
      this.ensure(L);
      const oy = b.offY, sway = Math.sin(t / 900) * 0.012 + b.tilt;
      ctx.save(); ctx.translate(L.cx, L.top + L.bucketH * 0.2 + oy); ctx.rotate(sway); ctx.translate(-L.cx, -(L.top + L.bucketH * 0.2));
      if (body) ctx.drawImage(body, L.cx - L.bucketW / 2 - 12, L.top - 12, L.bucketW + 24, L.bucketH + 24);
      const cols = L.cols, rows = L.rows, size = Math.round(L.tile * 0.86);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = L.cellX0 + c * L.tile + (L.tile - size) / 2, y = L.cellY0 + r * L.tile + (L.tile - size) / 2;
        const id = rig && rig.cells && rig.cells[r] ? rig.cells[r][c] : null;
        const f = flash[r * cols + c];
        if (!id) { // empty slot: soft dark square
          ctx.fillStyle = 'rgba(40,52,84,0.35)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + 3, y + 3, size - 6, size - 6, 10); else ctx.rect(x + 3, y + 3, size - 6, size - 6); ctx.fill();
          continue;
        }
        const k = f > 0 ? Math.sin(clamp01(1 - f / FLASH_MS) * Math.PI) : 0; // 0 -> 1 -> 0
        const s = 1 + 0.15 * k, cx = x + size / 2, cy = y + size / 2;
        if (k > 0.02 && glow) { ctx.globalAlpha = k; ctx.drawImage(glow, cx - size * 0.9, cy - size * 0.9, size * 1.8, size * 1.8); ctx.globalAlpha = 1; }
        const spr = getSprite(id, size, L.dpr, k > 0.3 ? 'firing' : 'idle');
        if (spr) ctx.drawImage(spr, cx - (size * s) / 2, cy - (size * s) / 2, size * s, size * s);
        else { ctx.fillStyle = '#1d2740'; ctx.fillRect(x, y, size, size); }
      }
      // lantern on a short chain, left of the rim
      const lx = L.cx - L.bucketW / 2 + 10, ly = L.top + 14, sw2 = Math.sin(t / 700) * 4;
      ctx.strokeStyle = '#8a6226'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + sw2 * 0.5, ly + 12); ctx.stroke();
      const fl = 0.75 + Math.sin(t / 90) * 0.1 + Math.sin(t / 37) * 0.05;
      if (glow) { ctx.globalAlpha = 0.55 * fl; ctx.drawImage(glow, lx + sw2 * 0.5 - 24, ly + 18 - 24, 48, 48); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#d9a441'; ctx.fillRect(lx + sw2 * 0.5 - 4, ly + 11, 8, 3);
      ctx.fillStyle = '#ffe9a8'; ctx.fillRect(lx + sw2 * 0.5 - 3, ly + 14, 6, 8);
      ctx.fillStyle = '#d9a441'; ctx.fillRect(lx + sw2 * 0.5 - 4, ly + 22, 8, 2);
      ctx.restore();
      return oy;
    },
  });
}
