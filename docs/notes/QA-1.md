# QA-1 notes

- Real browser: YES. Headless Chromium 153 works here (puppeteer-core + @sparticuz/chromium, run from a scratch folder). I use `vite preview` on the built game.
- Done: swept all 10 screens at 320x568 with the `busy` fixture. No console errors, no NaN/undefined text, no sideways scroll, no tap target under 44 px found by script.
- Fixed (file owner: MOTION-1, src/ui/motion/index.js, 2 lines): the achievement pop-up always said "New achievement" and the Codex pop-up "New entry", because the lookup used api.achievements / api.codex which do not exist (real ones are api.meta.achievements / api.meta.codex). I saw it fixed: pop-up now shows "Gear Head".
- Next: other sizes (360x640, 430x932, 1440x900), full playthrough (Workshop buy, Rig place/save/load, real Drop, Haul Up, Snap, Collapse), Large text, then the Top 15 report in docs/qa/QA-1.md.

- Pass 2: looked at 320x568, 360x640 and 1440x900 screenshots; wrote docs/qa/QA-1.md (9 problems seen, 1 fixed), dev/qa/sweep.mjs + README. Splash slowness was the sandbox GPU, not the game.
- Still to do: full playthrough, Snap, Collapse, Large text, 430x932 screenshots, finish Top 15, fix small items 4-7.
- Pass 3: new-save first launch. Found and fixed (owner AI-8, src/tutorial/overlay.js, 1 line): an empty gold button next to Skip on action steps like "Tap Drop." I saw it gone after the fix. Open: that tutorial box covers the two hint lines under the well on Home at 360x640.
STATUS: NOT DONE (playthrough continues: first Drop on a new save, Haul Up, Crew, Workshop, Rig, Snap, Collapse)
