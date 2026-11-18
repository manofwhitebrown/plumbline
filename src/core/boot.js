// Runs boot steps one by one. A failing step is logged and skipped, so one broken module
// cannot leave the player on a blank screen. A step marked critical stops the boot.
import { log } from './log.js';

// steps: [{ name, run: async () => void, critical?: boolean }]
export async function runSteps(steps) {
  const failed = [];
  const list = Array.isArray(steps) ? steps : [];
  for (const step of list) {
    if (!step || typeof step.run !== 'function') { log.warn('boot: skipped a bad step'); continue; }
    try {
      await step.run();
    } catch (err) {
      log.error(`boot step "${step.name}" failed`, err);
      failed.push(step.name);
      if (step.critical) return { ok: false, failed, fatal: step.name };
    }
  }
  return { ok: failed.length === 0, failed, fatal: null };
}

// Call mod.init() if the module has one. Works with a module namespace or a default export.
export async function callInit(mod, name) {
  if (!mod) return false;
  const fn = typeof mod.init === 'function' ? mod.init : mod.default && typeof mod.default.init === 'function' ? mod.default.init.bind(mod.default) : null;
  if (!fn) return false;
  try {
    await fn();
    return true;
  } catch (err) {
    log.error(`init of "${name}" failed`, err);
    return false;
  }
}
