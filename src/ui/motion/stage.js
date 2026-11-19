// motion/stage.js: runs the director on requestAnimationFrame, only while something is playing (no idle loop, no timers),
// builds an overlay layer per moment, and lets a tap or key skip the blocking cinematics (it never swallows the event).
import { createDirector, PRIORITY } from './director.js';
import { createFxLayer } from '../../render/cinematics/fxLayer.js';
import { makeDropStart, nextVariant } from '../../render/cinematics/dropStart.js';
import { makeHaulFinish } from '../../render/cinematics/haulFinish.js';
import { makeSnapDrama } from '../../render/cinematics/snapDrama.js';

export const BLOCKING = 'blocking';

export function createStage(opts) {
  const o = opts || {};
  const raf = o.raf || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : null);
  const caf = o.caf || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : null);
  const now = o.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const win = o.win !== undefined ? o.win : (typeof window !== 'undefined' ? window : null);
  const isReduced = typeof o.isReduced === 'function' ? o.isReduced : () => false;
  const makeLayer = o.makeLayer || ((host) => createFxLayer(host));
  const cueFn = typeof o.cue === 'function' ? o.cue : () => {};
  const director = createDirector({ reduce: false, audio: () => {}, haptic: () => {} });
  let id = 0, last = 0, listening = false, dead = false;

  function onSkip() { director.skipGroup(BLOCKING); }
  function listen(on) {
    if (!win || !win.addEventListener) return;
    if (on && !listening) { win.addEventListener('pointerdown', onSkip, true); win.addEventListener('keydown', onSkip, true); listening = true; }
    if (!on && listening) { win.removeEventListener('pointerdown', onSkip, true); win.removeEventListener('keydown', onSkip, true); listening = false; }
  }
  function frame() {
    id = 0;
    if (dead) return;
    const t = now(), dt = last ? t - last : 16; last = t;
    director.tick(dt);
    if (director.current || director.pending) id = raf ? raf(frame) : 0; else { listen(false); last = 0; }
  }
  function ensureLoop() {
    if (dead || id) return;
    if (!director.current && !director.pending) return;
    listen(true); last = 0;
    if (raf) id = raf(frame);
  }

  // kind: 'drop' | 'haul' | 'snap'. Returns false when it did not take over (caller must then do its own thing at once).
  function playBlocking(host, kind, p) {
    if (dead || !host) return false;
    const q = p || {};
    director.setReduce(isReduced());
    const reduce = isReduced();
    const maker = kind === 'drop' ? makeDropStart : kind === 'haul' ? makeHaulFinish : makeSnapDrama;
    const variant = kind === 'drop' ? (q.variant || nextVariant()) : undefined;
    let ok = false;
    ok = director.play({
      id: kind, group: BLOCKING, priority: PRIORITY.big, dedupeMs: 0,
      make() {
        const layer = makeLayer(host);
        const def = maker(layer, { variant, parts: q.parts, onGo: q.onGo, cue: reduce ? () => {} : (k) => cueFn(kind, k) });
        const fin = def.finish;
        def.finish = () => { try { fin(); } finally { if (layer.destroy) layer.destroy(); } };
        return def;
      },
    });
    if (ok) ensureLoop();
    return ok;
  }
  return {
    director, playBlocking, ensureLoop,
    get busy() { return !!(director.current || director.pending); },
    skip() { onSkip(); },
    dispose() { dead = true; if (id && caf) caf(id); id = 0; listen(false); director.dispose(); },
  };
}
