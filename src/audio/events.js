// Turns engine events (CONTRACT section 5) into sounds. Unknown or broken events are skipped.

const MAX_EVENTS = 80;

// hooks: { strain(v01), biome(id), runStart(), runEnd() }
export function createEvents(synth, sfx, hooks) {
  let lastTickAt = -1;

  return function handle(events, view) {
    if (!Array.isArray(events)) return;
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
          hooks.runStart();
          break;
        case 'FIRE': {
          const t = synth.now();
          if (ticks < 3 && t - lastTickAt >= 0.03) {
            sfx.tick();
            lastTickAt = t;
            ticks++;
          }
          break;
        }
        case 'CHAIN':
          sfx.whoosh();
          break;
        case 'COLLECT': {
          const delay = Math.min(stagger, 0.3);
          stagger += 0.045;
          const item = ev.item || {};
          if (item.kind === 'ore') sfx.ore(delay);
          else if (item.kind === 'relic') sfx.relic(delay);
          else sfx.collect(item.tier, ev.combo, delay);
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
          break;
        case 'MILESTONE':
          sfx.milestone();
          break;
        case 'SNAP':
          sfx.snap();
          hooks.runEnd();
          ended = true;
          break;
        case 'HAUL':
          sfx.haul();
          hooks.runEnd();
          ended = true;
          break;
        case 'RECORD':
          sfx.record();
          break;
        default:
          break;
      }
    }
    // If no strain event came, fall back to the view.
    if (!sawStrain && !ended && view && Number.isFinite(view.strain) && Number.isFinite(view.maxStrain) && view.maxStrain > 0) {
      hooks.strain(view.strain / view.maxStrain);
    }
  };
}
