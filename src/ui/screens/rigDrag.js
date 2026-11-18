// Drag and drop with pointer events. A part from the tray or a placed part can be dragged to a cell.
// Dragging starts only after a small move, so a normal tap still works.
import { h } from '../dom.js';
import { drop } from '../logic/rigState.js';

const START_DIST = 8;

export function enableDrag(scope, root, onDrop, iconFor) {
  let drag = null; // { source, x0, y0, ghost, started }

  function cellAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest ? el.closest('.rig-cell') : null;
    return cell ? { r: Number(cell.dataset.r), c: Number(cell.dataset.c), el: cell } : null;
  }
  function clearHover() {
    for (const c of root.querySelectorAll('.rig-cell.hover')) c.classList.remove('hover');
  }
  function move(e) {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.started && Math.hypot(dx, dy) < START_DIST) return;
    if (!drag.started) {
      drag.started = true;
      drag.ghost = h('img', { class: 'drag-ghost', alt: '' });
      const src = iconFor(drag.source.partId);
      if (src) drag.ghost.src = src;
      document.body.append(drag.ghost);
    }
    e.preventDefault();
    drag.ghost.style.transform = 'translate(' + (e.clientX - 28) + 'px,' + (e.clientY - 28) + 'px)';
    clearHover();
    const hit = cellAt(e.clientX, e.clientY);
    if (hit) hit.el.classList.add('hover');
  }
  function end(e, cancelled) {
    if (!drag) return;
    const d = drag;
    drag = null;
    clearHover();
    if (d.ghost) d.ghost.remove();
    if (d.started && !cancelled) {
      const hit = cellAt(e.clientX, e.clientY);
      if (hit) onDrop(drop(d.source, hit.r, hit.c));
      d.suppressClick = true;
      scope.timeout(() => {}, 0);
      // The tap that follows a drag must not also place or select anything.
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 60);
    }
  }
  scope.on(window, 'pointermove', move, { passive: false });
  scope.on(window, 'pointerup', (e) => end(e, false));
  scope.on(window, 'pointercancel', (e) => end(e, true));
  scope.add(() => { if (drag && drag.ghost) drag.ghost.remove(); drag = null; });

  // Call from pointerdown on a tray card or a filled cell.
  return function begin(e, source) {
    if (!source || !source.partId || (e.button != null && e.button > 0)) return;
    drag = { source, x0: e.clientX, y0: e.clientY, ghost: null, started: false };
  };
}
