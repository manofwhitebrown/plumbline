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

## Pass 4 (finish, 21 Nov 2026)
- SEEN (headless Chromium, real touch taps, brand-new save, 360x640, 320x568, 430x932): the whole tutorial from Tap Drop to "Go deeper": Drop, Gems rise, Rope tighter, Haul Up, Gold and Home, Workshop, Buy, Rig, place the part, second Drop, Crew note, Workshop note, final. 13 steps, no console errors, no NaN text.
- FOUND AND FIXED: on the Rig step the guide scrolls the new part into view, which pushed the grid square off the top; its ring was drawn out of sight, and at 320x568 the step timed out and skipped to the end. Now the part ring shows first and the square ring only after the part is picked (src/tutorial/target.js, test added in tests/onboard-place.test.js). Seen: Magnet ringed at 320, then the next step.
- SEEN: the Home notes sit above the well and no longer cover the hint lines (QA-1 problem 11 is fixed). The stray tall ring beside the Magnet was this bug.
- NOTE: on "That is your Gold. Tap Home." the ring is on the Gold row, the words say Home; a tap on Home works. Left as is.
- NOT SEEN: tutorial with Large text on, tutorial with Reduce motion on.
- SEEN later the same day: the whole tutorial (13 steps) with Large text on and with Reduce motion on, at 360x640 and 320x568, no errors. In Large text the Crew note is three lines high and still clears the hint lines and the Drop button.
- SEEN: "+1 Shard" and "+2 Shards" on Results (plural words are right).
STATUS: DONE
