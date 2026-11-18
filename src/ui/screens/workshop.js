// Stub for the "workshop" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('workshop', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-workshop"></section>';
  },
  unmount() {
    host = null;
  },
});
