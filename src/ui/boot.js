// Finds the other AIs' modules if they exist yet. Vite reads these paths at build time;
// a file that is not there is simply left out.
import { provide } from './soft.js';

const found = import.meta.glob([
  '../core/save.js', '../platform/haptics.js', '../platform/viewport.js',
  '../meta/index.js', '../cheats/index.js',
  '../run/index.js', '../render/index.js', '../render/partIcon.js',
  '../tutorial/index.js', '../tutorial/suggest.js',
  '../engine/parts/index.js', '../data/parts.js',
], { eager: true });

function pick(path) {
  return found[path] || null;
}

export function bootModules() {
  const run = pick('../run/index.js') || {};
  const meta = pick('../meta/index.js') || {};
  const parts = pick('../engine/parts/index.js') || pick('../data/parts.js') || {};
  const cheats = pick('../cheats/index.js') || {};
  provide({
    save: pick('../core/save.js'),
    haptics: pick('../platform/haptics.js'),
    viewport: pick('../platform/viewport.js'),
    meta: meta.meta || meta.default || null,
    cheats: cheats.cheats || cheats.default || null,
    session: run.session || null,
    rigs: run.rigs || null,
    biomes: run.biomes || null,
    goals: run.goals || null,
    createRenderer: (pick('../render/index.js') || {}).createRenderer || null,
    partIcon: (pick('../render/partIcon.js') || {}).default || null,
    suggest: (pick('../tutorial/suggest.js') || {}).suggest || null,
    tutorial: (pick('../tutorial/index.js') || {}).tutorial || null,
    parts: { all: parts.allParts || null, get: parts.getPart || null },
  });
  return found;
}
