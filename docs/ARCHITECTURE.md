# Architecture

(Full version is written in the integration phase. This is the short map.)

Layers, low to high:

1. `src/core/` and `src/platform/`: bus, rng, save, loop, format, log, clock, haptics, viewport.
2. `src/engine/`: pure run logic. No screen, no timers. Same seed gives the same run.
3. `src/run/`, `src/meta/`: a drop session and the long-term game (gold, crew, upgrades).
4. `src/render/`, `src/audio/`, `src/ui/`: what the player sees and hears. They listen to events.
5. `src/main.js`: boots everything in order.

See `docs/CONTRACT.md` for every public function.

## How a drop flows through the code

1. `main.js` boots the steps in order: save, modules (`init()` of each), meta, recover, audio, UI, Home.
2. Home or Rig calls `startDrop()` in `src/ui/flow.js`. It starts the session (`src/run/session.js`) and opens the Drop screen. Screens never start a run themselves.
3. Each beat, `src/engine/beat.js` runs the real parts through `src/engine/parts/runtime.js` and pays the gold.
4. Haul or Snap goes through `src/run/finish.js`. It pays gold and shards exactly once, then sends `run:ended`. The flow opens Results.
5. If the page closes in the middle of a drop, `session.recover()` at the next boot pays it once as a snap.
6. Debug: `?debug=1` adds `screen=` and `fixture=` (`src/cheats/fixtures.js`). Fixtures use a memory-only save.
