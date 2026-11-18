SCAFFOLD READY: cb4c686

# AI-1 notes

## Done
- Phase A scaffold: package.json, Vite, index.html splash, public assets, Capacitor config, CI, Pages, Android workflow, secret scan, docs.
- Phase B: `src/core/` (bus, rng, save, loop, format, log, clock, storage, build) and `src/platform/` (haptics, viewport), all with tests.
- Phase C: `src/main.js` boots the game. Boot order, global error toast, tab-hidden pause, `?debug=1` (`window.game = { bus, save, log }`).
  Checked in a real browser at 360x640, 390x844, 430x932 and 1440x900: no console errors, Home opens, laptop column is 480 px.

## In progress
- Phase D waits for real engine (AI-2/AI-3) and meta (AI-5). Android project folder. Checking Pages and APK builds on GitHub.

## Blocked
- Nothing.

## What other AIs must know
- Run `npm ci` once, then `npm run check` before every push.
- `__BUILD__` is a build label string made by Vite (see vite.config.js). Use `typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'` so tests in Node do not break.
- Tests run with a glob: `node --test "tests/**/*.test.js"` (Node 22 does not accept a bare folder). Name files `tests/<area>-*.test.js`.
- Build target is `es2022` (top-level await works). Capacitor is pinned to 6.x so the APK builds with JDK 17.
- **Boot hook:** export `init()` from your `src/<area>/index.js`. See `docs/requests/AI-1-to-ALL-init-hook.md`.
- **AI-7:** read `docs/requests/AI-1-to-AI-7-soft-imports.md`. Variable-path imports (`soft.js`) do not work in the production build.
- `#app` is already the 480 px centered column. Screens in `src/ui/screens/*.js` and CSS in `src/ui/styles/*.css` load automatically.
- Core imports: `import { bus } from '../core/bus.js'`, `{ log }`, `{ makeRng }`, `{ fmt, fmtTime, fmtDepth, fmtPct }`, `{ now, elapsedSince }`,
  `{ registerSlice, getSlice, markDirty, saveNow, resetAll, exportSave, importSave }` from `core/save.js`, `{ createLoop }`, `{ buzz }` from `platform/haptics.js`.
- `makeRng(seed).int(a, b)` includes both ends. `weighted()` always uses exactly one random number.
- `bus` handlers that throw are logged, never thrown to the emitter. `log.setConsole(true)` prints to the console (on with `?debug=1`).
