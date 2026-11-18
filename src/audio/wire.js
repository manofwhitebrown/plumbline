// One call connects audio to the game. main.js only needs:
//   wireAudio();  initOnFirstGesture();
import { bus as defaultBus } from '../core/bus.js';
import { audio } from './index.js';

let offs = [];

// Listen to the game events and play the matching sounds. Safe to call twice.
export function wireAudio(bus = defaultBus) {
  unwireAudio();
  offs = [
    bus.on('run:started', (p) => {
      const view = p && p.view ? p.view : null;
      if (view && view.biomeId) audio.setBiome(view.biomeId);
      audio.onEvents([{ t: 'RUN_START' }], view);
    }),
    bus.on('run:events', (p) => {
      if (p) audio.onEvents(p.events, p.view);
    }),
    bus.on('run:ended', () => {
      audio.setStrain(0);
      audio.setScreen('results');
    }),
    bus.on('achievement:unlocked', () => audio.ui('achievement')),
    bus.on('codex:new', () => audio.ui('claim')),
  ];
  return unwireAudio;
}

export function unwireAudio() {
  for (const off of offs) {
    try {
      off();
    } catch (e) {
      // Ignore.
    }
  }
  offs = [];
}

// Browsers only allow sound after a tap or key press. Unlock on the first one.
export function initOnFirstGesture(target = typeof document !== 'undefined' ? document : null) {
  if (!target || !target.addEventListener) return () => {};
  const names = ['pointerdown', 'touchend', 'keydown', 'click'];
  const done = () => {
    audio.init();
    for (const n of names) target.removeEventListener(n, done, true);
  };
  for (const n of names) target.addEventListener(n, done, true);
  return () => {
    for (const n of names) target.removeEventListener(n, done, true);
  };
}
