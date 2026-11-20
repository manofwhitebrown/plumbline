// Plain logic for the chase pills on the Drop screen. No DOM here, so it is easy to test.
const SLOTS = 3;
const TONES = ['good', 'bad', 'even'];
const text = (x, max) => { const s = typeof x === 'string' ? x.trim() : ''; return s.length > max ? s.slice(0, max - 1) + '…' : s; };

// pills: the list from view.chase.pills. Always returns SLOTS entries; unused ones are hidden.
export function slotsFor(pills, n = SLOTS) {
  const list = Array.isArray(pills) ? pills : [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = list[i];
    const t = p && typeof p === 'object' ? text(p.text, 40) : '';
    out.push(t ? { hidden: false, id: text(p.id, 12) || 'x', text: t, tone: TONES.includes(p.tone) ? p.tone : 'even' } : { hidden: true, id: '', text: '', tone: 'even' });
  }
  return out;
}

// Only touch the page when something changed.
export function slotsKey(slots) { return slots.map((s) => (s.hidden ? '-' : s.id + ':' + s.tone + ':' + s.text)).join('|'); }

// The two lines under the Snap row on Results.
export function chaseLines(chase) {
  const c = chase && typeof chase === 'object' ? chase : {};
  return { near: text(c.nearMiss && c.nearMiss.text, 60), tip: text(c.tip && c.tip.text, 90) };
}
