// One shared reverb. Each biome has its own generated room (no audio files).
// Two convolvers swap with a crossfade so changing room never clicks.
import { createRng } from './rng.js';
import { warn } from './safe.js';

// rt = seconds to fade 60 dB, len = impulse length, damp = [bright, dark] cutoff in Hz over time,
// wet = base mix, low = extra low rumble.
export const SPACES = {
  clay: { rt: 0.45, len: 0.9, pre: 0.004, damp: [4500, 1200], wet: 0.16, low: 0, seed: 11 },
  quartz: { rt: 2.4, len: 3.0, pre: 0.012, damp: [12000, 5000], wet: 0.3, low: 0, seed: 23 },
  amber: { rt: 1.8, len: 2.4, pre: 0.02, damp: [5000, 1800], wet: 0.28, low: 0.1, seed: 37 },
  magma: { rt: 2.6, len: 3.0, pre: 0.01, damp: [1500, 320], wet: 0.3, low: 0.6, seed: 41 },
  void: { rt: 4.2, len: 4.0, pre: 0.045, damp: [3000, 600], wet: 0.4, low: 0.2, seed: 53 },
  abyss: { rt: 4.2, len: 4.0, pre: 0.05, damp: [2400, 450], wet: 0.42, low: 0.3, seed: 59 },
  menu: { rt: 1.4, len: 2.0, pre: 0.015, damp: [7000, 2500], wet: 0.22, low: 0, seed: 61 },
};

export function spaceFor(id) {
  return Object.prototype.hasOwnProperty.call(SPACES, id) ? SPACES[id] : SPACES.clay;
}

// Build a stereo impulse response: pre-delay, a few early echoes, then a noise tail that
// fades out and gets darker with time. Returns { left, right } Float32Arrays.
export function makeImpulse(id, sampleRate) {
  const sp = spaceFor(id);
  const rate = Number.isFinite(sampleRate) && sampleRate > 1000 ? sampleRate : 44100;
  const len = Math.max(64, Math.floor(sp.len * rate));
  const chans = [];
  for (let ch = 0; ch < 2; ch++) {
    const rng = createRng(sp.seed * 7 + ch * 101);
    const d = new Float32Array(len);
    let lp = 0;
    let lowLp = 0;
    const pre = Math.floor(sp.pre * rate);
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / rate;
      const env = Math.pow(10, (-3 * t) / sp.rt);
      const k = Math.min(1, t / sp.len);
      const fc = sp.damp[0] + (sp.damp[1] - sp.damp[0]) * k;
      const a = 1 - Math.exp((-2 * Math.PI * fc) / rate);
      const n = rng.next() * 2 - 1;
      lp += a * (n - lp);
      let v = lp;
      if (sp.low) {
        lowLp += 0.012 * (n - lowLp);
        v += lowLp * sp.low * 6;
      }
      d[i] = v * env;
    }
    // Early reflections.
    for (let e = 0; e < 7; e++) {
      const at = pre + Math.floor(rng.range(0.004, 0.09) * rate);
      if (at < len) d[at] += (rng.next() > 0.5 ? 1 : -1) * rng.range(0.25, 0.7) * Math.pow(0.8, e);
    }
    // Fade the very end so it cannot click.
    const fade = Math.min(len, Math.floor(0.05 * rate));
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
    chans.push(d);
  }
  return { left: chans[0], right: chans[1] };
}

// ctx: the audio context. out: the node the wet signal goes to. Returns null input when unavailable.
export function createReverb(ctx, out, { enabled = true, now }) {
  const can = enabled && typeof ctx.createConvolver === 'function' && typeof ctx.createBuffer === 'function';
  if (!can) return { available: false, input: null, setSpace() {}, setDepth() {}, setEnabled() {}, current: () => null };
  const input = ctx.createGain();
  const slots = [0, 1].map(() => {
    const send = ctx.createGain();
    const conv = ctx.createConvolver();
    const ret = ctx.createGain();
    send.gain.value = 0;
    ret.gain.value = 0;
    input.connect(send);
    send.connect(conv);
    conv.connect(ret);
    ret.connect(out);
    return { send, conv, ret, id: null };
  });
  const cache = {};
  let active = 0;
  let depth01 = 0;
  let spaceId = null;

  function buffer(id) {
    if (cache[id]) return cache[id];
    const rate = ctx.sampleRate || 44100;
    const imp = makeImpulse(id, rate);
    const buf = ctx.createBuffer(2, imp.left.length, rate);
    buf.getChannelData(0).set(imp.left);
    buf.getChannelData(1).set(imp.right);
    cache[id] = buf;
    return buf;
  }

  function wetFor(id) {
    return spaceFor(id).wet * (0.7 + 0.6 * depth01);
  }

  function apply(fade) {
    const t = now();
    const s = slots[active];
    const o = slots[1 - active];
    const tc = fade ? 0.35 : 0.05;
    try {
      s.ret.gain.setTargetAtTime(wetFor(spaceId), t, tc);
      s.send.gain.setTargetAtTime(1, t, tc);
      o.ret.gain.setTargetAtTime(0, t, tc);
      o.send.gain.setTargetAtTime(0, t, tc);
    } catch (e) {
      warn('reverb apply failed', e);
    }
  }

  return {
    available: true,
    input,
    current: () => spaceId,
    // Choose the room. The idle convolver loads it, then the two crossfade.
    setSpace(id) {
      try {
        const key = Object.prototype.hasOwnProperty.call(SPACES, id) ? id : 'clay';
        if (key === spaceId) return;
        const next = 1 - active;
        slots[next].conv.buffer = buffer(key);
        slots[next].id = key;
        active = next;
        spaceId = key;
        apply(true);
      } catch (e) {
        warn('reverb space failed', e);
      }
    },
    // 0 (surface) to 1 (deep): deeper means wetter.
    setDepth(d) {
      depth01 = Number.isFinite(d) ? Math.min(1, Math.max(0, d)) : 0;
      if (spaceId) apply(false);
    },
    setEnabled(flag) {
      const t = now();
      try {
        for (const s of slots) s.send.gain.setTargetAtTime(flag && s === slots[active] && spaceId ? 1 : 0, t, 0.05);
      } catch (e) {
        // Optional.
      }
    },
  };
}
