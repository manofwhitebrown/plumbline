// The living surface scene: night sky, well shaft, winch, rope, flickering lantern, crew silhouettes.
import { h } from '../dom.js';

export function surfaceScene(best, crew) {
  const n = Math.max(0, Math.min(8, Math.floor(crew) || 0));
  let people = '';
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = 180 + side * (62 + Math.floor(i / 2) * 30);
    people += `<g class="crew-p" style="animation-delay:-${(i * 0.37).toFixed(2)}s"><circle cx="${x}" cy="350" r="6" fill="#070a12"/><rect x="${x - 6}" y="356" width="12" height="24" rx="5" fill="#070a12"/></g>`;
  }
  const markup = `<svg viewBox="0 0 360 560" preserveAspectRatio="xMidYMax slice" role="img" aria-label="The surface above the well">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1220"/><stop offset=".7" stop-color="#2b2236"/><stop offset="1" stop-color="#4a3213"/></linearGradient>
      <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1410"/><stop offset="1" stop-color="#05030d"/></linearGradient>
      <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe3a1" stop-opacity=".9"/><stop offset="1" stop-color="#f6c453" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="360" height="560" fill="url(#sky)"/>
    <g fill="#ffe3a1" opacity=".55"><circle cx="40" cy="120" r="1.2"/><circle cx="120" cy="170" r="1"/><circle cx="250" cy="110" r="1.3"/><circle cx="318" cy="190" r="1"/><circle cx="205" cy="150" r="1"/><circle cx="70" cy="230" r="1"/></g>
    <rect y="380" width="360" height="180" fill="#1b1410"/>
    <rect x="150" y="380" width="60" height="180" fill="url(#shaft)"/>
    <ellipse cx="180" cy="380" rx="32" ry="7" fill="#070a12"/>
    <path d="M146 380 V292 M214 380 V292 M138 294 H222" stroke="#b8862a" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="180" cy="294" r="9" fill="none" stroke="#f6c453" stroke-width="3"/>
    <g class="rope-g"><line x1="180" y1="303" x2="180" y2="500" stroke="#ffe3a1" stroke-width="2"/>
    <rect x="172" y="500" width="16" height="14" rx="3" fill="#f6c453"/></g>
    <g class="lantern"><circle cx="238" cy="352" r="30" fill="url(#lamp)"/><rect x="233" y="346" width="10" height="14" rx="3" fill="#f6c453"/><line x1="238" y1="380" x2="238" y2="360" stroke="#b8862a" stroke-width="2"/></g>
    ${people}
  </svg>`;
  const scene = h('div', { class: 'scene' });
  scene.innerHTML = markup; // our own drawing string only
  if (best > 0) scene.append(h('div', { class: 'best-flag' }, h('span', { class: 'sub', text: 'Best' }), h('span', { class: 'num', text: Math.floor(best) + ' m' })));
  return scene;
}
