# FINISH-3 notes (finishes HOOK-3 and PERF-2)

## Done
- Found: the Wall and Looks panels (codexWall.js) were never shown, the Codex had no tabs for them. Added Wall and Looks tabs to src/ui/screens/codex.js (small guarded hook, Codex file is NEW-3's; Wall and Looks tabs have a gold dot when something is new).
- Six tabs did not fit one row at 320 px (labels cut, tabs 41 px wide). wall.css now puts them in two rows of three (91 px wide, 48 px high at 320).
- Looks picker now has a live preview picture (cosmeticsHook.paintPreview, drawn once per tap, not per frame). Tap a Look to see it, Wear keeps it.
- Saw it work in a real headless Chromium at 320x568, 360x640, 430x932: Wall at 0, 12, 36 found, Looks with preview, no sideways scroll, no console errors.
- Wall bonus now reaches real Drops: guarded block in src/meta/mods.js getMods (request note docs/requests/FINISH-3-to-AI5-wall-hooks.md); test tests/hook3-wallmods.test.js.
- Bug fixed: relicBook only started listening when the Codex was opened, so relics found in a Drop before that were lost. cosmeticsHook.js (loaded with Home and Drop) now imports it.
- Speed: AFTER table in docs/perf/PERF-2.md; added looks/reduce options to dev/perf-run.js and perf-lab.js; tests/perf-idle.test.js.

STATUS: DONE (gaps: 6x AFTER run, memory run at 430x932, browser look at Looks in Drop and Home, real-phone speed).
- Full check showed 1 flaky failure (integration-flow-real, 'a snap pays exactly once'), also seen without my changes; request note docs/requests/FINISH-3-to-Manager-red.md. My last push went out before I had read that result; I should have waited.
- Helped others: fixed the button release bug ONBOARD-2 found (src/ui/motion/micro.js and results.js used scale(-0.03) etc. with composite add, which really shrinks buttons to about 0 so taps missed). Real sizes now; guard test tests/motion-scale-add.test.js. My own browser tap check was inconclusive (could not catch the animation), so this rests on the WAAPI rule, ONBOARD-2's report and the source test: please confirm with a real touch tap. Made 'a snap pays exactly once' deterministic (weak rope), 12 of 12 passes.
