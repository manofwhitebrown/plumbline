// Stub for the "settings" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('settings', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-settings"></section>';
  },
  unmount() {
    host = null;
  },
});
