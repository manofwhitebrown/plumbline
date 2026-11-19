// The voice library. Every voice is made from WebAudio nodes (no audio files).
// All voices take the same options: freq, vol, dur, attack, delay (or at), pan, panTo,
// send (reverb 0..1), music, bus, sendBus, key and maxKey (limit how many play at once).
import { createRng } from './rng.js';
import { warn } from './safe.js';

const clampF = (f, lo = 20, hi = 16000) => (Number.isFinite(f) ? Math.min(hi, Math.max(lo, f)) : 440);
const pick = (o, ...keys) => {
  const r = {};
  for (const k of keys) if (o[k] !== undefined) r[k] = o[k];
  return r;
};

export function createVoices(S) {
  const ctx = S.ctx;
  const rng = createRng(4242);
  const ksCache = new Map();

  const common = (o, extra) => ({
    ...pick(o, 'vol', 'attack', 'hold', 'delay', 'at', 'music', 'bus', 'sendBus', 'pan', 'panTo', 'send', 'dur'),
    ...extra,
  });

  // FM bell or glass tone: a carrier whose pitch is shaken by a modulator that fades away.
  // ratio picks the colour (2 soft, 3.5 glassy, 1.41 or 2.76 metallic), index how bright it starts.
  function bell(o = {}) {
    const f = clampF(o.freq);
    const ratio = Number.isFinite(o.ratio) ? o.ratio : 3.5;
    const index = Number.isFinite(o.index) ? Math.max(0.05, o.index) : 2;
    const end = Number.isFinite(o.modEnd) ? Math.max(0.005, o.modEnd) : 0.03;
    return S.spawn(
      common(o, { dur: o.dur ?? 0.8, attack: o.attack ?? 0.003, key: o.key ?? 'bell', maxKey: o.maxKey ?? 8 }),
      (t, g, dur) => {
        const car = S.osc('sine', f, t, o.detune);
        const mod = S.osc('sine', clampF(f * ratio, 20, 20000), t);
        const depth = f * index;
        const mg = S.gainNode(0);
        mg.gain.setValueAtTime(depth, t);
        mg.gain.exponentialRampToValueAtTime(Math.max(0.5, depth * end), t + dur * 0.7);
        mod.connect(mg);
        mg.connect(car.frequency);
        car.connect(g);
        const srcs = [car, mod];
        if (o.vib) srcs.push(S.lfo(car.detune, o.vib.rate || 5.5, o.vib.cents || 10, t));
        return srcs;
      },
    );
  }

  const glass = (o = {}) => bell({ ratio: 2.756, index: 1.3, modEnd: 0.02, ...o });

  // Karplus-Strong: a burst of noise rings round a short loop, so it sounds like a plucked string.
  function ksBuffer(N, dur, bright) {
    const rate = ctx.sampleRate || 44100;
    const key = N + ':' + Math.round(bright * 20) + ':' + Math.round(dur * 5);
    if (ksCache.has(key)) return ksCache.get(key);
    const len = Math.max(N + 2, Math.ceil(dur * rate));
    const buf = ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    const r = createRng(N * 13 + 7);
    const c = 0.2 + 0.7 * bright;
    const w = 0.5 + 0.45 * bright;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      lp += c * (r.next() * 2 - 1 - lp);
      d[i] = lp;
    }
    for (let i = N; i < len; i++) {
      const prev = i - N - 1 >= 0 ? d[i - N - 1] : d[i - N];
      d[i] = 0.997 * (w * d[i - N] + (1 - w) * prev);
    }
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
    if (ksCache.size >= 64) ksCache.delete(ksCache.keys().next().value);
    ksCache.set(key, buf);
    return buf;
  }

  function pluck(o = {}) {
    const f = clampF(o.freq, 40, 4000);
    const dur = Math.min(3, o.dur ?? 1.2);
    const rate = ctx.sampleRate || 44100;
    const N = Math.max(2, Math.round(rate / f));
    return S.spawn(common(o, { dur, attack: o.attack ?? 0.002, key: o.key ?? 'pluck', maxKey: o.maxKey ?? 8 }), (t, g) => {
      const s = ctx.createBufferSource();
      s.buffer = ksBuffer(N, dur, Number.isFinite(o.bright) ? o.bright : 0.5);
      s.loop = false;
      if (s.playbackRate) {
        s.playbackRate.setValueAtTime(f / (rate / N), t);
        if (o.bend) s.playbackRate.exponentialRampToValueAtTime(Math.max(0.1, (f / (rate / N)) * o.bend), t + dur * 0.8);
      }
      if (o.lp) {
        const lp = S.filter('lowpass', o.lp, 0, 0.7, t);
        s.connect(lp);
        lp.connect(g);
      } else s.connect(g);
      return [s];
    });
  }

  // Soft pad: detuned saws through a low-pass that slowly opens and closes, spread left and right.
  function pad(o = {}) {
    const f = clampF(o.freq, 30, 2000);
    const lpf = Math.min(2600, Math.max(260, o.lp ?? f * 4));
    const cents = o.detune ?? 9;
    const low = S.isLow();
    const width = low ? 0 : o.width ?? 0.5;
    return S.spawn(
      common(o, { dur: o.dur ?? 6, attack: o.attack ?? 2.2, key: o.key ?? 'pad', maxKey: o.maxKey ?? 6 }),
      (t, g) => {
        const srcs = [];
        const lfo = S.osc('sine', 0.06 + rng.next() * 0.12, t);
        const branches = low ? [[-cents, cents]] : [[-cents, -cents * 0.35], [cents * 0.35, cents]];
        branches.forEach((cs, b) => {
          const mix = S.gainNode(low ? 0.3 : 0.32);
          const flt = S.filter('lowpass', lpf, 0, 0.7, t);
          const pn = S.panner(branches.length > 1 ? (b ? 1 : -1) * width : 0, t);
          for (const c of cs) {
            const s = S.osc('sawtooth', f, t, c);
            s.connect(mix);
            srcs.push(s);
          }
          mix.connect(flt);
          flt.connect(pn);
          pn.connect(g);
          const lg = S.gainNode(lpf * 0.35);
          lfo.connect(lg);
          lg.connect(flt.frequency);
        });
        srcs.push(lfo);
        return srcs;
      },
    );
  }

  // Sub bass: a low sine with a faint octave above so small speakers still hear it.
  function sub(o = {}) {
    const f = clampF(o.freq, 20, 400);
    return S.spawn(common(o, { dur: o.dur ?? 0.6, attack: o.attack ?? 0.012, key: o.key ?? 'sub', maxKey: o.maxKey ?? 4 }), (t, g, dur) => {
      const a = S.osc('sine', f, t);
      if (o.slideTo) a.frequency.exponentialRampToValueAtTime(clampF(o.slideTo, 15, 400), t + dur * 0.9);
      const lp = S.filter('lowpass', o.lp ?? 260, 0, 0.5, t);
      a.connect(lp);
      const srcs = [a];
      if (!S.isLow()) {
        const b = S.osc('triangle', f * 2, t);
        const bg = S.gainNode(0.18);
        b.connect(bg);
        bg.connect(lp);
        srcs.push(b);
      }
      lp.connect(g);
      return srcs;
    });
  }

  // Short grains of dust: many tiny filtered ticks.
  function dust(o = {}) {
    const n = S.isLow() ? 3 : o.count ?? 6;
    const span = o.dur ?? 1.2;
    for (let i = 0; i < n; i++) {
      S.noise({
        filter: 'bandpass',
        freq: rng.range(2800, 9000),
        q: 6,
        dur: 0.05,
        attack: 0.003,
        vol: (o.vol ?? 0.05) * rng.range(0.4, 1),
        delay: (o.delay || 0) + rng.next() * span,
        music: o.music,
        bus: o.bus,
        sendBus: o.sendBus,
        send: o.send ?? 0.2,
        pan: rng.range(-0.7, 0.7),
        key: 'dust',
        maxKey: 6,
      });
    }
  }

  // Filtered-noise textures: kind is 'wind', 'rumble' or 'dust'.
  function texture(o = {}) {
    const kind = o.kind || 'wind';
    if (kind === 'dust') return dust(o);
    return S.spawn(common(o, { dur: o.dur ?? 5, attack: o.attack ?? 1.2, key: o.key ?? 'texture', maxKey: o.maxKey ?? 3 }), (t, g) => {
      const n = S.noiseSource();
      const srcs = [n];
      if (kind === 'rumble') {
        const lp = S.filter('lowpass', o.freq ?? 110, 0, 0.7, t);
        const am = S.gainNode(0.7);
        n.connect(lp);
        lp.connect(am);
        am.connect(g);
        const l = S.osc('sine', 0.31 + rng.next() * 0.2, t);
        const lg = S.gainNode(0.3);
        l.connect(lg);
        lg.connect(am.gain);
        srcs.push(l);
      } else {
        const bp = S.filter('bandpass', o.freq ?? 420, 0, 0.9, t);
        n.connect(bp);
        bp.connect(g);
        srcs.push(S.lfo(bp.frequency, 0.1 + rng.next() * 0.1, (o.freq ?? 420) * 0.5, t));
      }
      return srcs;
    });
  }

  // Metallic rope creak: resonant noise that is switched on and off quickly (stick and slip).
  function creak(o = {}) {
    const f = clampF(o.freq ?? rng.range(380, 640), 80, 3000);
    const glide = o.glide ?? rng.range(1.15, 1.6);
    return S.spawn(
      common(o, { dur: o.dur ?? 0.5, attack: o.attack ?? 0.04, key: o.key ?? 'creak', maxKey: o.maxKey ?? 3 }),
      (t, g, dur) => {
        const n = S.noiseSource();
        const am = S.gainNode(0.5);
        const makeup = S.gainNode(o.gain ?? 5);
        const b1 = S.filter('bandpass', f, f * glide, 16, t, dur);
        const b2 = S.filter('bandpass', f * 1.52, f * 1.52 * glide, 12, t, dur);
        const b2g = S.gainNode(0.6);
        n.connect(b1);
        n.connect(b2);
        b1.connect(am);
        b2.connect(b2g);
        b2g.connect(am);
        am.connect(makeup);
        makeup.connect(g);
        const l = S.osc('square', 6 + rng.next() * 7, t);
        const lg = S.gainNode(0.45);
        l.connect(lg);
        lg.connect(am.gain);
        return [n, l];
      },
    );
  }

  // Coin shimmer: one metallic ping that jumps up a fifth a moment later (the classic coin sound).
  function coin(o = {}) {
    const f = clampF(o.freq ?? 1568, 300, 5000);
    return S.spawn(
      common(o, { vol: o.vol ?? 0.1, dur: o.dur ?? 0.34, attack: 0.002, key: o.key ?? 'coin', maxKey: o.maxKey ?? 10 }),
      (t, g, dur) => {
        const car = S.osc('sine', f, t);
        const mod = S.osc('sine', f * 1.414, t);
        car.frequency.setValueAtTime(f * 1.5, t + 0.055);
        mod.frequency.setValueAtTime(f * 1.5 * 1.414, t + 0.055);
        const mg = S.gainNode(0);
        mg.gain.setValueAtTime(f * 1.1, t);
        mg.gain.exponentialRampToValueAtTime(f * 0.06, t + dur * 0.7);
        mod.connect(mg);
        mg.connect(car.frequency);
        car.connect(g);
        return [car, mod];
      },
    );
  }

  // Brass: two saws with vibrato through a low-pass that swells open.
  function brass(o = {}) {
    const f = clampF(o.freq, 60, 2000);
    return S.spawn(
      common(o, { dur: o.dur ?? 0.8, attack: o.attack ?? 0.05, hold: o.hold ?? 0.2, key: o.key ?? 'brass', maxKey: o.maxKey ?? 4 }),
      (t, g, dur) => {
        const a = S.osc('sawtooth', f, t, -6);
        const b = S.osc('sawtooth', f, t, 6);
        const mix = S.gainNode(0.4);
        const lp = S.filter('lowpass', f * 1.3, Math.min(9000, f * 5), 0.8, t, Math.min(0.25, dur * 0.4));
        a.connect(mix);
        b.connect(mix);
        mix.connect(lp);
        lp.connect(g);
        const v = S.lfo(a.detune, 5.5, 9, t);
        const v2 = S.gainNode(1);
        v.connect(v2);
        v2.connect(b.detune);
        return [a, b, v];
      },
    );
  }

  // A heavy thump: a low sine that drops in pitch plus a dull noise click.
  function thud(o = {}) {
    const f = clampF(o.freq ?? 120, 30, 500);
    return S.spawn(common(o, { dur: o.dur ?? 0.3, attack: 0.004, key: o.key ?? 'thud', maxKey: o.maxKey ?? 3 }), (t, g, dur) => {
      const a = S.osc('sine', f, t);
      a.frequency.exponentialRampToValueAtTime(Math.max(22, f * 0.35), t + dur * 0.85);
      const n = S.noiseSource();
      const lp = S.filter('lowpass', 420, 0, 0.7, t);
      const ng = S.gainNode(0);
      ng.gain.setValueAtTime(0.6, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(g);
      a.connect(g);
      return [a, n];
    });
  }

  // A deep boom: sub drop with an octave above and a falling rumble.
  function boom(o = {}) {
    const f = clampF(o.freq ?? 78, 30, 200);
    return S.spawn(common(o, { dur: o.dur ?? 1.8, attack: 0.01, key: o.key ?? 'boom', maxKey: 2 }), (t, g, dur) => {
      const a = S.osc('sine', f, t);
      a.frequency.exponentialRampToValueAtTime(24, t + dur * 0.8);
      const b = S.osc('triangle', f * 2, t);
      b.frequency.exponentialRampToValueAtTime(48, t + dur * 0.7);
      const bg = S.gainNode(0.3);
      b.connect(bg);
      bg.connect(g);
      a.connect(g);
      const n = S.noiseSource();
      const lp = S.filter('lowpass', 500, 70, 0.7, t, dur * 0.7);
      const ng = S.gainNode(0);
      ng.gain.setValueAtTime(0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(g);
      return [a, b, n];
    });
  }

  // Bright clang: inharmonic FM with a tiny burst of high noise at the strike.
  function clang(o = {}) {
    const f = clampF(o.freq ?? 1180, 300, 4000);
    return S.spawn(common(o, { dur: o.dur ?? 0.7, attack: 0.002, key: o.key ?? 'clang', maxKey: o.maxKey ?? 3 }), (t, g, dur) => {
      const car = S.osc('sine', f, t);
      const mod = S.osc('sine', f * 1.483, t);
      const mg = S.gainNode(0);
      mg.gain.setValueAtTime(f * 2.8, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
      mod.connect(mg);
      mg.connect(car.frequency);
      car.connect(g);
      const n = S.noiseSource();
      const hp = S.filter('highpass', 5000, 0, 0.7, t);
      const ng = S.gainNode(0);
      ng.gain.setValueAtTime(0.35, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(hp);
      hp.connect(ng);
      ng.connect(g);
      return [car, mod, n];
    });
  }

  // Wood crack: three sharp noise bursts spaced a little apart.
  function crack(o = {}) {
    return S.spawn(common(o, { dur: o.dur ?? 0.25, attack: 0.002, key: o.key ?? 'crack', maxKey: 2 }), (t, g) => {
      const n = S.noiseSource();
      const hp = S.filter('highpass', 700, 0, 0.7, t);
      const bp = S.filter('bandpass', 1900, 0, 1.2, t);
      const ng = S.gainNode(0);
      ng.gain.setValueAtTime(0, t);
      [[0, 1], [0.03, 0.7], [0.065, 0.45]].forEach(([dt, a]) => {
        ng.gain.setValueAtTime(a, t + dt);
        ng.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.022);
      });
      n.connect(hp);
      hp.connect(bp);
      bp.connect(ng);
      ng.connect(g);
      return [n];
    });
  }

  // Rising or falling whoosh. from/to are the filter sweep in Hz.
  function whoosh(o = {}) {
    const from = o.from ?? 400;
    const to = o.to ?? 3200;
    return S.spawn(common(o, { dur: o.dur ?? 0.4, attack: o.attack ?? 0.12, key: o.key ?? 'whoosh', maxKey: o.maxKey ?? 3 }), (t, g, dur) => {
      const n = S.noiseSource();
      const bp = S.filter('bandpass', from, to, o.q ?? 1.6, t, dur);
      n.connect(bp);
      bp.connect(g);
      return [n];
    });
  }

  // A tiny mechanical tick: a noise click plus a high ping at the given pitch.
  function tick(o = {}) {
    const f = clampF(o.freq ?? 2400, 500, 9000);
    return S.spawn(common(o, { dur: 0.07, attack: 0.002, key: o.key ?? 'tick', maxKey: o.maxKey ?? 3 }), (t, g) => {
      const n = S.noiseSource();
      const bp = S.filter('bandpass', f * 1.5, 0, 4, t);
      const ng = S.gainNode(0);
      ng.gain.setValueAtTime(0.9, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      n.connect(bp);
      bp.connect(ng);
      ng.connect(g);
      const p = S.osc('sine', f, t);
      const pg = S.gainNode(0.5);
      pg.gain.setValueAtTime(0.5, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      p.connect(pg);
      pg.connect(g);
      return [n, p];
    });
  }

  // A small high sparkle: one quiet high bell and a breath of bright noise.
  function sparkle(o = {}) {
    const f = clampF(o.freq ?? 2093, 800, 9000);
    const vol = o.vol ?? 0.05;
    const where = pick(o, 'delay', 'at', 'pan', 'music', 'bus', 'sendBus');
    bell({ ...where, freq: f, vol, ratio: 3.01, index: 0.6, dur: 0.45, send: 0.5, key: 'sparkle', maxKey: 4 });
    S.noise({ ...where, filter: 'bandpass', freq: rng.range(6500, 9500), q: 7, dur: 0.07, attack: 0.003, vol: vol * 0.6, key: 'sparkle', maxKey: 4 });
  }

  // A soft woodblock-like click used by the interface sounds.
  function click(o = {}) {
    const f = clampF(o.freq ?? 900, 120, 6000);
    return S.spawn(common(o, { dur: o.dur ?? 0.08, attack: 0.002, key: o.key ?? 'click', maxKey: o.maxKey ?? 3 }), (t, g, dur) => {
      const a = S.osc('triangle', f, t);
      a.frequency.exponentialRampToValueAtTime(clampF(f * (o.drop ?? 0.7), 60, 8000), t + dur * 0.8);
      a.connect(g);
      return [a];
    });
  }

  const lib = { bell, glass, pluck, pad, sub, texture, dust, creak, coin, brass, thud, boom, clang, crack, whoosh, tick, sparkle, click };
  // Every voice is safe: a failure inside one is logged and swallowed.
  for (const k of Object.keys(lib)) {
    const fn = lib[k];
    lib[k] = (...a) => {
      try {
        return fn(...a);
      } catch (e) {
        warn('voice ' + k + ' failed', e);
        return null;
      }
    };
  }
  return lib;
}
