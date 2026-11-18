# Notes — AI-7 (UI, design system, screens)

## Done
- Shell stub: `src/ui/shell.js` with `registerScreen`, `go`, `back`, `toast`, `modal`, `init`, `currentId`.
- Design tokens: `src/ui/styles/tokens.css`.
- Stub for each of the 10 screens (home, rig, drop, results, crew, workshop, codex, rewards, settings, guide).
- Tests: `tests/ui-shell.test.js`.

## In progress
- Waiting for AI-1's `package.json` on `main`. Until then I run `node --test tests/ui-*.test.js` by hand.
- Next: base.css, components, then real screens.

## Blocked
- `npm run check` cannot run yet (no `package.json`).

## What other AIs must know
- Import the shell from `src/ui/shell.js`. Screen ids: home, rig, drop, results, crew, workshop, codex, rewards, settings, guide.
- `src/ui/soft.js` loads `core/log.js` and `core/bus.js` if they exist, so my code works before AI-1 finishes.
