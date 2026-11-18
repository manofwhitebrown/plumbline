// The Drop HUD: Depth, Gold with pops, biome chip, goal pills, combo bubble, Strain gauge, Haul Up button.
// It only touches the page when a value changes, and it animates with transform and opacity only.
import { h, svg, setText } from '../dom.js';
import { iconHtml } from '../icons.js';
import { hudModel, goldDelta, popText } from '../logic/dropModel.js';
import { GAUGE_TICKS } from '../logic/danger.js';
import { getSettings } from '../settings.js';
import { ui } from '../soft.js';
import { buzz } from '../../platform/haptics.js';

const POPS = 3;
const PILLS = 3;

// cb: { onHaul(), onPause() }. Returns the pieces to put on the screen, plus update() and setHauling().
export function createHud(cb, scope) {
  const on = (el, type, fn) => (scope ? scope.on(el, type, fn) : el.addEventListener(type, fn));

  // ---- top ----
  const depth = h('span', { class: 'num hud-depth', text: '0 m' });
  const chip = h('span', { class: 'hud-chip ellipsis', text: 'Clay' });
  const goldNum = h('span', { class: 'num hud-gold-num', text: '0' });
  const pops = [];
  for (let i = 0; i < POPS; i++) pops.push(h('span', { class: 'num hud-pop', 'aria-hidden': 'true' }));
  const gold = h('div', { class: 'hud-gold', 'aria-label': 'Gold' }, svg(iconHtml('gold'), 'hud-icon'), goldNum, h('div', { class: 'hud-pops' }, ...pops));
  const pauseBtn = h('button', { class: 'hud-pause', type: 'button', 'aria-label': 'Pause' }, svg(iconHtml('pause')));
  on(pauseBtn, 'click', () => { buzz('tap'); ui('open'); try { cb.onPause(); } catch (e) { /* never throw into the game */ } });

  const pills = [];
  for (let i = 0; i < PILLS; i++) {
    const fill = h('i', { class: 'goal-fill' });
    const text = h('span', { class: 'goal-text ellipsis' });
    const check = svg(iconHtml('check'), 'goal-check');
    pills.push({ el: h('span', { class: 'goal-pill', style: 'visibility:hidden' }, fill, check, text), fill, text, t: '', p: -1, d: false, v: false });
  }
  const combo = h('span', { class: 'num hud-combo', role: 'status', 'aria-label': 'Combo', text: 'x2' });

  const top = h('div', { class: 'drop-top' },
    h('div', { class: 'hud-row' }, depth, chip, gold, pauseBtn),
    h('div', { class: 'hud-row hud-goals', 'aria-label': 'Goals' }, ...pills.map((p) => p.el), combo));

  // ---- strain gauge ----
  const fill = h('i', { class: 'gauge-fill' });
  const gauge = h('div', { class: 'drop-gauge', role: 'meter', 'aria-label': 'Strain', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'data-tut': 'strain', 'data-level': '0' }, fill,
    ...GAUGE_TICKS.map((t) => h('b', { class: 'gauge-tick', style: 'bottom:' + Math.round(t * 100) + '%' })));

  // ---- bottom ----
  const label = h('span', { class: 'haul-label', text: 'Haul Up' });
  const sub = h('small', { class: 'haul-sub', text: 'Keep it all' });
  const haul = h('button', { class: 'haul-btn', type: 'button', 'data-tut': 'haul' }, label, sub);
  const bottom = h('div', { class: 'drop-bottom' }, haul);
  // pointerdown reacts in the same frame as the touch. click covers the keyboard. The lock allows one fire.
  on(haul, 'pointerdown', (e) => {
    if (e && e.pointerType === 'mouse' && e.button !== 0) return;
    try { cb.onHaul(); } catch (err) { /* ignore */ }
  });
  on(haul, 'click', () => { try { cb.onHaul(); } catch (err) { /* ignore */ } });

  const edge = h('div', { class: 'drop-edge', 'aria-hidden': 'true', 'data-edge': '0' });

  let hauling = false, popAt = 0;
  let lastGold = null, lastStrain = -1, lastLevel = -1, lastPulse = false, lastEdge = 0, lastShow = false, lastCombo = 0;

  function pop(n) {
    if (getSettings().reduceMotion) return;
    const el = pops[popAt++ % POPS];
    el.textContent = popText(n);
    if (typeof el.animate === 'function') {
      el.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(22px)', opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'both' });
    } else {
      el.style.opacity = '1';
    }
  }

  function bump(el) {
    if (getSettings().reduceMotion || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
  }

  function update(view) {
    const m = hudModel(view);
    const rawGold = Number(view && view.gold);
    setText(depth, m.depthText);
    setText(goldNum, m.goldText);
    setText(chip, m.biomeName);
    if (lastGold !== null) {
      const d = goldDelta(lastGold, rawGold);
      if (d > 0) pop(d);
    }
    lastGold = Number.isFinite(rawGold) ? rawGold : lastGold;

    if (m.strain01 !== lastStrain) {
      lastStrain = m.strain01;
      fill.style.transform = 'scaleY(' + m.strain01.toFixed(3) + ')';
      gauge.setAttribute('aria-valuenow', String(Math.round(m.strain01 * 100)));
    }
    if (m.level !== lastLevel) { lastLevel = m.level; gauge.setAttribute('data-level', String(m.level)); }
    if (m.edge !== lastEdge) { lastEdge = m.edge; edge.setAttribute('data-edge', String(m.edge)); }
    if (m.pulse !== lastPulse) { lastPulse = m.pulse; haul.classList.toggle('pulse', m.pulse && !hauling); }
    if (!hauling) setText(sub, m.haulSub);

    for (let i = 0; i < PILLS; i++) {
      const p = pills[i], g = m.goals[i];
      if (!g) { if (p.v) { p.v = false; p.el.style.visibility = 'hidden'; } continue; }
      if (!p.v) { p.v = true; p.el.style.visibility = 'visible'; }
      if (p.t !== g.text) { p.t = g.text; p.text.textContent = g.text; p.el.title = g.text; }
      if (p.p !== g.progress01) { p.p = g.progress01; p.fill.style.transform = 'scaleX(' + g.progress01.toFixed(3) + ')'; }
      if (p.d !== g.done) { p.d = g.done; p.el.classList.toggle('done', g.done); }
    }

    if (m.comboShow !== lastShow) { lastShow = m.comboShow; combo.classList.toggle('on', m.comboShow); }
    if (m.comboShow) {
      setText(combo, m.comboText);
      combo.setAttribute('aria-label', 'Combo ' + m.combo);
      if (m.combo > lastCombo) bump(combo);
    }
    lastCombo = m.combo;
  }

  // The button reacts at once and can never fire twice.
  function setHauling(on2) {
    hauling = !!on2;
    haul.disabled = hauling;
    haul.setAttribute('aria-disabled', hauling ? 'true' : 'false');
    haul.classList.toggle('hauling', hauling);
    haul.classList.toggle('pulse', lastPulse && !hauling);
    setText(label, hauling ? 'Hauling…' : 'Haul Up');
    if (hauling) setText(sub, '');
  }

  return { nodes: [edge, top, gauge, bottom], update, setHauling, haulBtn: haul, pauseBtn, gauge, edge };
}
