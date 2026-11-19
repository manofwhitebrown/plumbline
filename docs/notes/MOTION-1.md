# MOTION-1 notes (motion designer and gameplay programmer)

## Done
- src/ui/motion/easing.js: shared easing set (out, inOut, in, settle), cubic-bezier solver, DUR table, seg helper.
- src/ui/motion/timeline.js: createRunner (skip, speed, Reduce motion finishes instantly with the final state).
- src/ui/motion/director.js: priority queue, no overlap, dedupe window, skipGroup, audio and haptic hooks, throwing moments never block.
- src/ui/motion/transitions.js + index.js: plan() (tab fade with 12 px parallax, forward slide, back reverses, results rise, drop fade), ghost cross-fade (skipped when the old screen has a canvas), tap or key skips, springIn() for sheets and modals (panel settles, backdrop fades, blur stays static). All 220-300 ms, transform and opacity only.
- tests/motion-transitions.test.js: plan table, reduce path, skip, no listeners left after dispose, shell hook safety.
- tests/motion-core.test.js: easing maths, runner, director queue priority, skipping, reduce paths, no double plays.

## In progress / Next
- Wire springIn into components/sheet.js and modal.js (hook request, see below), tab indicator slide. Then dropStart, haul finish, snap drama, biome card, record and milestones.
- Results choreography, reward moments, micro-interactions.
- Bus wiring in the director (run:started, run:events, run:ended, meta:changed, achievement:unlocked, codex:new).
- dev/motion-lab.html (+ js) with a button per moment, speed slider, Reduce motion toggle, frame-time readout.

## Hooks in other owners' screens
1. src/ui/shell.js (3 small guarded edits): `setMotionHook(hook)` export, `motionHook.before/after` around the screen swap in go(), and back() now passes `{ replace: true, back: true }`. No API change; a throwing hook is swallowed.
2. src/ui/index.js: one line `import './motion/index.js'` that installs the hook.

Requests written: docs/requests/MOTION-1-to-Manager-hook.md (shell.js, index.js).

STATUS: IN PROGRESS
