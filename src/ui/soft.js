// Soft links to other AIs' modules. If a module is not there yet, we use a safe fallback.
async function soft(path, pick, fallback) {
  try {
    const mod = await import(path);
    const val = pick(mod);
    return val === undefined ? fallback : val;
  } catch (e) {
    return fallback;
  }
}

const quietLog = { warn() {}, error() {}, recent: () => [] };
const quietBus = { on: () => () => {}, emit() {} };

export const log = await soft('../core/log.js', (m) => m.log, quietLog);
export const bus = await soft('../core/bus.js', (m) => m.bus, quietBus);
