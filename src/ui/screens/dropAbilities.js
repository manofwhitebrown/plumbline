// Round skill buttons in the bottom corners, above HAUL UP. A cooldown sweep shows when each comes back.
// cb: { onUse(id) }. update(skills) takes view.play.skills.
import { h } from '../dom.js';
import { skillModel, SKILL_ORDER } from '../logic/playModel.js';
import { buzz } from '../../platform/haptics.js';
import { ui } from '../soft.js';

const ICON = { brace: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z', surge: 'M13 2L5 14h6l-1 8 8-12h-6z', flare: 'M12 3l2 6 6 1-5 4 2 6-5-3-5 3 2-6-5-4 6-1z' };

export function createAbilityButtons(cb, scope) {
  const btns = {};
  const left = h('div', { class: 'ab ab-left' }), right = h('div', { class: 'ab ab-right' });
  for (const id of SKILL_ORDER) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICON[id]);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'ab-icon'); svg.setAttribute('aria-hidden', 'true'); svg.append(path);
    const label = h('span', { class: 'num ab-count' }), key = h('span', { class: 'ab-key', 'aria-hidden': 'true' });
    const b = h('button', { class: 'ab-btn ab-' + id, type: 'button', hidden: true, 'data-skill': id }, svg, label, key);
    // pointerdown answers in the same frame; click covers the keyboard. A second press finds no charge, so double taps are safe.
    scope.on(b, 'pointerdown', (e) => { if (e && e.pointerType === 'mouse' && e.button !== 0) return; use(id); });
    scope.on(b, 'click', (e) => { if (e && e.detail === 0) use(id); });
    btns[id] = { b, label, key, shown: false, fill: -1, ready: null, active: null, text: null };
    (id === 'brace' ? left : right).append(b);
  }
  function use(id) {
    try { const r = cb.onUse(id); if (r && r.ok) { buzz('tap'); ui('tap'); } } catch (e) { /* never throw into the game */ }
  }
  function update(skills) {
    const seen = {};
    for (const s of Array.isArray(skills) ? skills : []) {
      const m = skillModel(s), t = btns[m.id];
      if (!t) continue;
      seen[m.id] = true;
      if (!t.shown) { t.shown = true; t.b.hidden = false; t.key.textContent = m.key; }
      const f = Math.round(m.fill * 100);
      if (f !== t.fill) { t.fill = f; t.b.style.setProperty('--fill', f + '%'); }
      if (m.ready !== t.ready) { t.ready = m.ready; t.b.classList.toggle('ready', m.ready); t.b.setAttribute('aria-disabled', m.ready ? 'false' : 'true'); }
      if (m.active !== t.active) { t.active = m.active; t.b.classList.toggle('on', m.active); }
      if (m.label !== t.text) { t.text = m.label; t.label.textContent = m.label; }
      t.b.setAttribute('aria-label', m.aria);
    }
    for (const id of SKILL_ORDER) if (!seen[id] && btns[id].shown) { btns[id].shown = false; btns[id].b.hidden = true; }
  }
  return { nodes: [left, right], update, use };
}
