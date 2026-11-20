# Notes — LAYOUT-1 (layout gate, takes over from NEW-8)

STATUS: IN PROGRESS

## Done
- `docs/layout/layout1-check.mjs`: runner for LAYOUT_CHECK sections 1 and 2. All 11 screens (Welcome back modal, Home, Rig, Crew, Workshop, Codex, Rewards, Settings, Guide, Drop, Results), 12 sizes, twists (large, reduce, notch with --sat/--sab, zoom, rotate). Reuses NEW-8's audit. Skips the drifting backdrop and the floating gold pops on Drop (they fade and cannot be tapped).
- How to run: see the top of the file. Chrome: the Playwright copy works. Use `vite preview` (the dev server never goes idle).
- First results, extreme fixture, no twist, 12 sizes: all screens pass except Rig: "Clear" and "Drop" buttons are 7px apart (need 8px).

## In progress
- Fix Rig button gap in `src/ui/styles/fixes/layout-LAYOUT-1.css`.
- Then fixtures empty and busy, then twists (large, notch, reduce, zoom, rotate), then Drop and Results.

## Next
- Write `docs/layout/LAYOUT-1.md` pass/fail table, `tests/integration-layout-*.test.js` for the fixes.
