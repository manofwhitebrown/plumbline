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

// True when the element can be seen and tapped: not hidden, and not faded out (it may be fading in).
export function isShown(el) {
  try {
    const win = el && el.ownerDocument && el.ownerDocument.defaultView;
    if (!win || !win.getComputedStyle) return true;
    let e = el;
    for (let i = 0; e && i < 8; i++, e = e.parentElement) {
      const cs = win.getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.9) return false;
    }
    return true;
  } catch (err) {
    return true;
  }
}

function same(a, b, tol) {
  return Math.abs(a.left - b.left) <= tol && Math.abs(a.top - b.top) <= tol && Math.abs(a.width - b.width) <= tol && Math.abs(a.height - b.height) <= tol;
}

// Returns find(name) -> { el, rect } | null.
// opts.stable: only report a target that is shown and has stopped moving (a button that slides in is not found until it lands).
//   A target that never holds still is accepted after 1.5 s, so a pulsing button can never hide the guide for good.
// opts.now: a clock, for tests.
// Things inside a scrolling screen: if one sits outside the visible part, the guide scrolls it to the middle once.
const SCROLL_TO = { 'rig-new-part': 1, 'rig-good-cell': 1, 'workshop-part': 1 };

function bringIntoView(doc, el, rect, name, done) {
  try {
    if (!SCROLL_TO[name] || done.has(el)) return false;
    const win = doc.defaultView;
    const vh = win && win.innerHeight ? win.innerHeight : 0;
    if (!vh) return false;
    const low = rect.top + rect.height > vh - 150; // under the action bar or tab bar
    const high = rect.top < 60;
    if (!low && !high) return false;
    done.add(el);
    if (el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  } catch (e) {
    return false;
  }
}

export function makeFinder(doc, opts) {
  const o = opts || {};
  const scrolled = new WeakSet();
  const now = typeof o.now === 'function' ? o.now : () => Date.now();
  const samples = new Map();

  function settled(name, el, rect) {
    if (!o.stable) return true;
    if (!isShown(el)) {
      samples.delete(name);
      return false;
    }
    const t = now();
    const prev = samples.get(name);
    if (!prev || prev.el !== el || !same(prev.rect, rect, 1.5)) {
      samples.set(name, { el, rect, since: prev && prev.el === el ? prev.since : t, still: t });
      const cur = samples.get(name);
      return t - cur.since >= 1500;
    }
    prev.rect = rect;
    return t - prev.still >= 200 || t - prev.since >= 1500;
  }

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
        if (rect && bringIntoView(doc, pick.ref, rect, name, scrolled)) return null;
        return rect && settled(name, pick.ref, rect) ? { el: pick.ref, rect } : null;
      }
      if (name === 'workshop-screen') {
        const sc = doc.querySelector('.screen-workshop');
        const r = sc ? readRect(sc) : null;
        return r ? { el: sc, rect: r } : null;
      }
      let el = doc.querySelector('[data-tut~="' + name + '"]');
      if (el && name === 'results-gold' && el.closest) el = el.closest('.res-gold') || el; // ring the whole row, not the counting number
      const rect = el ? readRect(el) : null;
      if (rect && bringIntoView(doc, el, rect, name, scrolled)) return null;
      return rect && settled(name, el, rect) ? { el, rect } : null;
    } catch (e) {
      return null;
    }
  };
}
