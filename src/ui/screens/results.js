// Results: a staged reveal of what the drop earned. Tap to skip. Buttons: Drop again, Home, Tweak rig.
import '../styles/results.css';
import '../styles/resultsChase.css'; // [HOOK-1] wave 2
import { registerScreen } from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { iconHtml } from '../icons.js';
import { api } from '../api.js';
import { fmt, fmtDepth, audioCall } from '../soft.js';
import { buzz } from '../../platform/haptics.js';
import { button } from '../components/button.js';
import { counter } from '../components/counter.js';
import { gemChip } from '../components/gemChip.js';
import { popIn } from '../components/celebrate.js';
import { startDrop, goTab } from '../flow.js';
import { getSettings } from '../settings.js';
import { normalizeResult, titleText, snapText, comboText, revealPlan } from '../logic/resultsPlan.js';
import { createReveal } from './resultsReveal.js';
import { recordBanner, relicBanner, chaseBlock, withPreviewExtras } from './resultsBanners.js'; // [SCREENS-1]
import { backdropUrl } from '../theme/textures.js';
import { countText } from '../../core/plural.js';

let scope = null;

function pickPayload(params) {
  if (params && typeof params === 'object' && typeof params.outcome === 'string') return params;
  try {
    const last = api.session && typeof api.session.getResult === 'function' ? api.session.getResult() : null;
    if (last) return last;
  } catch (e) { /* fall through */ }
  return params || {};
}

function partName(id) {
  try { const p = api.getPart(id); return p && p.name ? String(p.name) : id; } catch (e) { return id; }
}

registerScreen('results', {
  mount(el, params) {
    scope = createScope();
    const r = normalizeResult(withPreviewExtras(pickPayload(params), typeof location !== 'undefined' ? location.search : ''));
    const reduce = !!getSettings().reduceMotion;
    const raw = withPreviewExtras(pickPayload(params), typeof location !== 'undefined' ? location.search : '');
    const relics = relicBanner(raw); // [SCREENS-1] null when no relic was found
    const plan = revealPlan(r, reduce);
    if (relics) { plan.push({ id: 'relic', at: reduce ? 0 : 1800 }); plan.sort((a, b) => a.at - b.at); }
    const has = (id) => plan.some((s) => s.id === id);
    const rows = {};
    const body = h('div', { class: 'res-body' });
    const add = (id, node) => { node.classList.add('rv'); rows[id] = node; body.append(node); return node; };

    add('title', h('h1', { class: 'res-title' + (r.snapped ? ' snapped' : ''), text: titleText(r) }));

    const depthNum = counter(0, { cls: 'res-depth-num', format: (v) => fmtDepth(v) }, scope); // [SCREENS-1] counts up
    const depthRow = h('div', { class: 'res-depth' }, h('span', { class: 'res-lbl', text: 'Depth' }), depthNum);
    add('depth', depthRow);
    if (has('record')) add('record', recordBanner(r));

    const goldNum = counter(0, { cls: 'big-num', format: (v) => fmt(v) }, scope);
    goldNum.setAttribute('data-tut', 'results-gold');
    add('gold', h('div', { class: 'res-gold', 'aria-label': 'Gold' }, svg(iconHtml('gold'), 'res-icon'), goldNum));
    add('snap', h('div', { class: 'res-snap' + (r.snapped ? ' snapped' : ''), text: snapText(r) }));

    const shardNum = counter(0, { format: (v) => '+' + countText(Math.floor(v), 'Shard') }, scope); // [SCREENS-1] counts up
    if (has('shards')) add('shards', h('div', { class: 'res-shards' }, svg(iconHtml('shard'), 'res-icon sm'), shardNum));

    if (relics) add('relic', relics); // [SCREENS-1] right under the Shards: the exciting part

    if (has('goals')) {
      const list = h('ul', { class: 'res-goals', 'aria-label': 'Goals' });
      r.goals.forEach((g, i) => {
        const mark = g.done ? svg(iconHtml('check'), 'res-check done') : h('span', { class: 'res-check open', 'aria-hidden': 'true' });
        list.append(h('li', { class: 'res-goal' + (g.done ? ' done' : ''), style: '--i:' + i },
          mark, h('span', { class: 'res-goal-text', text: g.text }),
          g.done && g.reward > 0 ? h('span', { class: 'num res-goal-reward', text: '+' + fmt(g.reward) }) : null));
      });
      add('goals', list);
    }

    if (has('best')) {
      const best = h('div', { class: 'res-best' });
      if (r.gem) best.append(h('span', { class: 'res-pair' }, h('span', { class: 'res-lbl', text: 'Best gem' }), gemChip(r.gem.tier, fmt(r.gem.value))));
      if (r.bestCombo > 1) best.append(h('span', { class: 'res-pair num', text: comboText(r.bestCombo) }));
      add('best', best);
    }

    if (has('parts')) {
      const parts = h('div', { class: 'res-parts' }, h('span', { class: 'res-lbl', text: 'Parts used' }));
      const icons = h('div', { class: 'res-icons' });
      for (const p of r.parts) {
        const url = api.partIcon(p.id, 64);
        icons.append(url ? h('img', { class: 'res-part', src: url, alt: partName(p.id), title: partName(p.id) }) : h('span', { class: 'res-part-name', text: partName(p.id) }));
      }
      parts.append(icons);
      add('parts', parts);
    }

    add('summary', h('p', { class: 'res-summary sub', text: r.summaryText }));
    const chase = has('chase') ? chaseBlock(r.chase) : null; // [HOOK-1] wave 2 near-miss line and tip, shown as pills [SCREENS-1]
    if (chase) add('chase', chase);

    // Buttons stay hidden until the end, so an early tap skips the reveal instead of pressing one.
    const again = button({ label: 'Drop again', kind: 'primary', big: true, onPress: () => { startDrop(); } }, scope);
    again.classList.add('res-again');
    const home = button({ label: 'Home', kind: 'secondary', onPress: () => { goTab('home'); } }, scope);
    home.setAttribute('data-tut', 'results-home'); // the tutorial points here: this screen has no tab bar
    const tweak = button({ label: 'Tweak rig', kind: 'ghost', onPress: () => { goTab('rig'); } }, scope);
    tweak.classList.add('res-tweak');
    const actions = h('div', { class: 'res-actions rv' }, again, h('div', { class: 'res-row' }, home, tweak));
    rows.buttons = actions;

    const screen = h('section', { class: 'screen no-pad screen-results' + (r.snapped ? ' snapped' : '') }, body, actions);
    try { const bd = backdropUrl('rewards'); if (bd) screen.style.setProperty('--res-bd', 'url("' + bd + '")'); } catch (e) { /* plain gradient stays */ } // [SCREENS-1]
    el.append(screen);

    audioCall('setScreen', 'results');

    const reveal = createReveal(plan, rows, {
      depth: (s) => depthNum.set(r.depth, s.skipped || reduce ? 0 : 700),
      shards: (s) => shardNum.set(r.shards, s.skipped || reduce ? 0 : 600),
      gold: (s) => {
        goldNum.set(r.gold, s.skipped || reduce ? 0 : s.dur);
        if (r.snapped || !(r.gold > 0)) return;
        scope.timeout(() => rows.gold.classList.add('landed'), s.skipped || reduce ? 0 : s.dur + 80); // a soft glow when it lands
      },
      record: () => { popIn(rows.record); buzz('record'); },
    }, scope);
    // A tap anywhere skips. (The buttons are hidden until the end, so this cannot press one.)
    scope.on(screen, 'pointerdown', () => { if (!reveal.isDone()) reveal.skip(); });
    reveal.start(() => { actions.classList.add('in'); });
    // Safety net: if the animation frames stall, show everything after 4 s so the screen is never blank.
    scope.timeout(() => { if (!reveal.isDone()) reveal.skip(); }, 4000);
  },

  // Back goes Home, never into the finished drop.
  onBack() {
    return goTab('home');
  },

  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
