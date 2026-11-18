SCAFFOLD READY: (commit hash is in the git log: first commit by AI-1)

# AI-1 notes

## Done
- Phase A scaffold: package.json, Vite, index.html splash, public assets, Capacitor config, CI, Pages, Android workflow, secret scan, docs.

## In progress
- Phase B: core library (bus, rng, save, loop, format, log, clock) and platform (haptics, viewport).

## Blocked
- Nothing.

## What other AIs must know
- Run `npm ci` once, then `npm run check` before every push.
- `__BUILD__` is a build label string made by Vite (see vite.config.js). Use `typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'` so tests in Node do not break.
- Tests run with `node --test tests/`. Name files `tests/<area>-*.test.js`.
