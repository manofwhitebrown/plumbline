// The pause menu: Resume, Haul Up now, Quit. Quit asks first and says the gold is lost.
import { h } from '../dom.js';
import { button } from '../components/button.js';

// cb: { onResume(), onHaul(), onQuit() }
export function createPauseMenu(cb, scope) {
  let open = false, confirming = false;
  const title = h('h2', { class: 'title pause-title', text: 'Paused' });
  const text = h('p', { class: 'sub pause-text' });
  const safe = (fn) => () => { try { fn(); } catch (e) { /* never throw into the game */ } };

  const resume = button({ label: 'Resume', kind: 'primary', big: true, onPress: safe(() => cb.onResume()) }, scope);
  const haul = button({ label: 'Haul Up now', kind: 'secondary', onPress: safe(() => cb.onHaul()) }, scope);
  const quit = button({ label: 'Quit', kind: 'ghost', onPress: () => show(true) }, scope);
  const keep = button({ label: 'Keep playing', kind: 'primary', big: true, onPress: () => show(false) }, scope);
  const sure = button({ label: 'Quit and lose the Gold', kind: 'danger', onPress: safe(() => cb.onQuit()) }, scope);

  const card = h('div', { class: 'pause-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Paused' }, title, text, resume, haul, quit, keep, sure);
  const el = h('div', { class: 'pause-scrim', hidden: true }, card);

  function show(confirm) {
    confirming = !!confirm;
    title.textContent = confirming ? 'Quit this drop?' : 'Paused';
    text.textContent = confirming ? 'The Gold from this drop is lost.' : '';
    text.hidden = !confirming;
    for (const b of [resume, haul, quit]) b.hidden = confirming;
    for (const b of [keep, sure]) b.hidden = !confirming;
    try { (confirming ? keep : resume).focus(); } catch (e) { /* ignore */ }
  }
  show(false);

  return {
    el,
    isOpen: () => open,
    open() {
      if (open) return;
      open = true;
      el.hidden = false;
      show(false);
    },
    close() {
      if (!open) return;
      open = false;
      el.hidden = true;
    },
  };
}
