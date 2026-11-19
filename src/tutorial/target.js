// Finding things on the page. UI elements are marked with data-tut="<name>".

// A plain copy of an element's box, or null when it is missing or has no size.
export function readRect(el) {
  try {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (!r || !(r.width > 0) || !(r.height > 0)) return null;
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  } catch (e) {
    return null;
  }
}

// cells: [{ r, c, part, ref }]. part is '' or null for an empty cell.
// Picks an empty cell, best first: same row as the Hook, next to the Hook, lower rows.
export function pickGoodCell(cells) {
  if (!Array.isArray(cells)) return null;
  const valid = cells.filter((x) => x && Number.isFinite(x.r) && Number.isFinite(x.c));
  const hooks = valid.filter((x) => x.part === 'hook');
  let best = null;
  let bestScore = -Infinity;
  for (const cell of valid) {
    if (cell.part) continue;
    let score = cell.r; // lower rows touch the stream first
    for (const h of hooks) {
      if (h.r === cell.r) score += 4;
      if (h.r === cell.r && Math.abs(h.c - cell.c) === 1) score += 3;
    }
    if (score > bestScore || (score === bestScore && best && cell.r === best.r && cell.c < best.c)) {
      best = cell;
      bestScore = score;
    }
  }
  return best;
}

function attr(el, name) {
  try {
    return el.getAttribute ? el.getAttribute(name) : null;
  } catch (e) {
    return null;
  }
}

// Returns find(name) -> { el, rect } | null.
export function makeFinder(doc) {
  return function find(name) {
    try {
      if (!doc || typeof name !== 'string') return null;
      if (name === 'rig-good-cell') {
        const list = doc.querySelectorAll('[data-tut~="rig-cell"]');
        const cells = [];
        for (let i = 0; i < list.length; i++) {
          const el = list[i];
          cells.push({ r: Number(attr(el, 'data-r')), c: Number(attr(el, 'data-c')), part: (attr(el, 'data-part') === 'empty' ? '' : attr(el, 'data-part')) || '', ref: el });
        }
        const pick = pickGoodCell(cells);
        const rect = pick ? readRect(pick.ref) : null;
        return rect ? { el: pick.ref, rect } : null;
      }
      const el = doc.querySelector('[data-tut~="' + name + '"]');
      const rect = el ? readRect(el) : null;
      return rect ? { el, rect } : null;
    } catch (e) {
      return null;
    }
  };
}
