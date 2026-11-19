// The audio engine core: master chain, shared reverb, voice tracking and stealing.
// Every sound starts and ends at silence with a gain ramp, so it never clicks or pops.
// A "voice" is one sound (a bell, a pad note...). It can use several oscillators but counts once.
import { warn } from './safe.js';
import { createReverb } from './reverb.js';
import { createRng } from './rng.js';

export const MAX_VOICES = 16; // sfx + music together
export const MAX_MUSIC_VOICES = 8; // music never takes more than this
const LOW_MAX_VOICES = 10;
const LOW_MAX_MUSIC = 4;
const FLOOR = 0.0001;
const CEILING = 0.96; // nothing leaves the master above this
const TYPES = ['sine', 'triangle', 'sawtooth', 'square'];

function num(v, fallback, lo, hi) {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
}

function setValue(param, v) {
  try {
    param.value = v;
  } catch (e) {
    // Some browsers or fakes refuse. Fine.
  }
}

function holdParam(p, t) {
  try {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
    else p.cancelScheduledValues(t);
  } catch (e) {
    // Fine.
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

// Low quality is chosen on phones that report little memory. Everything else starts high.
export function detectQuality() {
  try {
    const n = typeof navigator !== 'undefined' ? navigator : null;
    if (n && Number.isFinite(n.deviceMemory) && n.deviceMemory <= 2) return 'low';
  } catch (e) {
    // Ignore.
  }
  return 'high';
}

// A soft ceiling: transparent below 0.7, then bends smoothly toward CEILING.
export function softClipCurve(n = 2049) {
  const c = new Float32Array(n);
  const knee = 0.7;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (CEILING - knee) * Math.tanh((a - knee) / (CEILING - knee));
    c[i] = x < 0 ? -y : y;
  }
  return c;
}

// opts: { quality: 'low'|'high', clock: () => seconds (for offline rendering) }
export function createSynth(ctx, opts = {}) {
  const has = (name) => typeof ctx[name] === 'function';
  const clock = typeof opts.clock === 'function' ? opts.clock : null;
  let quality = opts.quality === 'low' ? 'low' : 'high';
  let maxVoices = quality === 'low' ? LOW_MAX_VOICES : MAX_VOICES;
  let maxMusic = quality === 'low' ? LOW_MAX_MUSIC : MAX_MUSIC_VOICES;
  let night = false;
  const noiseRng = createRng(777);

  const now = () => {
    const v = clock ? clock() : ctx.currentTime;
    return Number.isFinite(v) ? v : 0;
  };

  // ---- Master chain: buses -> tone shelves -> compressor -> limiter -> soft ceiling -> master ----
  const master = ctx.createGain();
  const preMaster = ctx.createGain();
  const sfxBus = ctx.createGain();
  const musicBus = ctx.createGain();
  const musicDuck = ctx.createGain();
  const revSfx = ctx.createGain(); // reverb sends follow the same volume as their bus
  const revMusic = ctx.createGain();
  const revMusicDuck = ctx.createGain();
  const body = ctx.createBiquadFilter(); // low shelf (only used by night mode)
  const air = ctx.createBiquadFilter(); // gentle high shelf
  const comp = ctx.createDynamicsCompressor();
  const limiter = ctx.createDynamicsCompressor();

  body.type = 'lowshelf';
  setValue(body.frequency, 160);
  setValue(body.gain, 0);
  air.type = 'highshelf';
  setValue(air.frequency, 7000);
  setValue(air.gain, -1.5);
  setValue(comp.threshold, -20);
  setValue(comp.knee, 12);
  setValue(comp.ratio, 3);
  setValue(comp.attack, 0.012);
  setValue(comp.release, 0.25);
  setValue(limiter.threshold, -4);
  setValue(limiter.knee, 0);
  setValue(limiter.ratio, 20);
  setValue(limiter.attack, 0.002);
  setValue(limiter.release, 0.1);

  sfxBus.connect(preMaster);
  musicBus.connect(musicDuck);
  musicDuck.connect(preMaster);
  preMaster.connect(body);
  body.connect(air);
  air.connect(comp);
  comp.connect(limiter);
  let tail = limiter;
  if (has('createWaveShaper')) {
    try {
      const shaper = ctx.createWaveShaper();
      shaper.curve = softClipCurve();
      try {
        shaper.oversample = '2x';
      } catch (e) {
        // Optional.
      }
      limiter.connect(shaper);
      tail = shaper;
    } catch (e) {
      warn('no soft clip', e);
    }
  }
  tail.connect(master);
  master.connect(ctx.destination);
  revSfx.connect(preMaster); // replaced by the reverb input when the reverb exists
  revMusic.connect(revMusicDuck);

  let analyser = null;
  if (has('createAnalyser')) {
    try {
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      master.connect(analyser);
    } catch (e) {
      analyser = null;
    }
  }

  let reverb = null;
  function rv() {
    if (!reverb && quality !== 'low') {
      reverb = createReverb(ctx, preMaster, { enabled: true, now });
      if (reverb.input) {
        try {
          revSfx.disconnect();
        } catch (e) {
          // Fine.
        }
        revSfx.connect(reverb.input);
        revMusicDuck.connect(reverb.input);
      }
    }
    return reverb && reverb.input && quality !== 'low' ? reverb : null;
  }

  const sfxVoices = [];
  const musicVoices = [];
  let noiseBuf = null;
  let spawned = 0;

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

  // ---- Small building blocks used by the voice library ----
  function osc(type, f, t, cents) {
    const o = ctx.createOscillator();
    o.type = TYPES.indexOf(type) >= 0 ? type : 'sine';
    o.frequency.setValueAtTime(num(f, 440, 10, 20000), t);
    if (cents) o.detune.setValueAtTime(num(cents, 0, -2400, 2400), t);
    return o;
  }

  function noiseSource() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer();
    s.loop = true;
    s._offset = 0.01 + noiseRng.next() * 0.8; // different start point each time
    return s;
  }

  function filter(type, f0, f1, q, t, dur) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(num(f0, 2000, 30, 20000), t);
    if (f1 && dur) f.frequency.exponentialRampToValueAtTime(num(f1, f0, 30, 20000), t + dur);
    if (q) setValue(f.Q, num(q, 1, 0.1, 30));
    return f;
  }

  function gainNode(v) {
    const g = ctx.createGain();
    setValue(g.gain, v);
    return g;
  }

  // A stereo position node, or a plain pass-through when the browser has none.
  function panner(x, t) {
    if (!has('createStereoPanner')) return gainNode(1);
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(num(x, 0, -1, 1), t);
    return p;
  }

  // Slow wobble: returns the lfo oscillator wired to `param` (depth in the param's own units).
  function lfo(param, rate, depth, t, type = 'sine') {
    const o = osc(type, rate, t);
    const g = gainNode(depth);
    o.connect(g);
    g.connect(param);
    return o;
  }

  // ---- Voice tracking ----
  function steal(v, fade) {
    try {
      const t = now();
      holdParam(v.g.gain, t);
      v.g.gain.setTargetAtTime(0, t, fade || 0.012);
      const stopT = t + (fade ? fade * 6 : 0.08);
      for (const s of v.srcs) {
        try {
          s.stop(stopT);
        } catch (e) {
          // Not started yet or already stopped.
        }
      }
    } catch (e) {
      // Already gone.
    }
  }

  function enforce() {
    while (musicVoices.length > maxMusic) steal(musicVoices.shift(), 0.06);
    while (sfxVoices.length + musicVoices.length > maxVoices) {
      if (sfxVoices.length) steal(sfxVoices.shift(), 0.015);
      else steal(musicVoices.shift(), 0.06);
    }
  }

  function untrack(list, v) {
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
  }

  function release(v) {
    for (const n of v.nodes) {
      try {
        n.disconnect();
      } catch (e) {
        // Already gone.
      }
    }
    untrack(v.music ? musicVoices : sfxVoices, v);
  }

  // The one place a voice is made.
  // o: vol, dur, attack, hold (seconds at full level), delay or at (absolute time), music, bus, sendBus,
  //    pan, panTo, send (reverb 0..1), key + maxKey (limit how many of this kind can play at once)
  // build(t, g, dur) wires sources into g and returns an array of sources.
  function spawn(o, build) {
    try {
      if (!o || typeof build !== 'function') return null;
      const vol = num(o.vol, 0.2, 0, 1);
      if (vol <= FLOOR * 2) return null;
      const dur = num(o.dur, 0.3, 0.04, 60);
      const attack = Math.min(num(o.attack, 0.006, 0.003, 20), dur * 0.5);
      const hold = Math.min(num(o.hold, 0, 0, 60), Math.max(0, dur - attack - 0.03));
      const wanted = Number.isFinite(o.at) ? o.at : now() + num(o.delay, 0, 0, 30);
      const t = Math.max(wanted, now() + 0.005); // never in the past
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      if (hold > 0) g.gain.setValueAtTime(vol, t + attack + hold);
      g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.02);

      const nodes = [g];
      let tap = g;
      const wantPan = Number.isFinite(o.pan) && (o.pan !== 0 || Number.isFinite(o.panTo));
      if (wantPan && has('createStereoPanner')) {
        const p = ctx.createStereoPanner();
        p.pan.setValueAtTime(num(o.pan, 0, -1, 1), t);
        if (Number.isFinite(o.panTo)) p.pan.linearRampToValueAtTime(num(o.panTo, 0, -1, 1), t + dur * 0.8);
        g.connect(p);
        nodes.push(p);
        tap = p;
      }
      tap.connect(o.bus || (o.music ? musicBus : sfxBus));
      const send = num(o.send, 0, 0, 1);
      if (send > 0 && rv()) {
        const sg = ctx.createGain();
        sg.gain.value = send;
        tap.connect(sg);
        sg.connect(o.sendBus || (o.music ? revMusic : revSfx));
        nodes.push(sg);
      }

      const srcs = build(t, g, dur) || [];
      const v = { g, srcs, nodes, music: !!o.music, keyId: o.key || null, t0: t };
      let alive = srcs.length;
      const stopT = t + dur + 0.04;
      for (const s of srcs) {
        s.onended = () => {
          alive -= 1;
          if (alive <= 0) release(v);
        };
        if (s._offset && s.buffer && s.loop) s.start(t, s._offset);
        else s.start(t);
        s.stop(stopT);
      }
      if (!srcs.length) {
        release(v);
        return null;
      }
      (v.music ? musicVoices : sfxVoices).push(v);
      spawned++;
      enforceKeyed(v, o);
      return v;
    } catch (e) {
      warn('spawn failed', e);
      return null;
    }
  }

  function enforceKeyed(v, o) {
    if (v.keyId) {
      const max = Math.max(1, Math.floor(num(o.maxKey, 99, 1, 99)));
      const same = sfxVoices.concat(musicVoices).filter((x) => x.keyId === v.keyId);
      while (same.length > max) {
        const old = same.shift();
        steal(old, old.music ? 0.06 : 0.015);
        untrack(sfxVoices, old);
        untrack(musicVoices, old);
      }
    }
    enforce();
  }

  // ---- Simple voices (kept for older callers) ----
  // o: freq, type, vol, dur, attack, delay, slideTo, detune, lp, music, bus, pan
  function tone(o) {
    if (!o) return null;
    const f = num(o.freq, 440, 20, 18000);
    return spawn(o, (t, g, dur) => {
      const s = osc(o.type, f, t, o.detune);
      if (o.slideTo) s.frequency.exponentialRampToValueAtTime(num(o.slideTo, f, 20, 18000), t + dur);
      if (o.lp) {
        const lp = filter('lowpass', o.lp, 0, 0, t, dur);
        s.connect(lp);
        lp.connect(g);
      } else s.connect(g);
      return [s];
    });
  }

  // A burst of filtered noise. o: filter, freq, freqTo, q, vol, dur, attack, delay, music, bus, pan
  function noise(o) {
    if (!o) return null;
    return spawn(o, (t, g, dur) => {
      const s = noiseSource();
      const type = o.filter === 'bandpass' || o.filter === 'highpass' ? o.filter : 'lowpass';
      const f = filter(type, o.freq, o.freqTo, o.q, t, dur);
      s.connect(f);
      f.connect(g);
      return [s];
    });
  }

  // Lower the music for a moment so a big effect stands out (sidechain-style).
  function duck(depth, holdSec, releaseSec) {
    try {
      const t = now();
      const d = num(depth, 0.5, 0.02, 1);
      const hold = num(holdSec, 0.3, 0, 8);
      const rel = num(releaseSec, 0.9, 0.1, 8);
      for (const p of [musicDuck.gain, revMusicDuck.gain]) {
        holdParam(p, t);
        p.setTargetAtTime(d, t, 0.03);
        p.setTargetAtTime(1, t + hold, rel / 3);
      }
    } catch (e) {
      // Ducking is optional.
    }
  }

  function setLevels(l) {
    try {
      const t = now();
      const sfx = num(l && l.sfx, 0.5, 0, 2);
      const music = num(l && l.music, 0.5, 0, 2);
      const m = num(l && l.master, 1, 0, 1);
      sfxBus.gain.setTargetAtTime(sfx, t, 0.02);
      revSfx.gain.setTargetAtTime(sfx, t, 0.02);
      musicBus.gain.setTargetAtTime(music, t, 0.05);
      revMusic.gain.setTargetAtTime(music, t, 0.05);
      master.gain.setTargetAtTime(m, t, 0.02);
    } catch (e) {
      warn('levels failed', e);
    }
  }

  // Night mode: less dynamic range, softer highs and lows, a little quieter.
  function setNightMode(flag) {
    try {
      night = !!flag;
      const t = now();
      comp.threshold.setTargetAtTime(night ? -30 : -20, t, 0.1);
      comp.ratio.setTargetAtTime(night ? 7 : 3, t, 0.1);
      limiter.threshold.setTargetAtTime(night ? -8 : -4, t, 0.1);
      air.gain.setTargetAtTime(night ? -7 : -1.5, t, 0.1);
      air.frequency.setTargetAtTime(night ? 3500 : 7000, t, 0.1);
      body.gain.setTargetAtTime(night ? -4 : 0, t, 0.1);
      preMaster.gain.setTargetAtTime(night ? 0.75 : 1, t, 0.1);
    } catch (e) {
      warn('night mode failed', e);
    }
  }

  function setQuality(q) {
    quality = q === 'low' ? 'low' : 'high';
    maxVoices = quality === 'low' ? LOW_MAX_VOICES : MAX_VOICES;
    maxMusic = quality === 'low' ? LOW_MAX_MUSIC : MAX_MUSIC_VOICES;
    if (quality === 'low' && reverb) reverb.setEnabled(false);
    else if (reverb) reverb.setEnabled(true);
    enforce();
  }

  // Which room the reverb uses, and how deep we are (0 to 1) so deeper means wetter.
  function setSpace(id, depth01) {
    try {
      const r = rv();
      if (!r) return;
      if (typeof id === 'string') r.setSpace(id);
      if (depth01 !== undefined) r.setDepth(depth01);
    } catch (e) {
      warn('space failed', e);
    }
  }

  return {
    ctx,
    now,
    spawn,
    tone,
    noise,
    duck,
    osc,
    noiseSource,
    filter,
    gainNode,
    panner,
    lfo,
    noiseBuffer,
    setLevels,
    setNightMode,
    setQuality,
    setSpace,
    quality: () => quality,
    isNight: () => night,
    isLow: () => quality === 'low',
    reverbAvailable: () => !!rv(),
    analyser: () => analyser,
    buses: { master, sfx: sfxBus, music: musicBus, duck: musicDuck, comp, limiter, revSfx, revMusic },
    voiceCount: () => sfxVoices.length + musicVoices.length,
    sfxVoiceCount: () => sfxVoices.length,
    musicVoiceCount: () => musicVoices.length,
    limits: () => ({ maxVoices, maxMusic }),
    spawnedCount: () => spawned,
  };
}
