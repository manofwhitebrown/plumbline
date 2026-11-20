// Results extras (SCREENS-1): the record line, relic banners and chase pills.
// The first three functions are pure (no page needed), so tests can run them in plain Node.
import { relicById, RARITY, RELICS } from '../../data/relics.js';
import { fmt, fmtDepth } from '../../core/format.js';
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';

const RELIC_MAX = 3;
const str = (x, max) => { const s = typeof x === 'string' ? x.trim() : ''; return s.length > max ? s.slice(0, max - 1) + '…' : s; };
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };

// The second line of the record banner. Plain words.
export function recordLine(r) {
  const depth = num(r && r.depth), before = num(r && r.bestBefore);
  if (!(before > 0)) return 'Your deepest drop yet';
  const gap = depth - before;
  return gap > 0 ? 'Past your best by ' + fmtDepth(gap) : 'Your deepest drop yet';
}

// Relics found on this drop, from the raw payload (play.relics is a list of ids).
// Unknown ids are skipped. At most RELIC_MAX are named; the rest are counted in `more`.
export function relicsFound(raw) {
  const ids = raw && raw.play && Array.isArray(raw.play.relics) ? raw.play.relics : [];
  const seen = new Set(), list = [];
  for (const id of ids) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    const d = relicById(id);
    if (!d) continue;
    const rar = RARITY[d.rarity] || RARITY.common;
    list.push({ id: d.id, name: str(d.name, 22), rarity: rar.name, color: rar.color });
  }
  return { shown: list.slice(0, RELIC_MAX), more: Math.max(0, list.length - RELIC_MAX) };
}

// The chase lines as pills. `chase` is the normalised { near, tip } text pair. Empty text gives no pill.
export function chasePills(chase) {
  const c = chase && typeof chase === 'object' ? chase : {};
  const out = [];
  if (str(c.near, 60)) out.push({ id: 'near', text: str(c.near, 60), tone: 'gold', icon: 'star' });
  if (str(c.tip, 90)) out.push({ id: 'tip', text: str(c.tip, 90), tone: 'shard', icon: 'shard' });
  return out;
}

// ---- small page builders (used by results.js) ----

export function recordBanner(r) {
  return h('div', { class: 'res-record', role: 'status' },
    h('div', { class: 'res-record-top' }, svg(iconHtml('trophy')), h('span', { text: 'NEW RECORD' }), svg(iconHtml('trophy'))),
    h('div', { class: 'res-record-sub', text: recordLine(r) }));
}

export function relicBanner(raw) {
  const f = relicsFound(raw);
  if (!f.shown.length) return null;
  const box = h('div', { class: 'res-relics', role: 'status', 'aria-label': 'Relics found' });
  for (const x of f.shown) {
    box.append(h('div', { class: 'res-relic', style: '--rar:' + x.color },
      h('span', { class: 'res-relic-gem' }, svg(iconHtml('rewards'))),
      h('span', { class: 'res-relic-text' },
        h('span', { class: 'res-relic-kicker', text: 'Relic found' }),
        h('span', { class: 'res-relic-name', text: x.name })),
      h('span', { class: 'res-relic-rar', text: x.rarity })));
  }
  if (f.more > 0) box.append(h('div', { class: 'res-relic-more', text: '+' + fmt(f.more) + ' more in your Codex' }));
  return box;
}

export function chaseBlock(chase) {
  const pills = chasePills(chase);
  if (!pills.length) return null;
  const box = h('div', { class: 'res-chase', role: 'status' });
  for (const p of pills) {
    box.append(h('div', { class: 'res-pill ' + p.tone + ' res-' + p.id }, svg(iconHtml(p.icon), 'res-pill-icon'), h('span', { class: 'res-pill-text', text: p.text })));
  }
  return box;
}

// Preview only: with ?debug=1&fake=full on the page, a debug result gets sample relics and chase lines,
// so the banners can be looked at. Real drops never go through here (they carry no `debug` flag).
export function withPreviewExtras(raw, search) {
  try {
    if (!raw || raw.debug !== true || !/(?:^|[?&])fake=full(?:&|$)/.test(String(search || ''))) return raw;
    const ids = [RELICS[0].id, RELICS[5].id, RELICS[11].id, RELICS[17].id];
    return { ...raw, play: { ...(raw.play || {}), relics: ids },
      chase: { nearMiss: { text: 'Only 12 m from the next Biome.' }, tip: { text: 'Buy Mender now: less Strain on every Drop.' } } };
  } catch (e) { return raw; }
}
