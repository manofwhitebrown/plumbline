// Plumbline layout wall: the real game in an iframe at every size of docs/manager/LAYOUT_CHECK.md section 1.
// Open with `npm run dev`, then /dev/layout-wall.html. Plain JavaScript, no dependencies.
const $ = (id) => document.getElementById(id);
const SCREENS = ['home', 'rig', 'drop', 'results', 'crew', 'workshop', 'codex', 'rewards', 'settings', 'guide'];
const GROUPS = [
  ['Small phones', [[320, 568], [360, 640], [375, 667]]],
  ['Normal phones', [[360, 780], [390, 844], [412, 915], [430, 932]]],
  ['Tablet', [[768, 1024]]],
  ['Phone sideways', [[844, 390]]],
  ['Laptop', [[1024, 768], [1440, 900], [1920, 1080]]],
];
const NOTCH_TOP = 44, NOTCH_BOTTOM = 34;
const q = new URLSearchParams(location.search);
const st = {
  screen: SCREENS.includes(q.get('screen')) ? q.get('screen') : 'home',
  fixture: ['empty', 'busy', 'extreme'].includes(q.get('fixture')) ? q.get('fixture') : 'extreme',
  large: q.get('large') === '1', text: q.get('text') === '1', notch: q.get('notch') === '1', rotate: q.get('rotate') === '1',
  zoom: Math.min(100, Math.max(25, +q.get('zoom') || 50)), group: q.get('group') || 'all',
};
const frames = []; // { w, h, box, iframe, badge, cap, issues, errors }

function gameUrl() { return new URL('../?debug=1&screen=' + st.screen + '&fixture=' + st.fixture, location.href).href; }
function dims(f) { return st.rotate ? [f.h, f.w] : [f.w, f.h]; }

function build() {
  const wall = $('wall'); wall.textContent = ''; frames.length = 0;
  for (const [name, sizes] of GROUPS) {
    if (st.group !== 'all' && st.group !== name) continue;
    const g = document.createElement('div'); g.className = 'group';
    const h = document.createElement('h2'); h.textContent = name; g.appendChild(h);
    const row = document.createElement('div'); row.className = 'devs'; g.appendChild(row);
    for (const [w, h2] of sizes) {
      const dev = document.createElement('div'); dev.className = 'dev';
      const cap = document.createElement('div'); cap.className = 'cap';
      const label = document.createElement('b'); cap.appendChild(label);
      const spin = document.createElement('button'); spin.textContent = 'rotate'; spin.title = 'Rotate just this frame'; cap.appendChild(spin);
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = '...'; cap.appendChild(badge);
      const box = document.createElement('div'); box.className = 'box';
      const iframe = document.createElement('iframe'); iframe.title = w + 'x' + h2; iframe.setAttribute('loading', 'eager');
      const nt = document.createElement('div'); nt.className = 'notch top'; nt.textContent = 'notch';
      const nb = document.createElement('div'); nb.className = 'notch bot'; nb.textContent = 'home bar';
      box.append(iframe, nt, nb); dev.append(cap, box); row.appendChild(dev);
      const f = { w, h: h2, box, iframe, badge, label, nt, nb, flip: false, issues: null, errors: [] };
      spin.onclick = () => { f.flip = !f.flip; layout(f); };
      iframe.addEventListener('load', () => onLoad(f));
      frames.push(f);
    }
    wall.appendChild(g);
  }
  frames.forEach((f) => { layout(f); f.iframe.src = gameUrl(); });
}

function layout(f) {
  let [w, h] = dims(f); if (f.flip) { const t = w; w = h; h = t; }
  const s = st.zoom / 100;
  f.label.textContent = w + ' x ' + h;
  f.box.style.width = Math.round(w * s) + 'px'; f.box.style.height = Math.round(h * s) + 'px';
  f.iframe.style.width = w + 'px'; f.iframe.style.height = h + 'px'; f.iframe.style.transform = 'scale(' + s + ')';
  for (const [el, hh, atTop] of [[f.nt, NOTCH_TOP, true], [f.nb, NOTCH_BOTTOM, false]]) { el.style.width = w + 'px'; el.style.height = hh + 'px'; el.style.transform = 'scale(' + s + ')'; el.style.lineHeight = hh + 'px'; if (!atTop) { el.style.top = 'auto'; el.style.bottom = '0'; el.style.transformOrigin = '0 100%'; } }
  f.box.classList.toggle('notches', st.notch);
}

// Apply the pretend phone settings to a loaded frame. The frames are the same origin, so this is allowed.
function twists(f) {
  let d; try { d = f.iframe.contentDocument; } catch (e) { return; }
  if (!d || !d.documentElement) return;
  const root = d.documentElement, s = root.style;
  s.setProperty('--sat', st.notch ? NOTCH_TOP + 'px' : '0px'); s.setProperty('--sab', st.notch ? NOTCH_BOTTOM + 'px' : '0px');
  s.setProperty('--sal', '0px'); s.setProperty('--sar', '0px');
  s.fontSize = st.text ? '130%' : '';
  const val = st.large ? '1' : '0';
  for (const el of [root, d.body, d.getElementById('app')]) if (el && el.dataset) el.dataset.large = val;
}
function onLoad(f) {
  f.errors = [];
  try {
    const w = f.iframe.contentWindow;
    w.addEventListener('error', (e) => f.errors.push('error: ' + e.message));
    w.addEventListener('unhandledrejection', (e) => f.errors.push('promise: ' + (e.reason && e.reason.message || e.reason)));
    for (const k of ['error', 'warn']) { const orig = w.console[k]; w.console[k] = function (...a) { f.errors.push(k + ': ' + a.map(String).join(' ').slice(0, 120)); return orig.apply(this, a); }; }
  } catch (e) { /* cross-origin: skip */ }
  twists(f); f.badge.textContent = 'loaded'; f.badge.className = 'badge';
}

// ---- checks (LAYOUT_CHECK section 2: items 1, 4 and 5, plus console errors) ----------------------
function visible(el, win) {
  const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return null;
  const cs = win.getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null;
  return r;
}
function name(el) { return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20) + '"'; }
function check(f) {
  const out = { scroll: null, tap: [], text: [], errors: f.errors.slice(0, 5) };
  try {
    const d = f.iframe.contentDocument, win = f.iframe.contentWindow, root = d.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) out.scroll = 'scrollWidth ' + root.scrollWidth + ' > clientWidth ' + root.clientWidth;
    for (const el of d.querySelectorAll('button, a[href], [role=button], [role=tab], input, select, textarea, summary')) {
      const r = visible(el, win); if (!r) continue;
      if (r.width < 43.5 || r.height < 43.5) out.tap.push(name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    const walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT); const seen = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.trim()) continue; const el = n.parentElement; if (!el || seen.has(el) || /^(SCRIPT|STYLE)$/.test(el.tagName)) continue; seen.add(el);
      if (!visible(el, win)) continue; const fs = parseFloat(win.getComputedStyle(el).fontSize); if (fs < 12) out.text.push(name(el) + ' ' + fs + 'px');
    }
  } catch (e) { out.scroll = 'could not check: ' + e.message; }
  f.issues = out; return out;
}
function show(f) {
  const o = f.issues, n = (o.scroll ? 1 : 0) + o.tap.length + o.text.length + o.errors.length;
  f.badge.textContent = n ? n + ' issue' + (n > 1 ? 's' : '') : 'ok'; f.badge.className = 'badge ' + (n ? 'bad' : 'ok');
  f.badge.onclick = () => report([f]);
}
function report(list) {
  const el = $('report'); el.style.display = 'block'; let s = 'Screen ' + st.screen + ', test state ' + st.fixture + (st.large ? ', large text' : '') + (st.notch ? ', notch' : '') + (st.rotate ? ', rotated' : '') + '\n';
  for (const f of list) {
    const o = f.issues; if (!o) continue; const bad = o.scroll || o.tap.length || o.text.length || o.errors.length;
    s += '\n' + f.label.textContent + ': ' + (bad ? 'PROBLEMS' : 'PASS') + '\n';
    if (o.scroll) s += '  sideways scroll: ' + o.scroll + '\n';
    o.tap.slice(0, 8).forEach((x) => { s += '  small tap target: ' + x + '\n'; }); if (o.tap.length > 8) s += '  ... and ' + (o.tap.length - 8) + ' more\n';
    o.text.slice(0, 8).forEach((x) => { s += '  text under 12 px: ' + x + '\n'; }); if (o.text.length > 8) s += '  ... and ' + (o.text.length - 8) + ' more\n';
    o.errors.forEach((x) => { s += '  console ' + x + '\n'; });
  }
  s += '\nNot checked here: overlap, cut-off words, targets closer than 8 px, contrast. Look at the frames for those.';
  el.textContent = s;
}
// A frame is ready when the page has loaded and the splash screen is gone.
function ready(f) {
  try { const d = f.iframe.contentDocument, sp = d && d.getElementById('splash'); return !!d && d.readyState === 'complete' && (!sp || sp.classList.contains('gone') || !sp.offsetParent); } catch (e) { return true; }
}
function checkAll(tries = 0) {
  const waiting = frames.filter((f) => !ready(f));
  if (waiting.length && tries < 40) { waiting.forEach((f) => { f.badge.textContent = 'booting...'; }); setTimeout(() => checkAll(tries + 1), 500); return; }
  frames.forEach((f) => { check(f); show(f); if (!ready(f)) { f.badge.textContent = 'never finished booting'; f.badge.className = 'badge bad'; } }); report(frames);
}

// ---- controls -----------------------------------------------------------------------------------
function sync() { for (const f of frames) { layout(f); twists(f); } }
function wire() {
  SCREENS.forEach((id) => { const o = document.createElement('option'); o.value = id; o.textContent = id; $('selScreen').appendChild(o); }); $('selScreen').value = st.screen;
  GROUPS.forEach(([n]) => { const o = document.createElement('option'); o.value = n; o.textContent = n; $('selGroup').appendChild(o); }); $('selGroup').value = st.group;
  $('selFixture').value = st.fixture; $('cLarge').checked = st.large; $('cText').checked = st.text; $('cNotch').checked = st.notch; $('cRotate').checked = st.rotate;
  $('rZoom').value = st.zoom; $('vZoom').textContent = st.zoom + '%';
  const save = () => { const p = new URLSearchParams({ screen: st.screen, fixture: st.fixture, large: +st.large, text: +st.text, notch: +st.notch, rotate: +st.rotate, zoom: st.zoom, group: st.group }); history.replaceState(null, '', '?' + p); };
  $('selScreen').onchange = (e) => { st.screen = e.target.value; save(); frames.forEach((f) => { f.badge.textContent = '...'; f.iframe.src = gameUrl(); }); };
  $('selFixture').onchange = (e) => { st.fixture = e.target.value; save(); frames.forEach((f) => { f.badge.textContent = '...'; f.iframe.src = gameUrl(); }); };
  $('selGroup').onchange = (e) => { st.group = e.target.value; save(); build(); };
  $('cLarge').onchange = (e) => { st.large = e.target.checked; save(); sync(); };
  $('cText').onchange = (e) => { st.text = e.target.checked; save(); sync(); };
  $('cNotch').onchange = (e) => { st.notch = e.target.checked; save(); sync(); };
  $('cRotate').onchange = (e) => { st.rotate = e.target.checked; save(); sync(); };
  $('rZoom').oninput = (e) => { st.zoom = +e.target.value; $('vZoom').textContent = st.zoom + '%'; save(); sync(); };
  $('bReload').onclick = () => { frames.forEach((f) => { f.badge.textContent = '...'; f.iframe.src = gameUrl(); }); };
  $('bCheck').onclick = () => checkAll(0);
}
wire(); build();
window.wall = { st, frames, check, checkAll, build, sync };
