# MOTION-1 notes (motion designer and gameplay programmer)

## Done
- src/ui/motion/easing.js: shared easing set (out, inOut, in, settle), cubic-bezier solver, DUR table, seg helper.
- src/ui/motion/timeline.js: createRunner (skip, speed, Reduce motion finishes instantly with the final state).
- src/ui/motion/director.js: priority queue, no overlap, dedupe window, skipGroup, audio and haptic hooks, throwing moments never block.
- src/ui/motion/transitions.js + index.js: plan() (tab fade with 12 px parallax, forward slide, back reverses, results rise, drop fade), ghost cross-fade (skipped when the old screen has a canvas), tap or key skips, springIn() for sheets and modals (panel settles, backdrop fades, blur stays static). All 220-300 ms, transform and opacity only.
- src/ui/motion/stage.js: rAF only while something plays (no idle loop, no timers), per-moment overlay layer, tap or key skips blocking cinematics without swallowing the event. index.js: beforeDrop and beforeResults, cue map using only existing sounds and buzzes (new sounds such as a thud or whoosh would be a request to the audio owner).
- tests/motion-stage.test.js.
- src/render/cinematics/biomeCard.js (1400 ms, text-only card at top:96px just under the HUD zone, light sweep, subtitles such as The Amber Veins), records.js (NEW RECORD: shockwave, unfurling ribbon, glints, 1600 ms; 50 m MILESTONE marker, 700 ms, skipped when anything else is playing). src/ui/motion/wiring.js: the director's bus listener (run:started, run:events BIOME, RECORD, MILESTONE; one card per biome per run, one record per run; events sorted so the biome card wins over a milestone on the same step). Tap or key now ends any playing moment (never swallowing the event).
- tests/motion-moments.test.js.
- KNOWN RISK: the biome card sits at top:96px, directly below the 88 px HUD zone. I could not see the real lane layout from here, so it needs a look in the lab and in the layout wall to confirm it does not cover gems near the bucket. If it does, move it to src/render/layout.js numbers (top plus bucket height) in a follow-up.
- src/render/cinematics/: pool.js (300-cap particle pool), fxLayer.js (click-through overlay canvas + grey tint layer, never takes pointer events), common.js, dropStart.js (full 1500 ms for the first 3 drops of a session, then 500 ms), haulFinish.js (900 ms), snapDrama.js (1100 ms: 80 ms freeze, 0.35x slow for 600 ms, no red, no big shake). Each calls onGo exactly once (end, skip or Reduce motion).
- tests/motion-cinematics.test.js.
- tests/motion-transitions.test.js: plan table, reduce path, skip, no listeners left after dispose, shell hook safety.
- tests/motion-core.test.js: easing maths, runner, director queue priority, skipping, reduce paths, no double plays.

- dev/motion-lab.html + dev/motion-lab.js: a button for every built moment (drop start full and quick, haul, snap, six biome cards, record, milestone, biome and milestone together, new run), real bus wiring, screen-transition demo, speed 0.25x to 2x, Reduce motion toggle, HUD-zone overlay, skip button, frame-time readout (average, 95th percentile, worst, frames over 20 ms) and a 300-particle stress button. Open with `npm run dev`, then /dev/motion-lab.html. The log shows every onGo, so a double call is visible.
- WATCHED (headless Chromium via npm, desktop CPU, software rendering): contact sheets of every moment were reviewed frame by frame at exact times (lab has `?manual=1` plus `window.__step(ms)` for deterministic captures). Fixes found and made: overlay canvas was not sized at exactly 360 x 640 (shapes stretched and cropped), the snap tint never desaturated (it is now a host sibling with a saturation blend, created only when needed), the record ribbon covered the lanes (now under the HUD zone), the achievement banner covered the Drop HUD (now under it), the daily chest lid and fly-to timing, the rope staying through the 3-2-1, the haul dead tail (800 ms now).
- MEASURED: 300 particles on screen for 6 s: average 16.7 ms, 95th percentile 16.7 ms, worst 16.8 ms, 0 of 364 frames over 20 ms. Particle update and draw cost 0.29 ms per frame. This is a desktop headless browser, not a phone: please repeat the stress button on a real mid-range phone.
- A 500 to 900 ms stall seen in the first second after page load in headless Chromium also happens with nothing playing, so it is a startup artefact. With the page settled, a moment plays with no long frames; the only cost is 2 to 4 frames of 33 to 67 ms while the overlay canvas is created.
- Browser sweep: every lab button clicked with Reduce motion off and on gave no console errors; with Reduce motion on every start callback ran at once; a duplicate blocking cinematic is refused (the caller then continues at once).
- (earlier note) NOT YET DONE: the frame-time record with 300 particles and the watch-at-slow-speed pass. There is no browser in my environment, so nobody has watched these moments yet. Please run the lab and read the Frame time panel after the stress button.

## Added in the last pass
- src/ui/motion/micro.js: button release spring (the press-in itself is polish.css), number glow pulse on counters (not on the Drop HUD), tab indicator that slides, list stagger-in (max 8, 40 ms apart), sheets and modals spring in (MutationObserver on `.scrim`). All by delegation or observation: no screen edits.
- src/ui/motion/motion.css: idle breathing on primary buttons (not on the Drop screen), progress bar shine sweep, tab indicator and glow styles. Reduce motion turns all of it off.
- src/ui/motion/results.js: Results spring choreography layered on the screen's own reveal (title and depth settle, gold ticks with a rising pitch hint, shards fly to the shard pill, done goals are stamped, buttons slide up, a tap ends it all).
- src/render/cinematics/rewards.js: daily chest (1.8 s), Collapse ceremony (2.6 s), achievement banner (2 s), codex page flip (1.6 s), first part purchase tile drop (0.9 s), shard flight (0.7 s).
- src/ui/motion/wiring.js: now also listens to achievement:unlocked, codex:new, meta:collapsed (0 Core Dust from the cheat path is ignored), meta:changed (daily chest when the streak changes and the claim is used; part drop when exactly 2 parts are owned).
- Hook requests for every owner: docs/requests/MOTION-1-to-NEW-1-results.md, -NEW-2-crew-workshop.md, -NEW-3-codex-rewards.md, -NEW-4-settings-modals.md. These list the class names and events I rely on; none needs a code edit.
- tests/motion-rewards.test.js.

## Known gaps and honest limits
- Watch pass: done in a headless desktop browser only (see above). Still needs a real phone for feel and frame times.
- Sounds: only existing audio.ui sounds (tap, open, close, claim) and buzzes are used. There is no pitch parameter, so the gold "ticking pitch" is a cue with a pitch hint that currently plays a plain tap. A real rising tick, a thud and a whoosh need a request to the audio owner.
- Targets for flying items (gold, shards, Core Dust counters) use `[data-tut="gold"]`, `.pill.gold` and similar selectors. If those do not exist the items fly to the top corners.
- Sheets and modals spring in, but there is no exit animation (the components remove the scrim at once).
- The biome card sits at top:96px under the HUD zone; check it against the real lanes.
- Daily chest, Collapse and the part drop are inferred from bus events, because no screen emits a dedicated event for them.

## Hooks in other owners' screens
1. src/ui/shell.js (3 small guarded edits): `setMotionHook(hook)` export, `motionHook.before/after` around the screen swap in go(), and back() now passes `{ replace: true, back: true }`. No API change; a throwing hook is swallowed.
2. src/ui/index.js: one line `import './motion/index.js'` that installs the hook.

3. src/ui/flow.js: `setRunEndHook(fn)` export and a 4-line change in wireRunEnd: Results is shown at once unless the hook takes over (then after the Haul or Snap cinematic). A throwing hook falls back to showing Results at once.
4. src/ui/screens/drop.js (NEW-1): import of `beforeDrop` and the last lines of mount: `controller.start(opts)` became `beforeDrop(screen, startNow, parts)`, where startNow starts the run exactly once and only if this screen is still the current controller. Any error falls back to starting at once.
5. CSS: src/ui/motion/motion.css switches off polish.css's `.screen` fade inside `.screen-host` (transitions own screen entry now, two stacked fades felt slow). polish.css itself is untouched.

Requests written: docs/requests/MOTION-1-to-Manager-hook.md (shell.js, index.js, flow.js, polish.css override) and docs/requests/MOTION-1-to-NEW-1-hook.md (drop.js).

STATUS: DONE (verified in headless desktop Chromium: frames reviewed, 60 fps held with 300 particles, no console errors, check green; a real-phone feel and frame-time check is still recommended, see Known gaps)
