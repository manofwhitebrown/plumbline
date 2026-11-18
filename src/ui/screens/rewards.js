// Stub for the "rewards" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('rewards', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-rewards"></section>';
  },
  unmount() {
    host = null;
  },
});
