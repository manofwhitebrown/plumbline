# MOTION-1 takeover notes (DEPTH-1 verification, HOOK-1 wave 1 and 2 checks, wave 2 items)

Asked by the owner to verify waves 1 and 2 and finish DEPTH-1 and HOOK-1 wave 2.

## Claim (so two sessions do not collide)
- Other HOOK-1 session keeps: item 10 mastery, item 6 relic collection and the Relic wall, all of `src/engine/play/*`, picker, spawn fairness.
- This session takes: item 7 cosmetics, item 8 contracts, item 9 daily dive, in files named `*cosmetics*`, `*contracts*`, `*dive*`.

## Verified in a real browser (headless Chromium, 360x640, real game at /)
- Home loads, no console errors. Drop: cinematic plays then the run starts once; wall textures, rig, rope, depth layer, Brace and Surge buttons, goal pills and Haul Up all draw.
- Boon picker appears at 100 m (status `choosing`), three cards with rarity, tags and timer ring, picking resumes the run. Encounter banner (Gem Vein ahead!), x2 chip, chase pills, `view.chase` and `view.play` all present.
- Snap run (no cheats): run ends, Results follows after the snap cinematic.
- DEPTH-1: depth layer on versus off (quality high vs low) gives the same frame times in this browser (95th percentile 16.8 ms both). CPU profile of a drop: main thread about 84 percent idle, `drawImage` about 94 ms over 11 s. Still not a phone measurement.
- Software-rendered headless frames can stall for seconds; the profile shows idle main thread, so that is the browser, not the game.

## Found
- Biome title card stacked on the boon picker at 100 m: fixed (card waits until the picker closes).
- Goal pills at the top are truncated ("Reach a ...", "Collect 18 ge...") and the "m to the next Biome" chase pill overlaps the rig frame corner. Not fixed yet (owners: NEW-1 and HOOK-1 wave 2).

STATUS: written by FINAL-3. The author did not leave a status line, so this is not a claim that the work was finished. Check the repo and docs/AUDIT.md for what is verified.
