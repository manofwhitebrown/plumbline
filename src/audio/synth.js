// WebAudio helpers: soft voices, noise bursts, a master limiter, and voice caps.
// Every sound starts and ends at silence with a gain ramp, so it never clicks or pops.
import { warn } from './safe.js';

export const MAX_VOICES = 16;
export const MAX_MUSIC_VOICES = 24;
const FLOOR = 0.0001;
const TYPES = ['sine', 'triangle', 'sawtooth', 'square'];

function num(v, fallback, lo, hi) {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
}

function setValue(param, v) {
  try {
    param.value = v;
  } catch (e) {
    // Some browsers refuse. Fine.
  }
}

// Returns null when WebAudio is missing. Never throws.
export function createContext() {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const Ctor = g.AudioContext || g.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch (e) {
    warn('no audio context', e);
    return null;
  }
}

export function createSynth(ctx) {
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  const sfxBus = ctx.createGain();
  const musicBus = ctx.createGain();
  const musicDuck = ctx.createGain();

  // The limiter keeps loud moments from clipping.
  setValue(limiter.threshold, -10);
  setValue(limiter.knee, 6);
  setValue(limiter.ratio, 20);
  setValue(limiter.attack, 0.003);
  setValue(limiter.release, 0.2);
  master.connect(limiter);
  limiter.connect(ctx.destination);
  sfxBus.connect(master);
  musicBus.connect(musicDuck);
  musicDuck.connect(master);

  const sfxVoices = [];
  const musicVoices = [];
  let noiseBuf = null;

  function now() {
    return Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
  }

  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const rate = ctx.sampleRate || 44100;
    const len = Math.floor(rate);
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      data[i] = s / 2147483648 - 1;
    }
    noiseBuf = buf;
    return buf;
  }

  // Fade a voice out fast. Used when there are too many voices.
  function steal(v) {
    try {
      const t = now();
      const p = v.gain.gain;
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
      else p.cancelScheduledValues(t);
      p.setTargetAtTime(0, t, 0.01);
      v.src.stop(t + 0.08);
    } catch (e) {
      // Already stopped.
    }
  }

  function track(list, cap, v) {
    list.push(v);
    while (list.length > cap) steal(list.shift());
  }

  function untrack(list, v) {
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
  }

  // Wire one source through an optional filter and an envelope, then start it.
  function finish(src, filter, o, vol, attack, dur, t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    if (filter) {
      src.connect(filter);
      filter.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(o.bus || (o.music ? musicBus : sfxBus));
    const list = o.music ? musicVoices : sfxVoices;
    const v = { src, gain: g };
    src.onended = () => {
      try {
        g.disconnect();
      } catch (e) {
        // Already gone.
      }
      untrack(list, v);
    };
    src.start(t);
    src.stop(t + dur + 0.03);
    track(list, o.music ? MAX_MUSIC_VOICES : MAX_VOICES, v);
    return v;
  }

  function makeFilter(type, f0, f1, q, t, dur) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(num(f0, 2000, 40, 20000), t);
    if (f1) f.frequency.exponentialRampToValueAtTime(num(f1, f0, 40, 20000), t + dur);
    if (q) setValue(f.Q, num(q, 1, 0.1, 20));
    return f;
  }

  // One note. o: freq, type, vol, dur, attack, delay, slideTo, detune, lp, music, bus
  function tone(o) {
    try {
      if (!o) return null;
      const vol = num(o.vol, 0.2, 0, 1);
      if (vol <= FLOOR * 2) return null;
      const dur = num(o.dur, 0.3, 0.04, 40);
      const attack = Math.min(num(o.attack, 0.006, 0.003, 10), dur * 0.5);
      const t = now() + num(o.delay, 0, 0, 10) + 0.005;
      const f = num(o.freq, 440, 20, 18000);
      const osc = ctx.createOscillator();
      osc.type = TYPES.indexOf(o.type) >= 0 ? o.type : 'sine';
      osc.frequency.setValueAtTime(f, t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(num(o.slideTo, f, 20, 18000), t + dur);
      if (o.detune) osc.detune.setValueAtTime(num(o.detune, 0, -1200, 1200), t);
      const filter = o.lp ? makeFilter('lowpass', o.lp, 0, 0, t, dur) : null;
      return finish(osc, filter, o, vol, attack, dur, t);
    } catch (e) {
      warn('tone failed', e);
      return null;
    }
  }

  // A burst of filtered noise. o: filter, freq, freqTo, q, vol, dur, attack, delay, music, bus
  function noise(o) {
    try {
      if (!o) return null;
      const vol = num(o.vol, 0.1, 0, 1);
      if (vol <= FLOOR * 2) return null;
      const dur = num(o.dur, 0.2, 0.03, 20);
      const attack = Math.min(num(o.attack, 0.008, 0.003, 10), dur * 0.5);
      const t = now() + num(o.delay, 0, 0, 10) + 0.005;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      src.loop = true;
      const type = o.filter === 'bandpass' || o.filter === 'highpass' ? o.filter : 'lowpass';
      const filter = makeFilter(type, o.freq, o.freqTo, o.q, t, dur);
      return finish(src, filter, o, vol, attack, dur, t);
    } catch (e) {
      warn('noise failed', e);
      return null;
    }
  }

  // Lower the music for a moment so a big effect stands out.
  function duck(depth, holdSec, releaseSec) {
    try {
      const t = now();
      const p = musicDuck.gain;
      p.cancelScheduledValues(t);
      p.setTargetAtTime(num(depth, 0.5, 0.1, 1), t, 0.03);
      p.setTargetAtTime(1, t + num(holdSec, 0.3, 0, 5), num(releaseSec, 0.9, 0.1, 5) / 3);
    } catch (e) {
      // Ducking is optional.
    }
  }

  return {
    ctx,
    now,
    tone,
    noise,
    duck,
    noiseBuffer,
    buses: { master, sfx: sfxBus, music: musicBus, duck: musicDuck },
    voiceCount: () => sfxVoices.length + musicVoices.length,
    sfxVoiceCount: () => sfxVoices.length,
  };
}
