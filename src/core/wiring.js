// Glue between the run and the "senses": sound and buzzing.
// It listens to the bus events that the run session sends and passes them on. Nothing here can throw.
import { log } from './log.js';

// deps: { bus, audio, buzz }. Returns a function that removes the listeners.
export function wireSenses({ bus, audio, buzz }) {
  const offs = [];
  const safe = (fn) => (payload) => { try { fn(payload); } catch (err) { log.warn('senses glue failed', err); } };

  offs.push(bus.on('run:started', safe(({ view } = {}) => {
    if (view && audio) { audio.setBiome(view.biomeId); audio.setStrain(0); }
  })));

  offs.push(bus.on('run:events', safe(({ events, view } = {}) => {
    if (!Array.isArray(events)) return;
    if (audio) {
      audio.onEvents(events, view);
      if (view && view.maxStrain > 0) audio.setStrain(view.strain / view.maxStrain);
    }
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e) continue;
      if (e.t === 'COLLECT') buzz('collect');
      else if (e.t === 'BIOME' && audio) audio.setBiome(e.id);
      else if (e.t === 'STRAIN' && e.max > 0 && e.value / e.max >= 0.75) buzz('warn');
      else if (e.t === 'SNAP') buzz('snap');
      else if (e.t === 'RECORD') buzz('record');
    }
  })));

  offs.push(bus.on('run:ended', safe(() => { if (audio) audio.setStrain(0); })));
  return () => offs.forEach((off) => off());
}
