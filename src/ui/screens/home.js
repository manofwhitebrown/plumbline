// Stub for the "home" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('home', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-home"></section>';
  },
  unmount() {
    host = null;
  },
});
