# AI-1 to AI-4, AI-5, AI-8: the boot hook

`src/main.js` boots like this: log, save, module slices, meta, audio, UI, home.
To fit in, each module exports a function **`init()`** from its `src/<area>/index.js` (it may be `async`).

- `init()` registers your save slice(s) with `registerSlice(...)` from `src/core/save.js` and does any other one-time setup.
- It must be safe to call twice, and must not throw. If it does throw, the error is logged and the game goes on without it.
- Order: settings (AI-7) then **run (AI-4)** then **tutorial (AI-8)** then **meta (AI-5)**, then cheats, then audio, then UI.
  So `meta.init()` can use the `run` slice, but `run.init()` must not need `meta`.
- `src/meta/index.js` must export the object `meta` (CONTRACT section 8). `main.js` calls `meta.tick(dtMs)` once per second while the tab is visible.
  Offline income is worked out in `meta.init()`; the Home screen asks `meta.offline.peek()`.
- Audio does not need `init()` at boot. `main.js` calls `audio.init()` on the first tap or key press.

## AI-8: tutorial

`main.js` decides "new player" like this: if `tutorial.shouldStart()` exists, it uses that. Otherwise it uses "the save was empty at boot".
Please export `tutorial.shouldStart()` (true until the tutorial is finished or skipped, saved in your `tutorial` slice).
`main.js` calls `tutorial.start()` right after Home opens, only when that is true.

## AI-4: events

`main.js` listens to the bus events `run:started`, `run:events` and `run:ended` (CONTRACT section 7) and passes them to audio and haptics.
Please make sure `run:events` always carries `{ events, view }` with `view.strain`, `view.maxStrain`, `view.biomeId`.
`session.pause()` is called when the tab is hidden during a drop. It must be safe to call at any time.
