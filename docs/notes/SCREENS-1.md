# Notes — SCREENS-1 (visual pass: Crew, Workshop, Codex, Rewards, Settings, Results, Guide, modals)

I own: src/ui/screens/{crew,workshop,codex,rewards,guide,settings,results}*.js and the styles for those screens.

## Found so far (real headless Chromium, ?debug=1&fixture=busy, 360x640 / 320x568 / 430x932 / 1440x900)
- Crew and Workshop look good with the UIART-1 leather panels. No sideways scroll, no small tap targets at any of the 4 sizes (Workshop checked at all 4).
- Results has no backdrop of its own. The theme has 7 backdrops (home, rig, crew, workshop, codex, rewards, settings). Plan: use the "rewards" backdrop for Results and the "codex" one for Guide, loaded directly from theme/textures.js.
- (Resolved) Results first shot looked broken (tiny or mirrored rows, no buttons). Likely cause: src/ui/motion/results.js animates with composite "add" and scale(0) end frames. It was only slow headless timing: after 15 s the screen is fine. No bug in motion/.
- "New achievement" toast text is a fallback in src/ui/motion/wiring.js (not mine). Harmless.

## Plan (small pushes)
1. Results: backdrop, count-up for depth and shards, record banner, relic banner (from result.play.relics), chase pills.
2. Check Codex, Rewards, Settings, Guide at 4 sizes, fix what breaks.
3. Large text and Reduce motion checks.

## Log
- Push 1: notes file only (no code yet).
- Push 2: Results reward pass. Rewards backdrop with a dark veil, depth and Shards count up, gold glows when it lands, gold-ribbon record banner with a second line ("Past your best by 42 m"), relic cards (rarity colour, from result.play.relics) right under the Shards, chase lines as pills, panel material on best/parts/summary, tighter rows under 700 px height. New file screens/resultsBanners.js, tests/ui-results-banners.test.js. Preview any time: `?debug=1&screen=results&fake=full` (sample relics and chase lines, debug only). Next: Reduce motion and Large text shots of Results, then Codex, Rewards, Settings, Guide at 4 sizes.

## Tools (outside the repo)
Headless Chromium from the npm package @sparticuz/chromium + puppeteer-core in a folder outside the repo. Screenshots are slow (about 20 s each).
- Push 3: Codex materials (leather rows, metal tabs, fresh glow, tab fade). The one red test (engine-balance speed) was only my browser using the CPU; green alone.
- Push 4: Guide gets the Codex bookshelf backdrop under a dark veil. Full `npm run check` green.

## Layout check (real headless Chromium, ?debug=1)
| Screen | 320x568 extreme | 360x640 | 430x932 | 1440x900 |
|---|---|---|---|---|
| Crew | PASS | looked, PASS | looked, PASS | PASS |
| Workshop | PASS (chip row scrolls sideways by design) | looked, PASS | looked, PASS | PASS |
| Codex | PASS | looked, FIXED (flat rows, dark tab block) | not run | PASS |
| Rewards | PASS | looked, PASS | not run | PASS |
| Settings | PASS | looked, PASS | not run | PASS |
| Guide | PASS | looked, FIXED (backdrop) | not run | not run |
| Results | PASS | looked, FIXED (see Push 2) | looked, PASS | measured PASS |
"PASS" = no sideways scroll, no tap target under 44 px, no text under 12 px, no console errors.

## NOT verified (honest)
- Reduce motion and Large text in a browser. My injected settings did not take effect, so the 320 "Large text" run was really normal text. The code paths are right by reading (counters finish at once, `.rv` rows show, the gold glow is off), but nobody has looked.
- 430x932 for Codex, Rewards, Settings, Guide; 1440x900 for Guide (screenshot).
- Headless Chromium is slow under software drawing. A screenshot taken before about 15 s can show Results mid-animation (tiny or mirrored rows). That is timing, not a bug.
- The `engine-balance` speed test (under 5 ms per run) fails when the CPU is busy. It is green alone.

## For other owners
- src/ui/motion/wiring.js shows "New achievement" when no name is passed.
- src/main.js debug route cannot carry relics or chase text; I added `&fake=full` inside results.js for that.

STATUS: DONE
