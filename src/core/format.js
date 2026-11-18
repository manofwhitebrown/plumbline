// Number and time text for the screen. Never prints NaN or Infinity.
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function toNum(n) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : NaN;
}

// 1 decimal under 100, whole number above. Trims ".0".
function trim(x) {
  return String(x).replace(/\.0$/, '');
}

// Past Dc: 1.5e40 style.
function expStyle(v) {
  const wide = v >= 1e100;                 // a 3-digit exponent: one decimal, so even a minus sign fits 8 characters
  const [m, e] = v.toExponential(wide ? 1 : 2).split('e');
  return `${Number(m)}e${Number(e)}`;
}

export function fmt(n) {
  let v = toNum(n);
  if (Number.isNaN(v)) return n === Infinity ? 'Max' : n === -Infinity ? '-Max' : '0';
  if (v < 0) {
    const a = fmt(-v);
    return a === '0' ? '0' : '-' + a;
  }
  if (v < 1000) {
    const r = Math.round(v);
    if (r < 1000) return String(r);
    return '1K'; // 999.5 rounds up
  }
  let k = Math.floor(Math.log10(v) / 3);
  if (k > 11) return expStyle(v);
  let scaled = v / Math.pow(1000, k);
  if (scaled < 1 && k > 0) { k -= 1; scaled *= 1000; } // guard against tiny log rounding
  let text = scaled < 100 ? (Math.round(scaled * 10) / 10).toFixed(1) : String(Math.round(scaled));
  if (Number(text) >= 1000) { // 999.96K must become 1M
    k += 1;
    if (k > 11) return expStyle(v);
    scaled = v / Math.pow(1000, k);
    text = (Math.round(scaled * 10) / 10).toFixed(1);
  }
  return trim(text) + SUFFIX[k];
}

const pad2 = (x) => (x < 10 ? '0' + x : String(x));

export function fmtTime(ms) {
  let v = toNum(ms);
  if (Number.isNaN(v) || v <= 0) return '0s';
  const total = Math.floor(v / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${pad2(h)}h`;
  if (h > 0) return `${h}h ${pad2(m)}m`;
  if (m > 0) return `${m}m ${pad2(s)}s`;
  return `${s}s`;
}

export function fmtDepth(m) {
  let v = toNum(m);
  if (Number.isNaN(v) || v < 0) v = 0;
  if (v >= 1e5) return `${fmt(v)} m`;     // 100,000 m would be 9 characters; 100K m is 6
  const r = Math.floor(v);
  return `${String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} m`;
}

// x is a fraction: 0.35 -> "35%".
export function fmtPct(x) {
  const v = toNum(x);
  if (Number.isNaN(v)) return '0%';
  const p = v * 100;
  if (Math.abs(p) >= 1e6) return `${fmt(p)}%`;
  if (Math.abs(p) < 10) return `${trim((Math.round(p * 10) / 10).toFixed(1))}%`;
  return `${Math.round(p)}%`;
}

export default { fmt, fmtTime, fmtDepth, fmtPct };
