// Spotlight and tooltip. The glow rings never block taps. Only the tooltip's buttons take taps.
import { placeBox, edgeInset } from './overlay-math.js';

const CSS = `
.tut-layer{position:fixed;inset:0;z-index:9000;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.tut-ring{position:fixed;border:2px solid var(--gold,#f6c453);border-radius:14px;box-shadow:0 0 0 4px rgba(246,196,83,.22),0 0 24px rgba(246,196,83,.5);pointer-events:none;transition:left .2s ease-out,top .2s ease-out,width .2s ease-out,height .2s ease-out;animation:tutpulse 1.6s ease-in-out infinite}
.tut-tip{position:fixed;box-sizing:border-box;display:flex;align-items:center;gap:8px;max-width:min(320px,calc(100vw - 24px));padding:6px 6px 6px 14px;background:var(--ink-700,#141b2e);color:var(--text,#eef2ff);border:1px solid var(--line,#2a3555);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 0 1px rgba(246,196,83,.25);pointer-events:auto;font-size:15px;line-height:1.3}
[data-large="1"] .tut-tip{font-size:18px}
.tut-text{margin:0;flex:1 1 120px;min-width:0}
.tut-actions{display:flex;gap:4px;align-items:center;flex:none}
.tut-btn,.tut-skip{min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;font:inherit;font-size:14px;cursor:pointer;border:0}
.tut-btn{background:var(--gold,#f6c453);color:#1a1206;font-weight:700}
.tut-skip{background:transparent;color:var(--muted,#8d97b8)}
@keyframes tutpulse{0%,100%{opacity:1}50%{opacity:.6}}
@media (prefers-reduced-motion:reduce){.tut-ring{animation:none;transition:none}}
[data-reduce="1"] .tut-ring{animation:none;transition:none}
.reduce-motion .tut-ring,[data-reduce-motion="true"] .tut-ring{animation:none;transition:none}
`;

const MAX_RINGS = 2;

function px(n) {
  return Math.round(n) + 'px';
}

// doc and win are passed in so tests can use fakes.
export function createOverlay(doc, win) {
  let layer = null;
  let rings = [];
  let tip = null;
  let text = null;
  let gotBtn = null;
  let skipBtn = null;
  let handlers = { onButton: null, onSkip: null };
  let last = { text: '', button: null, rects: [], side: '' };
  let visible = false;
  let resizeOff = null;

  function build() {
    if (layer) return;
    const style = doc.createElement('style');
    style.setAttribute('data-tut-style', '1');
    style.textContent = CSS;
    (doc.head || doc.body).appendChild(style);
    layer = doc.createElement('div');
    layer.className = 'tut-layer';
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = doc.createElement('div');
      r.className = 'tut-ring';
      r.style.display = 'none';
      layer.appendChild(r);
      rings.push(r);
    }
    tip = doc.createElement('div');
    tip.className = 'tut-tip';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    text = doc.createElement('p');
    text.className = 'tut-text';
    const actions = doc.createElement('div');
    actions.className = 'tut-actions';
    skipBtn = doc.createElement('button');
    skipBtn.className = 'tut-skip';
    skipBtn.textContent = 'Skip';
    skipBtn.setAttribute('type', 'button');
    gotBtn = doc.createElement('button');
    gotBtn.className = 'tut-btn';
    gotBtn.setAttribute('type', 'button');
    // One tap runs the action once, even if the player taps fast.
    skipBtn.addEventListener('click', () => handlers.onSkip && handlers.onSkip());
    gotBtn.addEventListener('click', () => handlers.onButton && handlers.onButton());
    actions.appendChild(skipBtn);
    actions.appendChild(gotBtn);
    tip.appendChild(text);
    tip.appendChild(actions);
    layer.appendChild(tip);
    doc.body.appendChild(layer);
    if (win && win.addEventListener) {
      const again = () => visible && place();
      win.addEventListener('resize', again);
      win.addEventListener('orientationchange', again);
      resizeOff = () => {
        win.removeEventListener('resize', again);
        win.removeEventListener('orientationchange', again);
      };
    }
  }

  function place() {
    const vp = { w: Number(win && win.innerWidth) || 360, h: Number(win && win.innerHeight) || 640 };
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = last.rects[i];
      if (!r) {
        rings[i].style.display = 'none';
        continue;
      }
      const s = rings[i].style;
      s.display = 'block';
      s.left = px(r.left - 4);
      s.top = px(r.top - 4);
      s.width = px(r.width + 8);
      s.height = px(r.height + 8);
    }
    const defaultMax = Math.min(320, vp.w - 24);
    const minX = edgeInset(last.rects, vp.w);
    tip.style.maxWidth = Math.max(160, Math.min(defaultMax, vp.w - minX - 12)) + 'px';
    const box = tip.getBoundingClientRect();
    const p = placeBox(last.rects, { w: box.width, h: box.height }, vp, { prefer: last.side, top: headerBottom() + 8, minX, avoid: popups() });
    tip.style.left = px(p.x);
    tip.style.top = px(p.y);
    tip.style.visibility = p.hidden ? 'hidden' : 'visible';
  }

  // The bottom of a top bar or game header, so the note starts under it.
  function headerBottom() {
    let low = 0;
    try {
      const list = doc.querySelectorAll('.home-top, .topbar, .drop-top');
      for (let i = 0; i < list.length; i++) {
        const r = list[i].getBoundingClientRect();
        if (r.width > 0 && r.top < 8 && r.bottom < 140) low = Math.max(low, r.bottom);
      }
    } catch (e) { /* use 0 */ }
    return low;
  }

  // Pop-ups the note must never sit on: achievement, codex and reward moments, toasts, boxes.
  function popups() {
    const out = [];
    try {
      const list = doc.querySelectorAll('[class^="cine-"], [class*=" cine-"], .toast, .modal, [role="dialog"], .helptip-body');
      for (let i = 0; i < list.length; i++) {
        const el = list[i];
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) continue;
        const cs = win && win.getComputedStyle ? win.getComputedStyle(el) : null;
        if (cs && (cs.visibility === 'hidden' || Number(cs.opacity) < 0.05)) continue;
        out.push({ left: r.left, top: r.top, width: r.width, height: r.height });
      }
    } catch (e) { /* none */ }
    return out;
  }

  return {
    // spec: { rects, text, button, side, onButton, onSkip }. Calling it again with the same content is cheap.
    show(spec) {
      if (!spec) return;
      build();
      handlers = { onButton: spec.onButton || null, onSkip: spec.onSkip || null };
      const rects = Array.isArray(spec.rects) ? spec.rects.slice(0, MAX_RINGS) : [];
      const label = typeof spec.button === 'string' ? spec.button : '';
      const t = typeof spec.text === 'string' ? spec.text : '';
      if (t !== last.text) text.textContent = t;
      if (label !== last.button) {
        gotBtn.textContent = label;
        gotBtn.style.display = label ? 'inline-block' : 'none';
      }
      last = { text: t, button: label, rects, side: spec.side === 'bottom' ? 'bottom' : 'top' };
      layer.style.display = 'block';
      visible = true;
      place();
    },
    hide() {
      visible = false;
      if (layer) layer.style.display = 'none';
    },
    destroy() {
      visible = false;
      if (resizeOff) resizeOff();
      resizeOff = null;
      if (layer && layer.remove) layer.remove();
      layer = null;
      rings = [];
    },
    isVisible: () => visible,
  };
}
