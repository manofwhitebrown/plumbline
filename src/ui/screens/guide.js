// Stub for the "guide" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('guide', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-guide"></section>';
  },
  unmount() {
    host = null;
  },
});
