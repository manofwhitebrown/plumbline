// Home: top bar, living surface scene, big Drop button, daily reward, Collapse banner.
import { registerScreen, go, setBadge } from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { iconHtml } from '../icons.js';
import { topbar } from '../components/topbar.js';
import { button } from '../components/button.js';
import { api } from '../api.js';
import { bus, fmt, fmtDepth } from '../soft.js';
import { startDrop, bestDepth } from '../flow.js';
import { canvasScene } from './homeScene.js';
import { openCollapse } from '../modalsCollapse.js';
import { maybeWelcomeBack } from '../modalsWelcome.js';
import { helpTip } from '../components/helpTip.js';
import { nextStepLine, readProgress } from '../../tutorial/nextStep.js';

let scope = null;

function crewCount() {
  try {
    return api.meta.crew.list().reduce((n, c) => n + (Number(c && (c.owned != null ? c.owned : c.count)) || 0), 0);
  } catch (e) { return 0; }
}

registerScreen('home', {
  mount(el) {
    scope = createScope();
    const best = bestDepth();
    const sceneHost = canvasScene(best, crewCount(), scope);
    const scene = sceneHost.el;
    const bar = topbar({ settings: () => go('settings') }, scope);
    const dropBtn = button({ label: 'Drop', sub: 'Best ' + fmtDepth(best), kind: 'primary', big: true, onPress: () => startDrop(), aria: 'Drop. Best ' + fmtDepth(best) }, scope);
    dropBtn.setAttribute('data-tut', 'home-drop');
    dropBtn.classList.add('drop-btn');
    dropBtn.setAttribute('data-tut', 'home-drop');
    const banner = h('div', { class: 'banner-slot' });
    const income = h('div', { class: 'income sub' });
    const nextLine = h('p', { class: 'sub next-step', 'aria-live': 'polite' });
    const gift = h('button', { class: 'btn ghost iconbtn gift', type: 'button', 'aria-label': 'Daily reward' }, svg(iconHtml('gift')), h('span', { class: 'dot', hidden: true }));
    scope.on(gift, 'click', () => go('rewards'));

    function refresh() {
      let canClaim = false;
      try { canClaim = !!api.meta.daily.state().canClaim; } catch (e) { /* no dot */ }
      gift.querySelector('.dot').hidden = !canClaim;
      setBadge('rewards', canClaim);
      banner.textContent = '';
      try {
        if (api.meta.collapse.available()) {
          const gain = api.meta.collapse.preview().coreDustGain || 0;
          const b = button({ label: 'Collapse ready: +' + fmt(gain) + ' Core Dust', kind: 'secondary', onPress: () => openCollapse() }, scope);
          b.classList.add('collapse-banner');
          banner.append(b, helpTip('collapse', { scope }));
        }
      } catch (e) { /* hide the banner */ }
      let ps = 0;
      try { ps = api.meta.crew.perSecond(); } catch (e) { /* 0 */ }
      nextLine.textContent = nextStepLine(readProgress(api, bestDepth()));
      income.textContent = ps > 0 ? 'Crew earns ' + fmt(ps) + ' Gold per second' : 'Buy Crew to earn Gold while you rest';
    }
    scope.sub(bus, 'meta:changed', () => { refresh(); sceneHost.setCrew(crewCount()); });
    refresh();

    const screen = h('section', { class: 'screen no-pad screen-home' },
      h('div', { class: 'home-top' }, bar, gift),
      scene,
      h('div', { class: 'home-bottom' }, h('div', { class: 'row home-income' }, income, helpTip('crew', { scope })), nextLine, banner, dropBtn));
    el.append(screen);
    maybeWelcomeBack();
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
