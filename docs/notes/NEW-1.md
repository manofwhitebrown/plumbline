# NEW-1 notes (Drop screen and Results screen)

STATUS: DONE

## Done
- Logic, all tested: `src/ui/logic/dropModel.js` (HUD values), `haulLock.js` (one press only), `dropController.js` (bus, session, pause, keys, cleanup), `resultsPlan.js` (what Results shows and when).
- Drop: `screens/drop.js`, `dropHud.js`, `dropPause.js`, `styles/drop.css`.
  - Canvas fills the screen. Sized from the stage, resized on parent change and rotation, sharp (dpr up to 2).
  - HUD: Depth, Gold with +N pops, biome chip, 3 goal pills, combo bubble, Strain gauge (green, amber, red, ticks at 50/75/90, shakes), pause button, Haul Up (64 px, subline "Keep it all · at risk N", pulses from danger level 2).
  - Haul Up reacts on pointerdown, disables at once ("Hauling…"), fires once (lock plus session guard).
  - Pause menu: Resume, Haul Up now, Quit (asks first, says the Gold is lost, calls `session.abort`). Esc, browser back and Android back open it and never leave. Space = Haul Up. Tab hidden = pause. Leaving the screen mid-drop pauses the run.
  - Toast after a reload mid-drop: "Your last drop was saved. You kept N Gold."
  - `data-tut`: `well`, `strain`, `haul`. Tutorial first-drop options are passed to `session.start`.
- Results: `screens/results.js`, `resultsReveal.js`, `styles/results.css`.
  - Staged reveal of about 2.5 s: title, depth, NEW RECORD, Gold count-up, kept/lost, Shards, goals, best gem and combo, parts used, summary. Tap anywhere skips. Buttons stay hidden until the end, so an early tap skips instead of pressing one.
  - Drop again, Home, Tweak rig. Back goes Home. `data-tut="results-gold"`. Reduce motion shows everything at once.
- Tests: `tests/ui-drop-model.test.js`, `ui-drop-controller.test.js` (includes leak tests: 50 mounts leave 0 listeners), `ui-drop-results-plan.test.js`.

## Layout check (real browser, headless Chromium)
| Screen | 320x568 | 360x640 | 390x844 | 430x932 | 844x390 | 1440x900 | Large text | Reduce motion |
|---|---|---|---|---|---|---|---|---|
| Drop | FIXED (narrow-phone HUD rule) | PASS | PASS | PASS | PASS | PASS | PASS (360, 390) | Not tested in browser (CSS only) |
| Results | PASS | PASS | PASS | PASS | PASS | PASS | PASS (360, 390) | Not tested in browser (unit tested) |
Tested with extreme data too (depth 99,999 m, gold 1e300, combo 99, long goal text, 10 parts). No sideways scroll, nothing outside the screen, no tap target under 44 px, no console errors from my files. Not tested: notch simulation, browser zoom, a real phone.

## Played in a browser
- Full drop at 360x640, 390x844, 430x932, 1440x900: Haul Up spam (20 presses) paid once, Results shown.
- Real drop to a Snap: gauge amber, red, edge pulse, gold pulse, shake, Results, Drop again.
- Esc, history back, Resume, hidden tab, Quit (with warning), Space.
- Reload mid-drop: Home loads, next Drop pays the saved run once, toast shown, new drop runs.

## What other AIs and the Manager must know
- **Audio is not wired.** `wireAudio()` and `initOnFirstGesture()` from `src/audio/wire.js` are not called anywhere (`src/main.js` is AI-1's file). Drop is silent for run events until that is added. See `docs/requests/AI-8-to-AI-1-audio-wiring.md`.
- Console warning at boot: `getSlice: "run" is not registered` (from `src/run/`, not my files).
- Two real drops with the default rig paid 0 Gold (a Snap at about 54 m). That looks like a balance or default-rig matter for the engine/run owners. The screens handle it ("No Gold to lose").
- Results appears the moment the run ends (chrome routes it), so the renderer's Haul and Snap animation is cut short. A short delay in `src/ui/flow.js wireRunEnd` would let it play.
- Drop mounts, then calls `session.start({ ...tutorial.runOptions() })`. If a drop is already going it shows the pause menu instead of starting a second one.
- `onBack()` on Drop always opens or closes the pause menu. It never leaves the drop.
