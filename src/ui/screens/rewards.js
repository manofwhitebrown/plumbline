// Rewards: daily streak, daily quests, achievements. Meta owns every number; we show it.
import { registerScreen, go, toast, setBadge } from '../shell.js';
import { h, createScope } from '../dom.js';
import { topbar } from '../components/topbar.js';
import { button } from '../components/button.js';
import { api } from '../api.js';
import { bus } from '../soft.js';
import { buildDaily } from './rewardsDaily.js';
import { buildQuests } from './rewardsQuests.js';
import { buildAchievements } from './rewardsAchievements.js';
import { buildDive } from './diveUi.js'; // [HOOK-2]
import { buildContracts } from './contractsUi.js'; // [HOOK-2]
import * as hook2Dive from '../../meta/dive.js'; // [HOOK-2]
import * as hook2Contracts from '../../meta/contracts.js'; // [HOOK-2]
import '../styles/rewards.css';
import { titleWithTip, helpTip } from '../components/helpTip.js';
import '../styles/hook2.css'; // [HOOK-2] Mastery, Contracts, Daily Dive

let scope = null;

registerScreen('rewards', {
  mount(el) {
    scope = createScope();
    const meta = api.meta;
    const bar = topbar({ settings: () => go('settings') }, scope);
    const parts = [];
    const refreshBadge = () => {
      let can = false;
      try { can = !!meta.daily.state().canClaim; } catch (e) { /* no dot */ }
      try { const d = hook2Dive.state(); can = can || d.canPlay || d.chest.state === 'ready' || hook2Contracts.unclaimed() > 0; } catch (e) { /* no dot */ } // [HOOK-2]
      setBadge('rewards', can);
    };
    const ctx = { meta, toast, scope, onChange: () => { refreshBadge(); parts.forEach((p) => p.update()); } };
    const daily = buildDaily(ctx);
    const quests = buildQuests(ctx);
    const achs = buildAchievements(ctx);
    const dive = buildDive(ctx); // [HOOK-2]
    const contracts = buildContracts(ctx); // [HOOK-2]
    parts.push(dive, daily, contracts, quests, achs);

    const more = h('div', { class: 'rw-more' },
      button({ label: 'How to play', onPress: () => go('guide') }, scope),
      button({ label: 'Settings', onPress: () => go('settings') }, scope));

    const screen = h('section', { class: 'screen screen-rewards no-pad' },
      bar,
      h('div', { class: 'rw-body' },
        h('div', { class: 'row rw-tips' }, h('h1', { class: 'rw-title', text: 'Rewards' }), helpTip('daily', { scope }), titleWithTip('Goals', 'goals', scope)),
        dive.el, daily.el, contracts.el, quests.el, achs.el, more));
    el.append(screen);

    scope.sub(bus, 'dive:done', () => { parts.forEach((p) => p.update()); refreshBadge(); }); // [HOOK-2]
    scope.sub(bus, 'meta:changed', () => { parts.forEach((p) => p.update()); refreshBadge(); });
    scope.sub(bus, 'achievement:unlocked', () => achs.update());
    // Keeps the countdown fresh and notices a new day.
    scope.interval(() => { parts.forEach((p) => p.update()); refreshBadge(); }, 30000);
    refreshBadge();
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
