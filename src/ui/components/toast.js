import { h } from '../dom.js';

// [HUD-2] Pop-ups (toasts): one at a time, 2.5 s, a tap dismisses, extra ones wait in a queue, nothing new starts
// while the boon picker is open, and a pop-up is placed under the Drop HUD so it never covers it.
export const TOAST_MS = 2500, TOAST_RETRY_MS = 200, TOAST_QUEUE_MAX = 5;

// Pure queue (no page needed, so it is easy to test). show(msg, dismiss) returns { remove() }.
export function createPopupQueue({ show, isHeld, schedule = setTimeout, cancel = clearTimeout, ms = TOAST_MS }) {
  const waiting = []; let current = null, timer = 0, retry = 0;
  function pump() {
    if (current || !waiting.length || retry) return;
    let held = false; try { held = !!(isHeld && isHeld()); } catch (e) { held = false; }
    if (held) { retry = schedule(() => { retry = 0; pump(); }, TOAST_RETRY_MS); return; }
    const msg = waiting.shift();
    const handle = { done: false };
    const dismiss = () => {
      if (handle.done) return; handle.done = true;
      cancel(timer); timer = 0;
      try { if (handle.view) handle.view.remove(); } catch (e) { /* the page is gone */ }
      current = null; pump();
    };
    handle.dismiss = dismiss; current = handle;
    try { handle.view = show(msg, dismiss); } catch (e) { handle.done = true; current = null; pump(); return; }
    timer = schedule(dismiss, ms);
  }
  return {
    push(msg) { if (!msg) return; waiting.push(msg); while (waiting.length > TOAST_QUEUE_MAX) waiting.shift(); pump(); },
    dismiss() { if (current && current.dismiss) current.dismiss(); },
    get showing() { return !!current; }, get waiting() { return waiting.length; }
  };
}

const queues = new WeakMap();
function pickerOpen(layer) { const root = layer.parentNode || layer; return !!(root.querySelector && root.querySelector('.bp:not([hidden])')); }

// Put the box under the Drop HUD (the top bar), or at the normal top when no Drop is on screen.
function place(layer, box) {
  const space = 16; let top = space;
  try {
    const root = layer.parentNode || layer, hud = root.querySelector && root.querySelector('.drop-top');
    if (hud && hud.offsetParent !== null) { const a = hud.getBoundingClientRect(), b = layer.getBoundingClientRect(); top = Math.max(space, Math.ceil(a.bottom - b.top) + 8); }
  } catch (e) { top = space; }
  box.style.top = top + 'px';
}

// Show a short message. It queues, removes itself after 2.5 s, and goes away on a tap.
export function showToast(layer, msg) {
  if (!layer || !msg) return null;
  let q = queues.get(layer);
  if (!q) {
    let box = layer.querySelector('.toasts');
    if (!box) { box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); layer.append(box); }
    q = createPopupQueue({
      isHeld: () => pickerOpen(layer),
      show(m, dismiss) {
        place(layer, box);
        const el = h('div', { class: 'toast ' + m.kind, text: m.text });
        el.addEventListener('click', dismiss);
        box.append(el);
        return el;
      }
    });
    queues.set(layer, q);
  }
  q.push(msg);
  return q;
}
