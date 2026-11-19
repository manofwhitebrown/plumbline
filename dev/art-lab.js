// Art lab: draws every registered texture/sprite on a grid, with zoom, quality and timing.
import '../src/render/art/swatches.js';
import '../src/render/art/wallArt.js';
import { listArt } from '../src/render/art/registry.js';

const grid = document.getElementById('grid');
const stats = document.getElementById('stats');
const $ = (id) => document.getElementById(id);

function build() {
  const quality = $('q').value, zoom = Number($('z').value), dpr = Number($('d').value);
  grid.textContent = '';
  const t0 = performance.now();
  let bytes = 0, count = 0, group = '';
  for (const e of listArt()) {
    if (e.group !== group) { group = e.group; const h = document.createElement('h2'); h.textContent = group; grid.appendChild(h); }
    const fig = document.createElement('figure');
    const c = document.createElement('canvas');
    c.width = Math.round(e.w * dpr); c.height = Math.round(e.h * dpr);
    c.style.width = e.w * zoom + 'px'; c.style.height = e.h * zoom + 'px';
    const g = c.getContext('2d');
    const t = performance.now();
    try { g.save(); g.scale(dpr, dpr); e.paint(g, e.w, e.h, quality); g.restore(); } catch (err) { console.warn(e.name, err); }
    const ms = (performance.now() - t).toFixed(1);
    const cap = document.createElement('figcaption');
    cap.textContent = `${e.name} (${e.w}x${e.h}) ${ms} ms`;
    fig.append(c, cap); grid.appendChild(fig);
    bytes += c.width * c.height * 4; count++;
  }
  stats.textContent = `${count} items, generated in ${(performance.now() - t0).toFixed(0)} ms, ${(bytes / 1048576).toFixed(2)} MB at DPR ${dpr}`;
}
for (const id of ['q', 'z', 'd']) $(id).addEventListener('change', build);
$('regen').addEventListener('click', build);
build();
