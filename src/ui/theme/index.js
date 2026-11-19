// Theme startup (UIART-1). Imported once, after polish.css, so theme.css is the last stylesheet.
// Does four small things: preloads the two fonts, paints the material tiles into CSS variables,
// keeps one cached backdrop behind the current screen, and gives currency pills a soft glow on change.
// Every step is wrapped, so a failure leaves the plain CSS theme (gradients only) in place.
import './theme.css';
import { installTextures, backdropUrl, BACKDROP_IDS } from './textures.js';
import { PART_DATA } from '../../data/parts.js';

const doc = typeof document !== 'undefined' ? document : null;
const FONT_FILES = ['fonts/cinzel-latin-wght-normal.woff2', 'fonts/outfit-latin-wght-normal.woff2'];
const sleep = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));

export function preloadFonts() {
  if (!doc || !doc.head) return;
  for (const f of FONT_FILES) {
    try {
      const link = doc.createElement('link');
      link.rel = 'preload'; link.as = 'font'; link.type = 'font/woff2'; link.crossOrigin = 'anonymous';
      link.href = new URL(f, doc.baseURI).href;
      doc.head.appendChild(link);
    } catch (e) { /* the @font-face rule still loads them */ }
  }
}

function screenIdOf(host) {
  const kids = host.children;
  for (let i = kids.length - 1; i >= 0; i--) {
    const k = kids[i];
    if (k.classList && k.classList.contains('screen')) { const m = /(?:^|\s)screen-([a-z]+)/.exec(k.className); return m ? m[1] : ''; }
  }
  return '';
}

let current = '';
function applyBackdrop(host, bd) {
  const id = screenIdOf(host);
  if (id === current) return;
  current = id;
  if (!BACKDROP_IDS.includes(id)) { bd.classList.remove('on'); return; }
  const url = backdropUrl(id);
  if (!url) { bd.classList.remove('on'); return; }
  bd.style.backgroundImage = `url("${url}")`;
  bd.classList.add('on');
}

const FAM = {};
for (const id of Object.keys(PART_DATA || {})) FAM[id] = PART_DATA[id].family;
function tagParts(root) {
  const cards = root.querySelectorAll ? root.querySelectorAll('.partcard[data-part]:not([data-fam])') : [];
  for (const c of cards) { const f = FAM[c.getAttribute('data-part')]; if (f) c.setAttribute('data-fam', f); }
}

function bumpPill(node) {
  const pill = node && (node.nodeType === 3 ? node.parentElement : node).closest ? (node.nodeType === 3 ? node.parentElement : node).closest('.pill') : null;
  if (!pill || pill.classList.contains('ui-bump')) return;
  if (!pill.classList.contains('gold') && !pill.classList.contains('shard') && !pill.classList.contains('core')) return;
  pill.classList.add('ui-bump');
  setTimeout(() => pill.classList.remove('ui-bump'), 650);
}

function attach(host) {
  // The layer lives next to the screen host (not inside it): the shell clears the host on every screen change.
  const bd = doc.createElement('div');
  bd.className = 'ui-bd'; bd.setAttribute('aria-hidden', 'true');
  host.parentNode.insertBefore(bd, host);
  applyBackdrop(host, bd);
  let seeded = false;
  const mo = new MutationObserver((list) => {
    applyBackdrop(host, bd);
    for (const m of list) {
      if (m.type === 'characterData' && current !== 'drop' && seeded) bumpPill(m.target);
      else if (m.type === 'childList') for (const n of m.addedNodes) if (n.nodeType === 1) tagParts(n);
    }
  });
  mo.observe(host, { childList: true, subtree: true, characterData: true });
  setTimeout(() => { seeded = true; }, 600); // do not glow for the first fill of a screen
  tagParts(host);
  sleep(() => { for (const id of BACKDROP_IDS) { try { backdropUrl(id); } catch (e) { /* ignore */ } } }); // warm the cache while idle
}

export function startTheme() {
  if (!doc) return;
  try { preloadFonts(); } catch (e) { /* ignore */ }
  try { installTextures(doc.documentElement); } catch (e) { /* plain gradients remain */ }
  const find = () => doc.querySelector('.screen-host');
  const host = find();
  if (host) { try { attach(host); } catch (e) { /* ignore */ } return; }
  const wait = new MutationObserver(() => { const h = find(); if (h) { wait.disconnect(); try { attach(h); } catch (e) { /* ignore */ } } });
  wait.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
}

if (doc) startTheme();
