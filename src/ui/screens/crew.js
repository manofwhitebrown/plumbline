// Stub for the "crew" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('crew', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-crew"></section>';
  },
  unmount() {
    host = null;
  },
});
