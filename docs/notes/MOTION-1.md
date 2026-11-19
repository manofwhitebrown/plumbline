# MOTION-1 notes (motion designer and gameplay programmer)

## Done
- src/ui/motion/easing.js: shared easing set (out, inOut, in, settle), cubic-bezier solver, DUR table, seg helper.
- src/ui/motion/timeline.js: createRunner (skip, speed, Reduce motion finishes instantly with the final state).
- src/ui/motion/director.js: priority queue, no overlap, dedupe window, skipGroup, audio and haptic hooks, throwing moments never block.
- src/ui/motion/transitions.js + index.js: plan() (tab fade with 12 px parallax, forward slide, back reverses, results rise, drop fade), ghost cross-fade (skipped when the old screen has a canvas), tap or key skips, springIn() for sheets and modals (panel settles, backdrop fades, blur stays static). All 220-300 ms, transform and opacity only.
- src/ui/motion/stage.js: rAF only while something plays (no idle loop, no timers), per-moment overlay layer, tap or key skips blocking cinematics without swallowing the event. index.js: beforeDrop and beforeResults, cue map using only existing sounds and buzzes (new sounds such as a thud or whoosh would be a request to the audio owner).
- tests/motion-stage.test.js.
- src/render/cinematics/: pool.js (300-cap particle pool), fxLayer.js (click-through overlay canvas + grey tint layer, never takes pointer events), common.js, dropStart.js (full 1500 ms for the first 3 drops of a session, then 500 ms), haulFinish.js (900 ms), snapDrama.js (1100 ms: 80 ms freeze, 0.35x slow for 600 ms, no red, no big shake). Each calls onGo exactly once (end, skip or Reduce motion).
- tests/motion-cinematics.test.js.
- tests/motion-transitions.test.js: plan table, reduce path, skip, no listeners left after dispose, shell hook safety.
- tests/motion-core.test.js: easing maths, runner, director queue priority, skipping, reduce paths, no double plays.

## In progress / Next
- Wire springIn into components/sheet.js and modal.js (hook request, see below), tab indicator slide. Then director bus wiring for the remaining moments (the drop start, haul and snap hooks are done), haul finish, snap drama, biome card, record and milestones.
- Results choreography, reward moments, micro-interactions.
- Bus wiring in the director (run:started, run:events, run:ended, meta:changed, achievement:unlocked, codex:new).
- dev/motion-lab.html (+ js) with a button per moment, speed slider, Reduce motion toggle, frame-time readout.

## Hooks in other owners' screens
1. src/ui/shell.js (3 small guarded edits): `setMotionHook(hook)` export, `motionHook.before/after` around the screen swap in go(), and back() now passes `{ replace: true, back: true }`. No API change; a throwing hook is swallowed.
2. src/ui/index.js: one line `import './motion/index.js'` that installs the hook.

3. src/ui/flow.js: `setRunEndHook(fn)` export and a 4-line change in wireRunEnd: Results is shown at once unless the hook takes over (then after the Haul or Snap cinematic). A throwing hook falls back to showing Results at once.
4. src/ui/screens/drop.js (NEW-1): import of `beforeDrop` and the last lines of mount: `controller.start(opts)` became `beforeDrop(screen, startNow, parts)`, where startNow starts the run exactly once and only if this screen is still the current controller. Any error falls back to starting at once.
5. CSS: src/ui/motion/motion.css switches off polish.css's `.screen` fade inside `.screen-host` (transitions own screen entry now, two stacked fades felt slow). polish.css itself is untouched.

Requests written: docs/requests/MOTION-1-to-Manager-hook.md (shell.js, index.js, flow.js, polish.css override) and docs/requests/MOTION-1-to-NEW-1-hook.md (drop.js).

STATUS: IN PROGRESS
