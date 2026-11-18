// Buttons: primary / secondary / danger / ghost, with loading and disabled states.
import { h } from '../dom.js';
import { buzz, ui } from '../soft.js';

// opts: { label, sub, kind, big, onPress, reason, disabled, loading, icon }
export function button(opts, scope) {
  const o = opts || {};
  const el = h('button', { class: 'btn', type: 'button' });
  const state = { label: o.label || '', sub: o.sub || '', kind: o.kind || 'secondary', disabled: !!o.disabled, reason: o.reason || '', loading: !!o.loading };

  function paint() {
    el.className = 'btn' + (state.kind === 'secondary' ? '' : ' ' + state.kind) + (o.big ? ' big' : '') + (state.disabled ? ' disabled' : '') + (state.loading ? ' loading' : '');
    el.textContent = '';
    el.append(h('span', { text: state.loading ? 'Please wait…' : state.label }));
    if (state.sub && !state.loading) el.append(h('small', { text: state.sub }));
    el.setAttribute('aria-disabled', state.disabled ? 'true' : 'false');
    if (o.aria) el.setAttribute('aria-label', o.aria);
  }

  function press(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (state.loading) return;
    if (state.disabled) {
      deny(el);
      if (state.reason && typeof o.onDeny === 'function') o.onDeny(state.reason);
      return;
    }
    buzz('tap');
    ui('tap');
    try { if (typeof o.onPress === 'function') o.onPress(el); } catch (err) { /* a button must never throw into the game */ }
  }

  if (scope) scope.on(el, 'click', press); else el.addEventListener('click', press);
  el.setState = (patch) => { Object.assign(state, patch || {}); paint(); };
  el.getState = () => ({ ...state });
  paint();
  return el;
}

// A gentle shake plus a deny sound.
export function deny(el) {
  ui('deny');
  if (!el || !el.classList) return;
  el.classList.remove('shake');
  void el.offsetWidth; // restart the animation
  el.classList.add('shake');
}
