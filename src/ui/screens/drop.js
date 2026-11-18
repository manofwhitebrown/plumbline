// Stub for the "drop" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('drop', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-drop"></section>';
  },
  unmount() {
    host = null;
  },
});
