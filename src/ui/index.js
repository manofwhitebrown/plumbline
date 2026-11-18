// Mounts the app into #app.
import * as shell from './shell.js';

export function mountApp(el) {
  shell.init(el);
  return shell;
}

export { shell };
