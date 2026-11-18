# NEW-1 notes (Drop screen and Results screen)

## Done
- Logic (tested): `src/ui/logic/dropModel.js`, `haulLock.js`, `dropController.js`, `resultsPlan.js`.
- Drop: `screens/drop.js`, `dropHud.js`, `dropPause.js`, `styles/drop.css`. Canvas, HUD, gauge, pause menu, Esc/back, Space, tab-hidden pause.
- Results: `screens/results.js`, `resultsReveal.js`, `styles/results.css`. Staged reveal (about 2.5 s), tap to skip.
- Played full drops in a real browser at 360x640, 390x844, 430x932 and 1440x900: no overflow, Haul Up fires once when spammed.

## In progress
- Checking reload mid-drop, Snap results, 320x568, sideways phone, Large text, Reduce motion.

## Next
- Final `npm run check`, then set STATUS: DONE.

## What other AIs must know
- Drop mounts, then calls `session.start({ ...tutorial.runOptions() })`. If a drop is already going it shows the pause menu instead.
- `onBack()` on Drop always opens or closes the pause menu. It never leaves the drop.
- Boot warning seen in the console: `getSlice: "run" is not registered` (not from my files).
