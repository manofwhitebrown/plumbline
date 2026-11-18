# Notes — NEW-8 (layout gate)

STATUS: IN PROGRESS

## Done
- `tests/integration-layout-css.test.js`: static CSS check (vh, wide widths, fixed bars, 44px taps, 8px gaps, font size, overflow-x, nowrap, Rig grid at 320px). Reads src CSS, the index.html style block and CSS strings in JS.
- `src/ui/styles/fixes/` created and loaded by one line in `src/ui/index.js`.
- Fix `rig-NEW-8.css`: chips 36px -> 44px, combo pills 32px -> 44px, rig cells 6px -> 8px apart, 5-column grid on short screens was 328px wide (now shrinks to fit a 320px phone).
- Text limit tests: parts, combos, twists, biomes, goals, crew, upgrades, achievements, quests, tutorial, toasts. `tests/engine-hud-extremes.test.js` for fmt.
- Text edits in src/data (too long):
  - combo `gem_press` description 95 -> 85 characters (docs/PARTS.md still has the old text; AI-3 owner).
  - quests: "Reach 100/250/500 m Depth in one Drop" -> "Reach N m in a Drop"; "Buy a new Part in the Workshop" -> "Buy a Workshop Part" (limit 22).
  - goals: gems, haulStrain and cleanRope texts were up to 44 characters (limit 28). Now "Collect N tier T+ gems", "Strain under S at D m", "Reach D m, max H hits".
- Request: `docs/requests/NEW-8-to-NEW-1-format-limits.md` (fmt of -1e100 and fmtDepth of 100000 are 9 characters; beyond reachable values; 2 todo tests wait for it).

## In progress
- Real screen check in Chrome (sizes, twists) once screens, fixtures and the device wall are on main.

## Next
- Run the full check of LAYOUT_CHECK.md sections 1 and 2 on every screen, write `docs/layout/NEW-8.md`.

## Could not test yet
- Nothing in a real browser yet.
