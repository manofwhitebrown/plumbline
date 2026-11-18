// Settings controls (switch, slider, choice buttons) and the Sound card.
// Every change goes to the 'settings' slice at once and the sound system is told straight away.
import { h } from '../dom.js';
import { getSettings, setSetting, onSettings } from '../settings.js';
import { audioCall, buzz, ui } from '../soft.js';

// 0..1 to a whole percent, and back. Bad input never gives NaN.
export function toPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(1, Math.max(0, n)) * 100);
}
export function fromPercent(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n))) / 100;
}

// Tell the sound system what the settings say.
export function applyAudio(s) {
  const src = s && typeof s === 'object' ? s : getSettings();
  audioCall('mute', !src.sound);
  audioCall('setVolumes', { sfx: src.sfx, music: src.music });
}

// A row you can tap to flip. The whole row is the button (44 px or taller).
export function switchRow(opts, scope) {
  const o = opts || {};
  const text = h('span', { class: 'set-text' }, h('span', { class: 'set-label', text: o.label || '' }), o.sub ? h('span', { class: 'sub', text: o.sub }) : null);
  const word = h('span', { class: 'sw-word', 'aria-hidden': 'true' });
  const el = h('button', { type: 'button', class: 'set-row switch-row', role: 'switch', 'aria-checked': 'false' }, text, word, h('span', { class: 'sw', 'aria-hidden': 'true' }));
  function paint(on) {
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    word.textContent = on ? 'On' : 'Off';
  }
  el.setOn = paint;
  paint(!!o.checked);
  const press = () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    paint(next);
    buzz('tap'); ui('tap');
    try { if (typeof o.onChange === 'function') o.onChange(next); } catch (e) { /* a control must never throw */ }
  };
  if (scope) scope.on(el, 'click', press); else el.addEventListener('click', press);
  return el;
}

// A 0..100 slider. onInput gets 0..1 while dragging. onCommit runs when the finger lifts.
export function sliderRow(opts, scope) {
  const o = opts || {};
  const val = h('span', { class: 'num set-val' });
  const input = h('input', { type: 'range', class: 'range', min: '0', max: '100', step: '5', 'aria-label': o.label || 'Level' });
  const el = h('div', { class: 'set-row slider-row' },
    h('div', { class: 'set-line' }, h('span', { class: 'set-label', text: o.label || '' }), val), input);
  function paint(v) {
    const p = toPercent(v);
    input.value = String(p);
    val.textContent = p + '%';
    input.setAttribute('aria-valuetext', p + ' percent');
  }
  el.setValue = paint;
  paint(o.value);
  const onIn = () => {
    const v = fromPercent(input.value);
    val.textContent = toPercent(v) + '%';
    try { if (typeof o.onInput === 'function') o.onInput(v); } catch (e) { /* ignore */ }
  };
  const onEnd = () => { ui('tap'); try { if (typeof o.onCommit === 'function') o.onCommit(fromPercent(input.value)); } catch (e) { /* ignore */ } };
  if (scope) { scope.on(input, 'input', onIn); scope.on(input, 'change', onEnd); }
  else { input.addEventListener('input', onIn); input.addEventListener('change', onEnd); }
  return el;
}

// A row of choices where one is picked. options: [{ id, label }]
export function choiceRow(opts, scope) {
  const o = opts || {};
  const list = Array.isArray(o.options) ? o.options : [];
  const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': o.label || 'Choice' });
  const buttons = new Map();
  function paint(id) {
    for (const [k, b] of buttons) b.setAttribute('aria-checked', k === id ? 'true' : 'false');
  }
  for (const opt of list) {
    const b = h('button', { type: 'button', class: 'seg-btn', role: 'radio', 'aria-checked': 'false', text: opt.label });
    const press = () => {
      paint(opt.id);
      buzz('tap'); ui('tap');
      try { if (typeof o.onChange === 'function') o.onChange(opt.id); } catch (e) { /* ignore */ }
    };
    if (scope) scope.on(b, 'click', press); else b.addEventListener('click', press);
    buttons.set(opt.id, b);
    group.append(b);
  }
  paint(o.value);
  const el = h('div', { class: 'set-row choice-row' }, h('span', { class: 'set-label', text: o.label || '' }), group);
  if (o.sub) el.append(h('span', { class: 'sub', text: o.sub }));
  el.setValue = paint;
  return el;
}

// The Sound card: mute, two sliders, haptics.
export function soundSection(scope) {
  const s = getSettings();
  const mute = switchRow({ label: 'Mute all sound', checked: !s.sound, onChange: (on) => { setSetting('sound', !on); applyAudio(); } }, scope);
  const sfx = sliderRow({ label: 'Sound volume', value: s.sfx, onInput: (v) => { setSetting('sfx', v); applyAudio(); } }, scope);
  const music = sliderRow({ label: 'Music volume', value: s.music, onInput: (v) => { setSetting('music', v); applyAudio(); } }, scope);
  const hap = switchRow({ label: 'Haptics', sub: 'Small buzzes when you tap and collect.', checked: s.haptics, onChange: (on) => setSetting('haptics', on) }, scope);
  const card = h('section', { class: 'card set-card', 'aria-label': 'Sound' }, h('h2', { class: 'title', text: 'Sound' }), mute, sfx, music, hap);
  // Stay in step when something else changes a setting (for example an imported save).
  if (scope) {
    scope.add(onSettings((d) => {
      mute.setOn(!d.sound); sfx.setValue(d.sfx); music.setValue(d.music); hap.setOn(d.haptics);
    }));
  }
  return card;
}
