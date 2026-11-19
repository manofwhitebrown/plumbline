// Turns engine events (CONTRACT section 5) into sounds. Unknown or broken events are skipped.

const MAX_EVENTS = 80;
const PAN_WIDTH = 0.7; // collect sounds spread across 70% of the stereo field

// hooks: { strain(v01), biome(id), runStart(seed), snap(), haul(), intensity({combo, depth}) }
export function createEvents(synth, sfx, hooks) {
  let lastTickAt = -1;
  let cols = 4; // grows if a higher lane shows up

  // Lane 0 is the far left, the last lane the far right.
  function panFor(lane) {
    if (!Number.isFinite(lane) || lane < 0) return 0;
    if (lane + 1 > cols) cols = Math.min(12, lane + 1);
    if (cols < 2) return 0;
    return (lane / (cols - 1) * 2 - 1) * PAN_WIDTH;
  }

  return function handle(events, view) {
    if (!Array.isArray(events)) return;
    if (view && Number.isFinite(view.cols) && view.cols > 1) cols = Math.min(12, Math.floor(view.cols));
    let stagger = 0; // spreads out many collects so they play as a little run of notes
    let ticks = 0;
    let sawStrain = false;
    let ended = false;
    const n = Math.min(events.length, MAX_EVENTS);
    for (let i = 0; i < n; i++) {
      const ev = events[i];
      if (!ev || typeof ev.t !== 'string') continue;
      switch (ev.t) {
        case 'RUN_START':
          hooks.runStart(ev.seed);
          break;
        case 'BEAT':
          if (Number.isFinite(ev.depth)) hooks.intensity({ depth: ev.depth });
          break;
        case 'FIRE': {
          const t = synth.now();
          if (ticks < 3 && t - lastTickAt >= 0.03) {
            sfx.tick(ev.partId);
            lastTickAt = t;
            ticks++;
          }
          break;
        }
        case 'CHAIN': {
          const from = ev.from && Number.isFinite(ev.from.c) ? panFor(ev.from.c) : 0;
          const to = ev.to && Number.isFinite(ev.to.c) ? panFor(ev.to.c) : from;
          sfx.whoosh(from, to);
          break;
        }
        case 'COLLECT': {
          const delay = Math.min(stagger, 0.3);
          stagger += 0.045;
          const item = ev.item || {};
          const pan = panFor(ev.lane);
          if (Number.isFinite(ev.combo)) hooks.intensity({ combo: ev.combo });
          if (item.kind === 'ore') sfx.ore(delay, pan);
          else if (item.kind === 'relic') sfx.relic(delay, pan);
          else sfx.collect(item.tier, ev.combo, delay, pan);
          break;
        }
        case 'MISS':
          sfx.miss();
          break;
        case 'HAZARD':
          if (ev.absorbedBy) sfx.hazardAbsorbed();
          else sfx.hazardHit();
          break;
        case 'STRAIN':
          if (Number.isFinite(ev.value) && Number.isFinite(ev.max) && ev.max > 0) {
            hooks.strain(ev.value / ev.max);
            sawStrain = true;
          }
          break;
        case 'BIOME':
          sfx.biome();
          hooks.biome(ev.id);
          if (Number.isFinite(ev.depth)) hooks.intensity({ depth: ev.depth });
          break;
        case 'MILESTONE':
          sfx.milestone();
          if (Number.isFinite(ev.depth)) hooks.intensity({ depth: ev.depth });
          break;
        case 'SNAP':
          sfx.snap();
          hooks.snap();
          ended = true;
          break;
        case 'HAUL':
          sfx.haul();
          hooks.haul();
          ended = true;
          break;
        case 'RECORD':
          sfx.record();
          break;
        default:
          break;
      }
    }
    if (view) {
      if (Number.isFinite(view.depth)) hooks.intensity({ depth: view.depth });
      if (Number.isFinite(view.combo)) hooks.intensity({ combo: view.combo });
    }
    // If no strain event came, fall back to the view.
    if (!sawStrain && !ended && view && Number.isFinite(view.strain) && Number.isFinite(view.maxStrain) && view.maxStrain > 0) {
      hooks.strain(view.strain / view.maxStrain);
    }
  };
}
