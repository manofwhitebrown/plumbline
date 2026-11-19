// motion/transitions.js: screen transitions. Transform and opacity only (Web Animations API), no layout work.
//   plan(from, to, opts)  pure: what kind of move, which direction.
//   createTransitions({ isReduced, win })  -> { before(root, from, to, back) -> token, after(token), skipAll(), dispose() }
// The shell calls before() just before it swaps the screen and after() just after. Old content is cloned into a
// ghost layer that fades out while the new screen slides in, so tab changes cross-fade with a slight parallax.
import { ease, DUR } from './easing.js';

const TAB_ORDER = ['home', 'rig', 'crew', 'workshop', 'codex', 'rewards', 'settings', 'guide'];
const NO_GHOST = new Set(['drop', 'results']); // never clone a live canvas screen
const CSS_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// kind: 'none' | 'slide' | 'fade' | 'rise'.  dir: +1 forward (new comes from the right), -1 back, 0 none.
export function plan(from, to, opts) {
  const o = opts || {};
  if (o.reduce || !from || !to || from === to) return { kind: 'none', dir: 0, ms: 0, parallax: 0, ghost: false };
  const ghost = !NO_GHOST.has(from);
  if (to === 'results') return { kind: 'rise', dir: 0, ms: DUR.screen, parallax: 0, ghost: false };
  if (to === 'drop' || from === 'drop') return { kind: 'fade', dir: 0, ms: DUR.screen, parallax: 0, ghost };
  const a = TAB_ORDER.indexOf(from), b = TAB_ORDER.indexOf(to);
  const tabSwitch = a >= 0 && b >= 0 && !o.back && Math.abs(a - b) >= 1 && (a < 6 && b < 6);
  if (tabSwitch) return { kind: 'fade', dir: b > a ? 1 : -1, ms: DUR.screen, parallax: 12, ghost };
  return { kind: 'slide', dir: o.back ? -1 : 1, ms: DUR.screen, parallax: 24, ghost };
}

export function createTransitions(opts) {
  const o = opts || {};
  const isReduced = typeof o.isReduced === 'function' ? o.isReduced : () => false;
  const win = o.win || (typeof window !== 'undefined' ? window : null);
  const live = new Set(); // running animations
  const ghosts = new Set();
  let unsub = null;

  function run(el, frames, ms) {
    if (!el || typeof el.animate !== 'function') return null;
    let a = null;
    try { a = el.animate(frames, { duration: ms, easing: CSS_OUT, fill: 'both' }); } catch (e) { return null; }
    live.add(a);
    const done = () => { live.delete(a); try { a.cancel(); } catch (e) { /* ignore */ } if (!live.size) stopListening(); };
    a.onfinish = done; a.oncancel = () => live.delete(a);
    return a;
  }
  function listen() {
    if (unsub || !win || !win.addEventListener) return;
    const skip = () => t.skipAll();
    win.addEventListener('pointerdown', skip, true); win.addEventListener('keydown', skip, true);
    unsub = () => { win.removeEventListener('pointerdown', skip, true); win.removeEventListener('keydown', skip, true); unsub = null; };
  }
  function stopListening() { if (unsub) unsub(); }
  function dropGhost(g) { ghosts.delete(g); try { if (g.remove) g.remove(); } catch (e) { /* ignore */ } }

  const t = {
    get running() { return live.size; },
    before(root, from, to, back) {
      const p = plan(from, to, { reduce: isReduced(), back: !!back });
      const tok = { root, p, ghost: null };
      if (p.kind === 'none' || !root) return tok;
      if (p.ghost && root.cloneNode && root.parentNode && typeof root.animate === 'function' && root.childNodes && root.childNodes.length && !(root.querySelector && root.querySelector('canvas'))) {
        try {
          const g = root.cloneNode(true);
          g.setAttribute('aria-hidden', 'true'); g.setAttribute('inert', ''); g.removeAttribute('id');
          g.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;contain:strict';
          g.className = (root.className || '') + ' motion-ghost';
          root.parentNode.insertBefore(g, root.nextSibling); ghosts.add(g); tok.ghost = g;
        } catch (e) { tok.ghost = null; }
      }
      return tok;
    },
    after(tok) {
      if (!tok || !tok.p || tok.p.kind === 'none') return;
      const { root, p, ghost } = tok;
      listen();
      const px = p.dir * p.parallax;
      if (p.kind === 'slide') {
        run(root, [{ opacity: 0, transform: 'translate3d(' + (p.dir * 28) + 'px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], p.ms);
      } else if (p.kind === 'rise') {
        run(root, [{ opacity: 0, transform: 'translate3d(0,24px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], p.ms);
      } else {
        run(root, [{ opacity: 0, transform: 'translate3d(' + px + 'px,0,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], p.ms);
      }
      if (ghost) {
        const a = run(ghost, [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: 'translate3d(' + (-px * 0.6) + 'px,0,0)' }], Math.round(p.ms * 0.8));
        if (a) { const prev = a.onfinish; a.onfinish = () => { prev(); dropGhost(ghost); }; a.oncancel = () => { live.delete(a); dropGhost(ghost); }; } else dropGhost(ghost);
      }
    },
    // Tap or key: jump every running animation to its end (state is already correct; this only removes the motion).
    skipAll() {
      for (const a of Array.from(live)) { try { a.finish(); } catch (e) { try { a.cancel(); } catch (e2) { /* ignore */ } } }
      for (const g of Array.from(ghosts)) dropGhost(g);
      live.clear(); stopListening();
    },
    dispose() {
      for (const a of Array.from(live)) { try { a.cancel(); } catch (e) { /* ignore */ } }
      live.clear(); for (const g of Array.from(ghosts)) dropGhost(g); stopListening();
    },
  };
  return t;
}

// Sheets and modals: the panel springs up with a tiny settle, the backdrop fades. Backdrop blur is static CSS;
// only its opacity moves. Returns { close(done) }. With Reduce motion nothing moves.
export function springIn(panel, backdrop, opts) {
  const o = opts || {};
  const reduce = !!o.reduce;
  const out = { anims: [], close(done) { finishClose(done); } };
  const fromY = o.from === 'center' ? 'translate3d(0,12px,0) scale(0.97)' : 'translate3d(0,40px,0)';
  function mk(el, frames, ms, easing) {
    if (reduce || !el || typeof el.animate !== 'function') return null;
    try { const a = el.animate(frames, { duration: ms, easing, fill: 'both' }); out.anims.push(a); return a; } catch (e) { return null; }
  }
  mk(backdrop, [{ opacity: 0 }, { opacity: 1 }], DUR.sheet, CSS_OUT);
  mk(panel, [{ opacity: 0, transform: fromY }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }], DUR.sheet + 40, 'cubic-bezier(0.2, 0.9, 0.25, 1.06)');
  function finishClose(done) {
    for (const a of out.anims) { try { a.cancel(); } catch (e) { /* ignore */ } }
    out.anims.length = 0;
    const b = mk(backdrop, [{ opacity: 1 }, { opacity: 0 }], DUR.small, CSS_OUT);
    const p = mk(panel, [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: fromY }], DUR.small, CSS_OUT);
    const last = p || b;
    if (!last) { if (done) done(); return; }
    last.onfinish = () => { if (done) done(); };
  }
  return out;
}

export { ease };
