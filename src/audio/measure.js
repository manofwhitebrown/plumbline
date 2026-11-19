// Numbers for judging a rendered sound without listening: peak, RMS, loudness (LUFS-style,
// K-weighted, gated), DC offset, longest silence, and how the energy is spread over the spectrum.
// Works on plain Float32Arrays, so tests and the lab can both use it. Loudness assumes 48 kHz.

const db = (x) => (x > 1e-12 ? 20 * Math.log10(x) : -240);

function biquad(x, b, a) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

// ITU-R BS.1770 K-weighting at 48 kHz.
function kWeight(x) {
  const s1 = biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
  return biquad(s1, [1, -2, 1], [1, -1.99004745483398, 0.99007225036621]);
}

// Integrated loudness with the two BS.1770 gates. Stereo channels are summed in power.
export function loudness(left, right, rate = 48000) {
  const chans = [kWeight(left)];
  if (right) chans.push(kWeight(right));
  const block = Math.round(0.4 * rate);
  const hop = Math.round(0.1 * rate);
  const powers = [];
  for (let s = 0; s + block <= left.length; s += hop) {
    let sum = 0;
    for (const c of chans) {
      let p = 0;
      for (let i = s; i < s + block; i++) p += c[i] * c[i];
      sum += p / block;
    }
    powers.push(sum);
  }
  const lk = (p) => -0.691 + 10 * Math.log10(Math.max(p, 1e-12));
  const abs = powers.filter((p) => lk(p) > -70);
  if (!abs.length) return -120;
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const rel = lk(mean(abs)) - 10;
  const kept = abs.filter((p) => lk(p) > rel);
  return kept.length ? lk(mean(kept)) : lk(mean(abs));
}

// In-place radix-2 FFT.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

// Share of the energy in four bands: low (under 250 Hz), mid (250 to 2000), high (2000 to 8000), air (over 8000).
export function spectralBalance(x, rate = 48000) {
  const N = 4096;
  const re = new Float64Array(N), im = new Float64Array(N);
  const bands = { low: 0, mid: 0, high: 0, air: 0 };
  const hop = N * 2;
  for (let s = 0; s + N <= x.length; s += hop) {
    for (let i = 0; i < N; i++) {
      re[i] = x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const f = (k * rate) / N;
      const p = re[k] * re[k] + im[k] * im[k];
      if (f < 250) bands.low += p;
      else if (f < 2000) bands.mid += p;
      else if (f < 8000) bands.high += p;
      else bands.air += p;
    }
  }
  const total = bands.low + bands.mid + bands.high + bands.air || 1;
  return { low: bands.low / total, mid: bands.mid / total, high: bands.high / total, air: bands.air / total };
}

// Longest stretch (seconds) where the 50 ms RMS stays under thresholdDb.
export function longestSilence(left, right, rate = 48000, thresholdDb = -60) {
  const win = Math.round(0.05 * rate);
  let run = 0, best = 0;
  for (let s = 0; s + win <= left.length; s += win) {
    let p = 0;
    for (let i = s; i < s + win; i++) p += left[i] * left[i] + (right ? right[i] * right[i] : 0);
    const r = Math.sqrt(p / win / (right ? 2 : 1));
    if (db(r) < thresholdDb) run += 0.05;
    else {
      best = Math.max(best, run);
      run = 0;
    }
  }
  return Math.max(best, run);
}

// Time (seconds) from the loudest moment until the 10 ms RMS drops below -40 dB (relative to full scale).
export function decayTime(left, right, rate = 48000, floorDb = -40) {
  const win = Math.round(0.01 * rate);
  let peakAt = 0, peak = 0;
  const env = [];
  for (let s = 0; s + win <= left.length; s += win) {
    let p = 0;
    for (let i = s; i < s + win; i++) p += left[i] * left[i] + (right ? right[i] * right[i] : 0);
    const r = Math.sqrt(p / win / (right ? 2 : 1));
    env.push(r);
    if (r > peak) {
      peak = r;
      peakAt = env.length - 1;
    }
  }
  for (let i = peakAt; i < env.length; i++) if (db(env[i]) < floorDb) return (i - peakAt) * 0.01;
  return (env.length - peakAt) * 0.01;
}

// Everything at once. left and right are Float32Arrays of the same length.
export function analyze(left, right, rate = 48000) {
  const n = left.length;
  let peak = 0, sum = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    const a = left[i], b = right ? right[i] : a;
    peak = Math.max(peak, Math.abs(a), Math.abs(b));
    sum += a + b;
    sq += a * a + b * b;
  }
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) mono[i] = right ? (left[i] + right[i]) * 0.5 : left[i];
  return {
    peak,
    peakDb: db(peak),
    rmsDb: db(Math.sqrt(sq / (2 * n))),
    dc: sum / (2 * n),
    lufs: loudness(left, right, rate),
    longestSilence: longestSilence(left, right, rate),
    balance: spectralBalance(mono, rate),
    hasNaN: left.some((v) => !Number.isFinite(v)),
  };
}
