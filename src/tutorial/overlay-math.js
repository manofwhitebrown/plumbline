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
