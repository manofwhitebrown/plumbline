// The bucket grid. Cells are real buttons, so keyboard and screen readers work.
import { h } from '../dom.js';
import { api } from '../api.js';

// Moves focus with arrow keys. Enter and Space press the focused cell (native button behaviour).
export function arrowTarget(r, c, key, rows, cols) {
  const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key];
  if (!d) return null;
  const nr = Math.min(rows - 1, Math.max(0, r + d[0]));
  const nc = Math.min(cols - 1, Math.max(0, c + d[1]));
  return { r: nr, c: nc };
}

export function buildGrid(rig, scope, handlers) {
  const rows = rig.rows, cols = rig.cols;
  const grid = h('div', { class: 'rig-grid', role: 'grid', 'aria-label': 'Rig', style: '--cols:' + cols, 'data-tut': 'rig-grid' });
  const cells = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      const b = h('button', { type: 'button', class: 'rig-cell', 'data-r': r, 'data-c': c, 'data-tut': 'rig-cell', 'data-part': 'empty', role: 'gridcell', tabindex: r === 0 && c === 0 ? 0 : -1 });
      scope.on(b, 'click', () => handlers.onCell(r, c));
      scope.on(b, 'pointerdown', (e) => handlers.onCellDown && handlers.onCellDown(e, r, c));
      scope.on(b, 'keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && handlers.onRemove) { e.preventDefault(); handlers.onRemove(r, c); return; }
        const t = arrowTarget(r, c, e.key, rows, cols);
        if (!t) return;
        e.preventDefault();
        const next = cells[t.r][t.c];
        cells[r][c].tabIndex = -1; next.tabIndex = 0; next.focus();
      });
      cells[r][c] = b;
      grid.append(b);
    }
  }
  // Paint contents. Only touches a cell when its part changed.
  function paint(currentRig, glow, selected) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const b = cells[r][c];
        const id = (currentRig.cells[r] && currentRig.cells[r][c]) || null;
        if (b.dataset.part !== (id || 'empty')) {
          b.dataset.part = id || 'empty';
          b.textContent = '';
          if (id) {
            const part = api.getPart(id);
            const img = h('img', { alt: '', draggable: 'false' });
            const src = api.partIcon(id, 96);
            if (src) img.src = src;
            b.append(img);
            b.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + ': ' + (part ? part.name : 'Part'));
          } else {
            b.setAttribute('aria-label', 'Row ' + (r + 1) + ', column ' + (c + 1) + ': empty');
          }
        }
        b.classList.toggle('glow', !!glow && (!id || glow === 'all'));
        b.classList.toggle('sel', !!selected && selected.r === r && selected.c === c);
        b.classList.toggle('filled', !!id);
      }
    }
  }
  return { el: grid, cells, paint };
}
