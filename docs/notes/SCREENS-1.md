# Notes — SCREENS-1 (visual pass: Crew, Workshop, Codex, Rewards, Settings, Results, Guide, modals)

I own: src/ui/screens/{crew,workshop,codex,rewards,guide,settings,results}*.js and the styles for those screens.

## Found so far (real headless Chromium, ?debug=1&fixture=busy, 360x640 / 320x568 / 430x932 / 1440x900)
- Crew and Workshop look good with the UIART-1 leather panels. No sideways scroll, no small tap targets at any of the 4 sizes (Workshop checked at all 4).
- Results has no backdrop of its own. The theme has 7 backdrops (home, rig, crew, workshop, codex, rewards, settings). Plan: use the "rewards" backdrop for Results and the "codex" one for Guide, loaded directly from theme/textures.js.
- Results first shot looked broken (tiny or mirrored rows, no buttons). Likely cause: src/ui/motion/results.js animates with composite "add" and scale(0) end frames. Needs a longer-wait shot and a Reduce motion shot to tell slow headless timing from a real bug. NOT yet confirmed. If real, it is in motion/ (not my files): I will write a request.
- "New achievement" toast text is a fallback in src/ui/motion/wiring.js (not mine). Harmless.

## Plan (small pushes)
1. Results: backdrop, count-up for depth and shards, record banner, relic banner (from result.play.relics), chase pills.
2. Check Codex, Rewards, Settings, Guide at 4 sizes, fix what breaks.
3. Large text and Reduce motion checks.

## Log
- Push 1: notes file only (no code yet).

## Tools (outside the repo)
Headless Chromium from the npm package @sparticuz/chromium + puppeteer-core in a folder outside the repo. Screenshots are slow (about 20 s each).
