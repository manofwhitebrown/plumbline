# LAYOUT-2 notes
Owner of: Rig, Workshop, Rewards, Crew, Results screens (JS + their CSS). Tasks: QA-1 problems 2, 5, 6, 7.
Browser: real headless Chromium (puppeteer-core), dev server, busy test save. Pictures kept in a scratch folder, not in the repo.

## Log
- Problem 2 (Rig bar) FIXED. The Suggest / Clear / Drop bar was sticky and sat on top of the content. Now the content scrolls inside its own area (.rig-scroll) and the bar is a separate row under it. Nothing can sit under the bar at any size. SAW it at 360x640 (the three (i) help buttons are fully above the bar; script says 0 covered items) and 1440x900 (0 covered). The tab bar under the screen already pads the home bar, so the safe area is not added twice. Large text and the 40 px notch: not seen yet.
- Next: problems 5, 6, 7, then re-check all four sizes with Large text and 40 px notch.

## Note for Manager
`tests/integration-flow-real.test.js` "a snap pays exactly once" is flaky: it fails about 4 runs in 12 when run alone, without any of my files involved (it does not import the UI). Not mine. See docs/requests/LAYOUT-2-to-Manager-red.md.
- Problem 5 FIXED. Rewards heading "Day 1 reward is ready" and Crew names now wrap to two lines (class clamp2) instead of ending in "…". The Crew "Owned 12 · x2 output" line wraps too. SAW both at 320x568 (before: "Day 1 reward is re…", "Winch H…"; after: full text on two lines). Limit 22 kept.
- Problem 6 FIXED. Workshop and Rig filter chip rows scroll sideways with a soft fade on the right edge and extra end padding, so the last chip shows half-faded and can scroll clear. SAW at 320x568 on both (before: 'Processors' hard-cut, no hint; after: faded edge, 'Defe' half chip on Rig).
