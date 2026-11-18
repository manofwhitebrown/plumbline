// Stub for the "rig" screen. The real screen replaces this.
import { registerScreen } from '../shell.js';

let host = null;

registerScreen('rig', {
  mount(el) {
    host = el;
    if (host && 'innerHTML' in host) host.innerHTML = '<section class="screen screen-rig"></section>';
  },
  unmount() {
    host = null;
  },
});
