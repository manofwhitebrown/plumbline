# Notes — LAYOUT-1 (layout gate, takes over from NEW-8)

STATUS: DONE

## Done
- `docs/layout/layout1-check.mjs`: runner for LAYOUT_CHECK sections 1 and 2. All 11 screens (Welcome back modal, Home, Rig, Crew, Workshop, Codex, Rewards, Settings, Guide, Drop, Results), 12 sizes, twists (large, reduce, notch with --sat/--sab, zoom, rotate). Reuses NEW-8's audit. Skips the drifting backdrop and the floating gold pops on Drop (they fade and cannot be tapped).
- How to run: see the top of the file. Chrome: the Playwright copy works. Use `vite preview` (the dev server never goes idle).
- Extreme fixture, no twist, 8 tab/menu screens x 12 sizes: 96 of 96 PASS. (Earlier "Clear/Drop 7px" was the Drop button pulse scaling; real gap is 8px. Runner now freezes animations while measuring.)

## In progress
- Fixtures empty and busy, then twists (large, notch, reduce, zoom, rotate), then Drop and Results.

## Next
- Write `docs/layout/LAYOUT-1.md` pass/fail table, `tests/integration-layout-*.test.js` for the fixes.
- Push 3: empty fixture 108/108 PASS, busy fixture 108/108 PASS (12 sizes, no twist). Runner now checks the Achievement banner (fits, clears notch) and waits for it to vanish before measuring.
- Push 4: extreme fixture, Drop/Results/Welcome 36/36 at 12 sizes; Large text 44/44, notch 44/44, Reduce motion 44/44 (320x568, 360x640, 390x844, 1440x900); zoom 125/150 on 1440x900 and 1024x768 44/44; rotate 24/24. No real layout bug found so far; every early failure was an audit false alarm (see runner comments).

## Final
- `docs/layout/LAYOUT-1.md` has the pass/fail tables. 0 FAIL, 0 OPEN. No CSS fix was needed (every early failure was an audit false alarm, listed in the report), so `src/ui/styles/fixes/` has no LAYOUT-1 file.
- `tests/integration-layout-gate.test.js`: report has no FAIL cell, runner covers every screen id.
- Not covered (listed in the report): layout jump when numbers change, on-screen keyboard, contrast by eye, sheets other than Welcome back, real devices.
- LAYOUT CHECK DONE: see the latest [LAYOUT-1] commit on main.

STATUS: DONE
