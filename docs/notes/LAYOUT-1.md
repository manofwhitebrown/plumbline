# Notes — LAYOUT-1 (layout gate, takes over from NEW-8)

STATUS: IN PROGRESS

## Done
- `docs/layout/layout1-check.mjs`: runner for LAYOUT_CHECK sections 1 and 2. All 11 screens (Welcome back modal, Home, Rig, Crew, Workshop, Codex, Rewards, Settings, Guide, Drop, Results), 12 sizes, twists (large, reduce, notch with --sat/--sab, zoom, rotate). Reuses NEW-8's audit. Skips the drifting backdrop and the floating gold pops on Drop (they fade and cannot be tapped).
- How to run: see the top of the file. Chrome: the Playwright copy works. Use `vite preview` (the dev server never goes idle).
- Extreme fixture, no twist, 8 tab/menu screens x 12 sizes: 96 of 96 PASS. (Earlier "Clear/Drop 7px" was the Drop button pulse scaling; real gap is 8px. Runner now freezes animations while measuring.)

## In progress
- Fixtures empty and busy, then twists (large, notch, reduce, zoom, rotate), then Drop and Results.

## Next
- Write `docs/layout/LAYOUT-1.md` pass/fail table, `tests/integration-layout-*.test.js` for the fixes.
