// CSS-only celebration helpers. No confetti, no canvas.
export function popIn(el) {
  if (!el || !el.classList) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

export function glowIn(el) {
  if (!el || !el.classList) return;
  el.classList.remove('glow-in');
  void el.offsetWidth;
  el.classList.add('glow-in');
}
