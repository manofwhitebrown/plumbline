// Collapse (prestige) confirmation. Needs a deliberate 1 second press-and-hold.
import * as shell from './shell.js';
import { h } from './dom.js';
import { holdButton } from './components/holdButton.js';
import { api } from './api.js';
import { fmt } from './soft.js';

export function openCollapse() {
  let gain = 0;
  try { gain = api.meta.collapse.preview().coreDustGain || 0; } catch (e) { /* show 0 */ }
  const body = h('div', { class: 'stack' },
    h('p', { class: 'sub', text: 'You start again with a fresh rope and a stronger crew boss.' }),
    h('div', { class: 'card stack' },
      h('p', { class: 'title', text: 'You gain +' + fmt(gain) + ' Core Dust' }),
      h('p', { class: 'sub', text: 'Each Core Dust adds a permanent bonus to Gold.' })),
    h('div', { class: 'row' },
      h('div', { class: 'card grow' }, h('p', { class: 'sub', text: 'Resets' }), h('p', { text: 'Gold, Crew, Parts' })),
      h('div', { class: 'card grow' }, h('p', { class: 'sub', text: 'Stays' }), h('p', { text: 'Core Dust, Codex, records' }))));
  const m = shell.modal({ title: 'Collapse', body, actions: [{ label: 'Not now', kind: 'secondary' }] });
  if (!m || !m.body) return m;
  const hb = holdButton({ label: 'Hold to Collapse', onDone: () => {
    try {
      const res = api.meta.collapse.do();
      if (res && res.ok === false) shell.toast('Collapse is not ready yet.', 'warn');
      else shell.toast('Collapsed! +' + fmt(gain) + ' Core Dust', 'ok');
    } catch (e) { shell.toast('Collapse could not finish.', 'error'); }
    m.close();
  } });
  m.body.append(hb);
  return m;
}
