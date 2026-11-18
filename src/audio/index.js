// Audio entry point (CONTRACT section 11). Every call is safe: bad input is ignored.
import { setMuted, setLevels, getState } from './mixer.js';
import { setBiome as setMusicBiome } from './music.js';
import { isUiSound } from './sfx.js';

let ready = false;
let strain01 = 0;

export const audio = {
  // Call on the first tap or key press.
  init() {
    ready = true;
    return ready;
  },
  onEvents(events, view) {
    if (!Array.isArray(events) || !ready) return;
    void view;
  },
  setBiome(id) {
    setMusicBiome(id);
  },
  setStrain(value01) {
    strain01 = Number.isFinite(value01) ? Math.min(1, Math.max(0, value01)) : 0;
  },
  ui(name) {
    if (!ready || !isUiSound(name)) return;
  },
  mute(flag) {
    setMuted(flag);
  },
  setVolumes(v) {
    setLevels(v);
  },
  // Used by tests.
  _debug() {
    return { ready, strain01, ...getState() };
  },
};

export default audio;
