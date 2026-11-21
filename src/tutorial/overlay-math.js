// Where to put the tooltip so it always stays fully on screen.

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// rect: the highlighted thing {left, top, width, height}, or null for a centred message.
// tip: the tooltip size {w, h}. vp: the screen size {w, h}.
// Returns { x, y, side } where side is 'below', 'above', 'inside' or 'center'.
export function placeTip(rect, tip, vp, margin = 12, gap = 12) {
  const w = Math.max(0, Number(tip && tip.w) || 0);
  const h = Math.max(0, Number(tip && tip.h) || 0);
  const vw = Math.max(0, Number(vp && vp.w) || 0);
  const vh = Math.max(0, Number(vp && vp.h) || 0);
  const maxX = Math.max(margin, vw - w - margin);
  const maxY = Math.max(margin, vh - h - margin);
  const ok = rect && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite);
  if (!ok) return { x: clamp((vw - w) / 2, margin, maxX), y: clamp(vh * 0.4 - h / 2, margin, maxY), side: 'center' };

  const cx = rect.left + rect.width / 2;
  const x = clamp(cx - w / 2, margin, maxX);
  const bottom = rect.top + rect.height;
  if (vh - bottom - margin >= h + gap) return { x, y: clamp(bottom + gap, margin, maxY), side: 'below' };
  if (rect.top - margin >= h + gap) return { x, y: clamp(rect.top - gap - h, margin, maxY), side: 'above' };
  // The target is huge. Sit inside it, near the top.
  return { x, y: clamp(vh * 0.2, margin, maxY), side: 'inside' };
}

function hit(a, b, pad) {
  return a.left < b.left + b.width + pad && a.left + a.width + pad > b.left && a.top < b.top + b.height + pad && a.top + a.height + pad > b.top;
}

function good(r) {
  return !!r && [r.left, r.top, r.width, r.height].every(Number.isFinite);
}

// A thin strip that hugs the left or right edge (the rope gauge). The note must start after it.
// Returns the smallest x the note may start at.
export function edgeInset(rects, vw, margin = 12) {
  let min = margin;
  for (const r of Array.isArray(rects) ? rects : []) {
    if (good(r) && r.width < 48 && r.left < vw / 2) min = Math.max(min, Math.round(r.left + r.width + 8));
  }
  return min;
}

// Put the note on the free side of the screen: the top or the bottom, never over what it explains
// and never over a pop-up. rects: what the note explains (may be empty). avoid: pop-ups to keep clear.
// opts: { prefer: 'top' | 'bottom', top: first y of the top side, bottom: gap under the bottom side, minX, margin }
// Returns { x, y, side: 'top' | 'bottom', hidden }. hidden is true when both sides are blocked right now (a pop-up
// is showing): the caller hides the note for a moment and asks again.
export function placeBox(rects, tip, vp, opts = {}) {
  const o = opts || {};
  const margin = Number.isFinite(o.margin) ? o.margin : 12;
  const w = Math.max(0, Number(tip && tip.w) || 0);
  const h = Math.max(0, Number(tip && tip.h) || 0);
  const vw = Math.max(0, Number(vp && vp.w) || 0);
  const vh = Math.max(0, Number(vp && vp.h) || 0);
  const minX = Number.isFinite(o.minX) ? o.minX : margin;
  const maxX = Math.max(minX, vw - w - margin);
  const x = clamp((vw - w) / 2, minX, maxX);
  const topY = clamp(Number.isFinite(o.top) ? o.top : margin, margin, Math.max(margin, vh - h - margin));
  const botY = Math.max(margin, vh - h - (Number.isFinite(o.bottom) ? o.bottom : margin));
  const targets = (Array.isArray(rects) ? rects : []).filter(good);
  const avoid = (Array.isArray(o.avoid) ? o.avoid : []).filter(good);
  const order = o.prefer === 'bottom' ? ['bottom', 'top'] : ['top', 'bottom'];
  const eval1 = (side) => {
    const box = { left: x, top: side === 'top' ? topY : botY, width: w, height: h };
    return { side, y: box.top, onTarget: targets.some((r) => hit(box, r, 6)), onPopup: avoid.some((r) => hit(box, r, 4)) };
  };
  const tries = order.map(eval1);
  const clear = tries.find((t) => !t.onTarget && !t.onPopup);
  if (clear) return { x, y: clear.y, side: clear.side, hidden: false };
  const popupOnly = tries.find((t) => !t.onTarget);
  if (popupOnly) return { x, y: popupOnly.y, side: popupOnly.side, hidden: true };
  // Both sides touch the target (a huge target). Take the preferred side, unless a pop-up is there.
  const first = tries[0];
  return { x, y: first.y, side: first.side, hidden: first.onPopup };
}
