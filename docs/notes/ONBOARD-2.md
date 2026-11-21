# ONBOARD-2 notes

Job: play the tutorial on a brand-new save in a real browser, fix every step, move the box off the things the player needs (QA-1 problem 11), check help tips, PLAY.md.

## Seen in a real browser (headless Chromium, 360x640, real touch taps, 21 Nov 2026)
- Steps seen: Tap Drop, Gems rise, Rope tighter, Tap Haul Up, That is your Gold, Tap Home.
- Problem 11 seen again: the box covers the hint lines on Home, and "Tap Home." sits on top of Drop again.
- The ring for "Gems rise" is the whole screen; the ring for "That is your Gold" is a tiny circle; the Results steps show before the buttons have stopped moving.
- ONBOARD-1 never saw the later steps because a tap on Home on Results misses (see docs/requests/ONBOARD-2-to-MOTION-button-release.md). The tutorial then waited 30 s and jumped to the end.
- Not yet seen: Workshop, buy a Part, Rig, second Drop, Crew note, Workshop note.

## Plan
1. DONE: request to MOTION about the shrinking button.
2. NEXT: src/tutorial: wait for a target that is visible and still; box on the free side per step; one row layout; merge the two Results steps; let steps move on when the player takes another path.
3. NEXT: replay at 360x640, 320x568, 430x932; help tips with Large text; PLAY.md; tests.

STATUS: NOT DONE (work in progress)
