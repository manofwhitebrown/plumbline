// motion/index.js: installs MOTION-1 pieces into the UI. Importing this file is the only wiring needed.
import * as shell from '../shell.js';
import { getSettings } from '../settings.js';
import { createTransitions } from './transitions.js';

export const transitions = createTransitions({
  isReduced: () => { try { return !!getSettings().reduceMotion; } catch (e) { return false; } },
});

shell.setMotionHook(transitions);
