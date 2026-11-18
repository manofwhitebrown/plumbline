// Settings: sound, display, save tools, build label and credits.
// Tapping the build label 7 times quickly opens a hidden box (see cheatPanel.js).
import { registerScreen, go, back } from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { iconHtml } from '../icons.js';
import { api } from '../api.js';
import { BUILD } from '../../core/build.js';
import { getSettings, setSetting, onSettings } from '../settings.js';
import { soundSection, switchRow, choiceRow } from './settingsAudio.js';
import { saveSection } from './settingsSave.js';
import { createTapCounter, openCheatEntry, USED_TEXT } from './cheatPanel.js';

export const CREDITS = [
  'Plumbline. Lower the bucket, then know when to Haul Up.',
  'Made by the Plumbline team, with Claude.',
  'All sound is made in code. All art is drawn in code.',
];

const QUALITY_OPTIONS = [{ id: 'auto', label: 'Auto' }, { id: 'high', label: 'High' }, { id: 'low', label: 'Low' }];

// "Plumbline v0.1 · build abc1234". Takes the build text from Vite and keeps only the short parts.
export function buildLabel(raw) {
  const t = typeof raw === 'string' ? raw : '';
  const ver = (t.match(/v(\d+\.\d+)/) || [])[1] || '0.1';
  const id = (t.match(/build\s+([A-Za-z0-9._-]+)/) || [])[1] || 'dev';
  return 'Plumbline v' + ver + ' · build ' + id;
}

function displaySection(scope) {
  const s = getSettings();
  const motion = switchRow({ label: 'Reduce motion', sub: 'Calmer screens with less moving.', checked: s.reduceMotion, onChange: (v) => setSetting('reduceMotion', v) }, scope);
  const large = switchRow({ label: 'Large text', sub: 'Makes the words bigger.', checked: s.largeText, onChange: (v) => setSetting('largeText', v) }, scope);
  const cb = switchRow({ label: 'Colorblind palette', sub: 'Easier to tell gems apart.', checked: s.colorblind, onChange: (v) => setSetting('colorblind', v) }, scope);
  const quality = choiceRow({ label: 'Quality', sub: 'Auto lowers the effects if the game runs slowly.', options: QUALITY_OPTIONS, value: s.quality, onChange: (v) => setSetting('quality', v) }, scope);
  scope.add(onSettings((d) => { motion.setOn(d.reduceMotion); large.setOn(d.largeText); cb.setOn(d.colorblind); quality.setValue(d.quality); }));
  return h('section', { class: 'card set-card', 'aria-label': 'Display' }, h('h2', { class: 'title', text: 'Display' }), motion, large, cb, quality);
}

function aboutSection(scope) {
  const taps = createTapCounter({ needed: 7, windowMs: 3000 });
  const label = buildLabel(BUILD);
  // A plain label. No sound, no buzz and no hint, so nothing gives the secret away.
  const stamp = h('button', { type: 'button', class: 'build-label', 'aria-label': label, text: label });
  scope.on(stamp, 'click', () => {
    if (taps.hit(Date.now())) { try { openCheatEntry(); } catch (e) { /* never throw into the game */ } }
  });
  return h('section', { class: 'card set-card', 'aria-label': 'About' },
    h('h2', { class: 'title', text: 'About' }),
    stamp,
    h('div', { class: 'credits stack' }, ...CREDITS.map((t) => h('p', { class: 'sub', text: t }))));
}

let scope = null;

registerScreen('settings', {
  mount(el) {
    scope = createScope();
    const backBtn = h('button', { type: 'button', class: 'btn ghost iconbtn', 'aria-label': 'Back' }, svg(iconHtml('back')));
    scope.on(backBtn, 'click', () => { if (!back()) go('home'); });
    const used = h('div', { class: 'cheat-banner used', role: 'status', text: USED_TEXT });
    let wasUsed = false;
    try { wasUsed = !!(api.cheats && api.cheats.wasUsed && api.cheats.wasUsed()); } catch (e) { /* hide */ }
    used.hidden = !wasUsed;
    const screen = h('section', { class: 'screen screen-settings' },
      h('header', { class: 'set-head' }, backBtn, h('h1', { class: 'title', text: 'Settings' })),
      used,
      soundSection(scope), displaySection(scope), saveSection(scope), aboutSection(scope));
    el.append(screen);
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
