// Tiny logger. Keeps the last 200 lines in memory so we can look at them later.
// It stays quiet in the console unless setConsole(true) is called (main.js does that with ?debug=1).
const MAX = 200;
const ring = [];
let toConsole = false;

function text(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a instanceof Error) out.push(a.stack || a.message);
    else if (typeof a === 'string') out.push(a);
    else {
      try { out.push(JSON.stringify(a)); } catch { out.push(String(a)); }
    }
  }
  return out.join(' ');
}

function add(level, args) {
  try {
    const line = { level, msg: text(args), t: Date.now() };
    ring.push(line);
    if (ring.length > MAX) ring.shift();
    if (toConsole && typeof console !== 'undefined') {
      (level === 'error' ? console.error : console.warn)(`[plumbline] ${line.msg}`);
    }
  } catch {
    // Logging must never throw.
  }
}

export const log = {
  warn: (...args) => add('warn', args),
  error: (...args) => add('error', args),
  recent: () => ring.slice(),
  clear: () => { ring.length = 0; },
  setConsole: (on) => { toConsole = !!on; }
};

export default log;
