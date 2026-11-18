// Stub for the "results" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('results', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-results"></section>';
  },
  unmount() {
    host = null;
  },
});
