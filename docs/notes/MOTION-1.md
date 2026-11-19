# MOTION-1 notes (motion designer and gameplay programmer)

## Done
- src/ui/motion/easing.js: shared easing set (out, inOut, in, settle), cubic-bezier solver, DUR table, seg helper.
- src/ui/motion/timeline.js: createRunner (skip, speed, Reduce motion finishes instantly with the final state).
- src/ui/motion/director.js: priority queue, no overlap, dedupe window, skipGroup, audio and haptic hooks, throwing moments never block.
- tests/motion-core.test.js: easing maths, runner, director queue priority, skipping, reduce paths, no double plays.

## In progress / Next
- transitions.js (shell.go hook), dropStart, haul finish, snap drama, biome card, record and milestones.
- Results choreography, reward moments, micro-interactions.
- Bus wiring in the director (run:started, run:events, run:ended, meta:changed, achievement:unlocked, codex:new).
- dev/motion-lab.html (+ js) with a button per moment, speed slider, Reduce motion toggle, frame-time readout.

## Hooks in other owners' screens
None yet.

STATUS: IN PROGRESS
