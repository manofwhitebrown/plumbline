// Sound effects. First version: the list of names. Real sounds come next.

export const UI_SOUNDS = ['tap', 'buy', 'deny', 'open', 'close', 'claim'];

export function isUiSound(name) {
  return UI_SOUNDS.indexOf(name) !== -1;
}
