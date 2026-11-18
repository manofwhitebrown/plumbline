// Tutorial entry point (CONTRACT section 11). First version keeps state in memory only.
import { STEPS } from './steps.js';

const state = { active: false, step: 0 };

export const tutorial = {
  start() {
    state.active = true;
    state.step = 0;
  },
  isActive() {
    return state.active;
  },
  skip() {
    state.active = false;
  },
  _debug() {
    return { active: state.active, step: state.step, total: STEPS.length };
  },
};

export default tutorial;
