// Mounts the app into #app. main.js calls mountApp once, after the core is ready.
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
// Layout fixes from the layout gate (NEW-8). Must stay after the other styles.
import.meta.glob('./styles/fixes/*.css', { eager: true });
import { bootModules } from './boot.js';
import * as shell from './shell.js';
import { buildChrome } from './chrome.js';
import { log } from './soft.js';
import './screens/home.js';
import './screens/rig.js';
import './screens/drop.js';
import './screens/results.js';
import './screens/crew.js';
import './screens/workshop.js';
import './screens/codex.js';
import './screens/rewards.js';
import './screens/settings.js';
import './screens/guide.js';
import './motion/index.js'; // [MOTION-1] transitions hook
import './styles/polish.css'; // [AI-2] looks only
import './theme/index.js'; // [UIART-1] premium theme, loaded after polish.css so theme.css is last

let mounted = null;

export function mountApp(el, startScreen) {
  const target = el || document.getElementById('app');
  if (!target) { log.error('mountApp: no #app element'); return null; }
  if (mounted) return mounted;
  try {
    bootModules();
    mounted = buildChrome(target);
    shell.go(startScreen || 'home');
  } catch (e) {
    log.error('mountApp failed', e);
    target.textContent = 'Something went wrong. Please reload.';
  }
  return mounted;
}

export { shell };
