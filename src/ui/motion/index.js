// motion/index.js: installs MOTION-1 pieces into the UI. Importing this file is the only wiring needed.
import * as shell from '../shell.js';
import { getSettings } from '../settings.js';
import { setRunEndHook } from '../flow.js';
import { buzz, ui } from '../soft.js';
import './motion.css';
import { createTransitions } from './transitions.js';
import { createStage } from './stage.js';

const isReduced = () => { try { return !!getSettings().reduceMotion; } catch (e) { return false; } };

export const transitions = createTransitions({ isReduced });
shell.setMotionHook(transitions);

// Cues use only sounds and buzzes that already exist (audio.ui: tap, open, close, claim; haptics: tap, snap, record).
const CUES = {
  'drop:beat0': () => { ui('tap'); buzz('tap'); }, 'drop:beat1': () => { ui('tap'); buzz('tap'); }, 'drop:beat2': () => { ui('open'); buzz('tap'); },
  'drop:fall': () => ui('open'),
  'haul:haul': () => ui('claim'),
  'snap:snap': () => buzz('snap'), 'snap:thud': () => ui('close'),
};
export const stage = createStage({ isReduced, cue: (kind, k) => { const f = CUES[kind + ':' + k]; if (f) { try { f(); } catch (e) { /* ignore */ } } } });

// Drop screen hook: delay the run start until the cinematic ends. start() is always called exactly once.
export function beforeDrop(host, start, parts) {
  const run = (() => { let n = 0; return () => { if (!n++) start(); }; })();
  let took = false;
  try { took = stage.playBlocking(host, 'drop', { onGo: run, parts }); } catch (e) { took = false; }
  if (!took) run();
}

// Run-end hook: play haul or snap, then show Results. Returns true when it took over (flow.js then waits for goFn).
export function beforeResults(payload, goFn) {
  const host = typeof document !== 'undefined' ? document.querySelector('.screen-drop') : null;
  if (!host || shell.currentId() !== 'drop') return false;
  const kind = payload && payload.outcome === 'snapped' ? 'snap' : 'haul';
  try { return stage.playBlocking(host, kind, { onGo: goFn }); } catch (e) { return false; }
}
setRunEndHook(beforeResults);
