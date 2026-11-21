// Crew screen: total Gold per second, six Crew cards, x1 / x10 / Max toggle.
import { registerScreen } from '../shell.js';
import * as shell from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { iconHtml } from '../icons.js';
import { counter } from '../components/counter.js';
import { titleWithTip } from '../components/helpTip.js';
import { api } from '../api.js';
import { bus, fmt, ui, buzz, log } from '../soft.js';
import { crewCard, CREW_MODES, getMode, setMode, modeLabel } from './crewCard.js';
import '../styles/crew.css';

let scope = null;

function shake(card) {
  if (!card || !card.classList) return;
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
}

registerScreen('crew', {
  mount(el) {
    scope = createScope();
    let mode = getMode();
    const cards = new Map();
    let live = true;

    const total = counter(0, { cls: 'big-num', format: (v) => fmt(v) }, scope);
    const header = h('div', { class: 'card crew-top' },
      h('div', { class: 'sub', text: 'Your Crew earns' }),
      h('div', { class: 'row crew-total' }, svg(iconHtml('gold')), total, h('span', { class: 'sub', text: 'Gold per second' })),
      h('div', { class: 'row crew-tips' }, titleWithTip('Manager', 'manager', scope), titleWithTip('Milestone', 'milestone', scope)),
      h('p', { class: 'sub crew-help', text: 'Crew earn Gold every second, even when you are away. Buy more to earn faster. Each milestone doubles a Crew\'s output. A Manager triples it.' }));
    const toggle = h('div', { class: 'crew-toggle', role: 'group', 'aria-label': 'How many to buy' });
    const modeBtns = CREW_MODES.map((m) => {
      const b = h('button', { type: 'button', class: 'btn crew-mode', text: modeLabel(m) });
      scope.on(b, 'click', () => { mode = setMode(m); ui('tap'); refresh(); });
      toggle.append(b);
      return { m, b };
    });
    const list = h('div', { class: 'crew-list' });
    const emptyCrew = h('p', { class: 'sub center crew-empty', text: 'No crew here yet. Earn some Gold first.', hidden: true });

    const handlers = {
      buy(id, card) {
        let res;
        try { res = api.meta.crew.buy(id, mode); } catch (e) { log.warn('crew buy failed'); res = { ok: false, error: 'Could not buy. Try again.' }; }
        if (res && res.ok) {
          ui('buy'); buzz('collect');
          card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
        } else {
          ui('deny'); shake(card);
          shell.toast((res && res.error) || 'Could not buy.', 'error');
        }
        refresh();
      },
      hire(id, card) {
        let res;
        try { res = api.meta.crew.hireManager(id); } catch (e) { res = { ok: false, error: 'Could not hire. Try again.' }; }
        if (res && res.ok) { ui('buy'); buzz('collect'); shell.toast('Manager hired. Output x3.', 'ok'); }
        else { ui('deny'); shake(card); shell.toast((res && res.error) || 'Could not hire.', 'error'); }
        refresh();
      },
      deny(id, why, card) {
        shake(card);
        shell.toast(why || 'Not yet.', 'warn');
      },
    };

    function refresh() {
      if (!live) return;
      let items = [];
      let gold = 0;
      try { items = api.meta.crew.list() || []; gold = Number(api.meta.gold()) || 0; } catch (e) { log.warn('crew list failed'); }
      for (const c of items) {
        if (!c || !c.id) continue;
        let entry = cards.get(c.id);
        if (!entry) {
          entry = crewCard(c, handlers, scope);
          cards.set(c.id, entry);
          list.append(entry.el);
        }
        entry.update(c, mode, gold);
      }
      emptyCrew.hidden = items.length > 0;
      for (const mb of modeBtns) {
        const on = mb.m === mode;
        mb.b.classList.toggle('on', on);
        mb.b.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      try { total.set(Number(api.meta.crew.perSecond()) || 0); } catch (e) { /* keep the old number */ }
    }

    scope.sub(bus, 'meta:changed', refresh);
    scope.add(() => { live = false; });
    el.append(h('section', { class: 'screen screen-crew' }, header, toggle, list, emptyCrew));
    refresh();
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
