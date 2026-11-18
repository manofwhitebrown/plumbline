// The tutorial brain. It walks the steps, listens for game events, and never gets stuck.
// It does not touch the page itself. It asks `find` for targets and tells `overlay` what to show.
import { STEPS, resumeId } from './steps.js';

const POLL_MS = 250;
const BUS_NAMES = ['run:started', 'run:ended', 'meta:changed', 'rig:changed'];

function payloadText(p) {
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object') {
    if (typeof p.what === 'string') return p.what;
    if (Array.isArray(p.what)) return p.what.join(' ');
  }
  return '';
}

// deps: { bus, overlay, find(name)->{rect}|null, store:{get,set}, timers:{setTimeout,clearTimeout,now}, log, steps? }
export function createFlow(deps) {
  const { bus, overlay, find, store, timers, log } = deps;
  const steps = deps.steps || STEPS;
  let active = false;
  let idx = -1;
  let token = 0;
  let everFound = false;
  let enteredAt = 0;
  let pollTimer = null;
  let stepTimers = [];
  let offs = [];

  function indexOf(id) {
    for (let i = 0; i < steps.length; i++) if (steps[i].id === id) return i;
    return -1;
  }

  function clearTimers() {
    if (pollTimer !== null) timers.clearTimeout(pollTimer);
    pollTimer = null;
    for (const t of stepTimers) timers.clearTimeout(t);
    stepTimers = [];
  }

  function teardown() {
    active = false;
    token++;
    clearTimers();
    for (const off of offs) {
      try {
        off();
      } catch (e) {
        // Ignore.
      }
    }
    offs = [];
    try {
      overlay.hide();
    } catch (e) {
      log.warn('tutorial overlay hide failed', e);
    }
  }

  function finish() {
    if (!active) return;
    store.set({ done: true, stepId: '' });
    teardown();
    try {
      bus.emit('tutorial:done', {});
    } catch (e) {
      // Ignore.
    }
  }

  function skip() {
    if (!active) return;
    store.set({ skipped: true, done: true });
    teardown();
  }

  function advance(toId) {
    if (!active) return;
    let next = idx + 1;
    if (toId) {
      const j = indexOf(toId);
      if (j >= 0) next = j;
    }
    enter(next);
  }

  function poll(myToken) {
    if (!active || myToken !== token) return;
    const step = steps[idx];
    try {
      const names = step.targets || [];
      const found = [];
      for (const n of names) {
        const f = find(n);
        if (f && f.rect) found.push(f);
      }
      // "Appears" conditions: the next screen is ready.
      for (const c of step.on || []) {
        if (c.appears && find(c.appears)) return advance(c.goto);
      }
      if (names.length === 0) {
        show(step, []);
      } else if (found.length > 0) {
        everFound = true;
        show(step, found.map((f) => f.rect));
      } else {
        overlay.hide();
        if (!everFound && timers.now() - enteredAt >= (step.findMs || 3000)) return advance(step.skipTo);
      }
    } catch (e) {
      log.warn('tutorial poll failed', e);
      return advance(step.skipTo);
    }
    pollTimer = timers.setTimeout(() => poll(myToken), POLL_MS);
  }

  function show(step, rects) {
    overlay.show({
      rects,
      text: step.text,
      button: step.mode === 'info' ? 'Got it' : '',
      onButton: () => advance(),
      onSkip: () => skip(),
    });
  }

  function enter(i) {
    clearTimers();
    if (i < 0 || i >= steps.length) return finish();
    idx = i;
    token++;
    const my = token;
    const step = steps[i];
    everFound = false;
    enteredAt = timers.now();
    store.set({ stepId: step.id });
    for (const c of step.on || []) {
      if (typeof c.afterMs === 'number') stepTimers.push(timers.setTimeout(() => my === token && advance(c.goto), c.afterMs));
    }
    if (typeof step.maxMs === 'number') stepTimers.push(timers.setTimeout(() => my === token && advance(step.maxTo), step.maxMs));
    poll(my);
  }

  function onBus(name, payload) {
    if (!active) return;
    const step = steps[idx];
    for (const c of step.on || []) {
      if (c.bus !== name) continue;
      if (c.match && payloadText(payload).toLowerCase().indexOf(c.match) < 0) continue;
      return advance(c.goto);
    }
  }

  return {
    start(stepId) {
      if (active) return;
      active = true;
      offs = BUS_NAMES.map((n) => bus.on(n, (p) => onBus(n, p)));
      const first = stepId ? indexOf(resumeId(stepId)) : 0;
      enter(first < 0 ? 0 : first);
    },
    skip,
    isActive: () => active,
    currentId: () => (active && steps[idx] ? steps[idx].id : null),
    _onBus: onBus,
  };
}
