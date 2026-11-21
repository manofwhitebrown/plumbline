// Mastery on screen: a row of 5 pips and one plain sentence. Logic lives in src/meta/mastery.js.
import { h, setText } from '../dom.js';
import { progress } from '../components/progress.js';
import { api } from '../api.js';
import * as M from '../../meta/mastery.js';

const SAFE = { id: '', level: 0, max: 5, uses: 0, maxed: false, toNext: 0, fraction: 0, goldPct: 0, sentence: '' };

// Pure view of one Part's Mastery. Bad input gives level 0.
export function masteryView(partId) {
  let i = SAFE;
  try { i = typeof partId === 'string' && partId ? M.info(partId) : SAFE; } catch (e) { i = SAFE; }
  const level = Math.min(5, Math.max(0, Math.floor(Number(i.level) || 0)));
  return {
    id: String(i.id || ''), level, max: 5, uses: Number(i.uses) || 0, maxed: !!i.maxed,
    fraction: Math.min(1, Math.max(0, Number(i.fraction) || 0)),
    label: 'Mastery ' + level + ' of 5',
    sentence: String(i.sentence || ''),
    next: i.maxed ? 'Fully mastered.' : (Math.max(0, Number(i.toNext) || 0) + ' more uses to Mastery ' + (level + 1) + '.'),
  };
}

function pipRow(big) {
  const pips = [];
  for (let k = 0; k < 5; k++) pips.push(h('span', { class: 'mast-pip' }));
  const el = h('span', { class: 'mast-pips' + (big ? ' big' : ''), role: 'img' }, ...pips);
  function set(level, label) {
    pips.forEach((p, k) => p.classList.toggle('on', k < level));
    if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
  }
  return { el, set };
}

// Small row for a Workshop card. update() is cheap and safe to call often.
export function masteryCardRow(partId) {
  const row = pipRow(false);
  const el = h('div', { class: 'mast-card-row' }, row.el);
  function update(show) {
    const v = masteryView(partId);
    row.set(v.level, v.label);
    el.hidden = show === false;
    return v;
  }
  update(true);
  return { el, update };
}

// Bigger block for a part sheet: pips, one sentence, and how far to the next level.
export function masteryBlock(partId) {
  const v = masteryView(partId);
  const row = pipRow(true);
  row.set(v.level, v.label);
  const bar = progress(v.fraction, 'Progress to the next Mastery');
  const kids = [
    h('div', { class: 'mast-head' }, h('span', { class: 'mast-title', text: 'Mastery' }), row.el),
    h('p', { class: 'mast-sentence', text: v.sentence }),
  ];
  if (!v.maxed) kids.push(bar, h('p', { class: 'sub', text: v.next }));
  return h('div', { class: 'mast-block', 'aria-label': v.label }, ...kids);
}

// A line for the Rewards screen: the last Part levels and the last Mastery bonus. Empty text means "show nothing".
export function masteryRecentText() {
  try {
    const r = M.recent();
    if (!r.length) return '';
    const last = r[r.length - 1];
    let name = String(last.id).replace(/_/g, ' ');
    try { const p = api.getPart(last.id); if (p && p.name) name = p.name; } catch (e) { /* keep the id words */ }
    return name + ' reached Mastery ' + last.level + '.';
  } catch (e) { return ''; }
}
export { setText };
