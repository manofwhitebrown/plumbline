import { h } from '../dom.js';

// Tap to read: shows a small note under the element, tap again or wait to hide it.
export function attachTip(el, text, scope) {
  let tip = null;
  const hide = () => { if (tip) { tip.remove(); tip = null; } };
  const show = () => {
    hide();
    tip = h('div', { class: 'tip', role: 'tooltip', text });
    el.parentElement && el.parentElement.append(tip);
    if (scope) scope.timeout(hide, 3000); else setTimeout(hide, 3000);
  };
  const onTap = () => (tip ? hide() : show());
  if (scope) scope.on(el, 'click', onTap); else el.addEventListener('click', onTap);
  return hide;
}
