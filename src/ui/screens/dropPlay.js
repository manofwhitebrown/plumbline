// Glues the active-play pieces onto the Drop screen without touching the drop controller:
// it listens to the same bus events, shows banners and the guardian bar, opens the boon picker and presses skills.
import '../styles/dropPlay.css';
import { h } from '../dom.js';
import { bannerFor, guardianFrac, SKILL_ORDER } from '../logic/playModel.js';
import { createBoonPicker } from './boonPick.js';
import { createAbilityButtons } from './dropAbilities.js';
import { getSettings } from '../settings.js';

// d: { bus, session }. Returns nodes to add to the screen. Everything is wrapped so nothing can throw into the game.
export function createPlayUi(d, scope) {
  const bus = d.bus, session = d.session;
  const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };
  const picker = createBoonPicker({ onPick: (id) => safe(() => session.chooseBoon(id)) }, scope);
  const skills = createAbilityButtons({ onUse: (id) => safe(() => session.useSkill(id)) }, scope);
  const text = h('span', { class: 'pb-text' });
  const banner = h('div', { class: 'pb', 'data-kind': 'info', role: 'status', 'aria-live': 'polite', hidden: true }, text);
  const gFill = h('i', { class: 'pg-fill' });
  const gName = h('span', { class: 'pg-name ellipsis' });
  const guardian = h('div', { class: 'pg', hidden: true, role: 'meter', 'aria-label': 'Guardian health', 'aria-valuemin': '0', 'aria-valuemax': '100' }, gName, h('span', { class: 'pg-bar' }, gFill));
  let hideAt = 0, lastG = -1, gShown = false;

  function say(b) {
    if (!b) return;
    text.textContent = b.text; banner.setAttribute('data-kind', b.kind); banner.hidden = false;
    clearTimeout(hideAt); hideAt = setTimeout(() => { banner.hidden = true; }, getSettings().reduceMotion ? b.ms + 600 : b.ms);
  }

  function onEvents(p) {
    if (!p) return;
    const events = Array.isArray(p.events) ? p.events : [];
    for (const e of events) {
      if (e && e.t === 'BOON_OFFER') picker.show(e);
      else say(bannerFor(e));
    }
    const play = p.view && p.view.play;
    skills.update(play ? play.skills : []);
    const g = play && play.guardian && play.guardian.on ? play.guardian : null;
    if (g) {
      const f = Math.round(guardianFrac(g) * 100);
      if (!gShown) { gShown = true; guardian.hidden = false; gName.textContent = g.name; }
      if (f !== lastG) { lastG = f; gFill.style.transform = 'scaleX(' + (f / 100).toFixed(3) + ')'; guardian.setAttribute('aria-valuenow', String(f)); }
    } else if (gShown) { gShown = false; lastG = -1; guardian.hidden = true; }
  }
  function reset() { picker.close(); banner.hidden = true; guardian.hidden = true; gShown = false; lastG = -1; skills.update([]); }

  scope.sub(bus, 'run:events', onEvents);
  scope.sub(bus, 'run:started', (p) => { reset(); const play = p && p.view && p.view.play; skills.update(play ? play.skills : []); });
  scope.sub(bus, 'run:ended', reset);
  scope.sub(bus, 'run:aborted', reset);
  scope.add(() => clearTimeout(hideAt));

  // Keys 1, 2, 3: skills (or the cards while the picker is open). Ignored in text fields and with modifier keys.
  scope.on(window, 'keydown', (e) => {
    if (!e || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const i = '123'.indexOf(e.key);
    if (i < 0) return;
    if (picker.isOpen()) { if (picker.pickIndex(i)) e.preventDefault(); return; }
    if (SKILL_ORDER[i]) { skills.use(SKILL_ORDER[i]); }
  });

  // stack: the banner and the guardian bar. The Drop screen puts them (and the chase pills) in one column under the goals.
  return { nodes: [banner, guardian, ...skills.nodes, picker.el], stack: [banner, guardian], picker, skills };
}
