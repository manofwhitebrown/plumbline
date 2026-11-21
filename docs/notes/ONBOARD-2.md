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

- DONE (tests pass, NOT yet seen in browser): src/tutorial: note on the free side per step, compact one-row box, hides while a pop-up shows, waits for buttons to hold still, Results steps merged into one, new way-outs (Workshop with no Gold, dropping again). tests/onboard-place.test.js.
STATUS: NOT DONE (work in progress)

## Real-browser pass 2 (headless Chromium, 360x640, 21 Nov 2026)
- SEEN on screen: Tap Drop, Gems rise, Rope tighter, Tap Haul Up, That is your Gold (Results), Open the Workshop, Buy your first part, Now open the Rig, Put your new part on the bucket.
- FIXED: Results note gave up after 40 s on a slow screen (now waits up to 60 s / 120 s). Rig step: the new Part was below the visible area and the ring landed on the Crew tab; the guide now scrolls it into view once. Tests added in tests/onboard-place.test.js.
- NOT SEEN: second Drop, Crew and Workshop closing notes, 320x568, 430x932, Large text, Reduce motion.
- OPEN: a stray tall ring beside the Magnet on the Rig step; PLAY.md recheck against Contracts, Daily Dive, Mastery, Relic Wall, Looks.

## Pass 3
- DONE: PLAY.md now covers Contracts, Daily Dive, Mastery, Relic Wall, Looks (594 words, test passes).
- SEEN: Home at 320x568 and 430x932 with Large text: no sideways overflow, hint line wraps to two lines and fits. The Home "i" tip was not opened this pass (ONBOARD-1 saw tips open at all sizes).
- NOT SEEN: second Drop, Crew and Workshop closing notes; stray ring beside the Magnet on the Rig step.
STATUS: NOT DONE (second Drop to end not seen on screen)
