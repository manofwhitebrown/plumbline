// Builds the page frame: backdrop, centered column, screen host, tab bar, overlay layer.
// Also wires the keyboard and the back button.
import * as shell from './shell.js';
import { h, createScope } from './dom.js';
import { tabbar } from './components/tabbar.js';
import { applySettings, onSettings, initSettings, getSettings } from './settings.js';
import { bus, log, audioCall } from './soft.js';
import { startDrop, goTab, wireRunEnd } from './flow.js';

export function buildChrome(appEl) {
  const scope = createScope();
  appEl.textContent = '';
  const dust = h('div', { class: 'backdrop', 'aria-hidden': 'true' });
  for (let i = 0; i < 14; i++) dust.append(h('i', { style: 'left:' + ((i * 37) % 100) + '%;animation-delay:-' + ((i * 5) % 20) + 's' }));
  const host = h('main', { class: 'screen-host' });
  const layer = h('div', { class: 'layer' });
  const tabs = tabbar((id) => goTab(id), scope);
  const app = h('div', { class: 'app' }, host, tabs, layer);
  appEl.append(dust, app);

  initSettings();
  applySettings(appEl);
  scope.add(onSettings(() => { applySettings(appEl); applySound(); }));
  function applySound() {
    const s = getSettings();
    audioCall('mute', !s.sound);
    audioCall('setVolumes', { sfx: s.sfx, music: s.music });
  }
  applySound();

  shell.init(host);
  shell.attachChrome({ layer, tabbar: tabs });

  // First touch unlocks sound (browsers need a tap before audio can play).
  const unlock = () => { audioCall('init'); };
  scope.on(window, 'pointerdown', unlock, { once: true });

  // Keyboard on laptops: Space = Drop, R = Rig, Escape = back.
  scope.on(window, 'keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const id = shell.currentId();
    if (e.key === 'Escape') {
      if (shell.hasOverlay()) return; // the overlay handles its own Escape
      e.preventDefault();
      shell.back();
    } else if (e.key === ' ' || e.code === 'Space') {
      if (id === 'home' && !shell.hasOverlay()) { e.preventDefault(); startDrop(); }
    } else if ((e.key === 'r' || e.key === 'R') && id !== 'drop' && id !== 'results') {
      if (!shell.hasOverlay()) goTab('rig');
    }
  });

  // Browser back and the Android back button: one history step per screen.
  try {
    history.replaceState({ plumb: 1 }, '');
    history.pushState({ plumb: 2 }, '');
    scope.on(window, 'popstate', () => {
      history.pushState({ plumb: 2 }, ''); // keep one step ahead so the app is never left by accident
      if (shell.hasOverlay()) return;
      shell.back();
    });
  } catch (e) { log.warn('history not available'); }

  // A drop ended: show the results from anywhere.
  scope.add(wireRunEnd(bus));
  return { host, layer, tabs, dispose: () => scope.dispose() };
}
