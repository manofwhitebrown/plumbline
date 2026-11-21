# QA-1 report (partial: first real-browser pass)

Browser: real headless Chromium 153 (puppeteer-core). Test save: `busy` fixture. Built game via `vite preview`.
Honest scope: I SAW screenshots for 10 screens at 320x568, and for home/workshop/rig/drop/results/crew/codex/rewards at 360x640 (settings/guide measured only), 430x932 (measured only for most; looked at none), and home/rig/drop/results at 1440x900 (others measured only). No full playthrough yet (no Workshop buy, no Rig place/save/load, no real Drop to Haul, no Snap, no Collapse). Large text, Reduce motion, rotate: NOT tested. This is NOT the Top 15; it is the 9 problems I have actually seen.

Measured by script on every screen/size that loaded: no console errors or warnings, no failed requests, no NaN/undefined text, no sideways scroll, no tap target under 44 px.

## Problems seen
1. FIXED (medium) Achievement and Codex pop-ups always said "New achievement" / "New entry". Cause: lookup used api.achievements / api.codex (do not exist; real: api.meta.*). Fixed in src/ui/motion/index.js (owner MOTION-1, 2 lines). Saw it: pop-up now says "Gear Head".
2. OPEN (medium) Rig, 360x640 and 1440x900: the pinned Suggest / Clear / Drop bar sits on top of the scrolled content at the first view. At 360x640 it covers the "Loadouts (i)", "Suggest (i)" and "Combo (i)" help buttons (they overlap the bar by ~20 px); at 1440x900 it cuts across the parts tray cards. Content is reachable by scrolling (screen is 858 px in 583 px). Owner: UI (src/ui/screens/rig.js). Needs a layout call (more bottom padding or move the tray above the helps).
3. OPEN (medium) Achievement pop-up stays on screen for more than 4 s on Crew, Rewards, Codex and Results and covers the screen title (Crew header, "Rewards", "Depth"). On Drop it is placed lower and covers the top of the well. Test fixture unlocks one at boot so real play may show it less often; I did not check ACH_MS. Owner: MOTION-1.
4. OPEN (low-medium) Drop goal chips are cut with "…" so they say nothing: "Reach 17…", "Reach 46…", "Reach a C…" (320), "Strain under…", "Reach 250 …" (360). Owner: Drop HUD. Wrap to two lines or shorten wording (goal text limit is 28).
5. OPEN (low) 320x568 only: Rewards heading "Day 1 reward is re…" and Crew name "Winch H…". Fit at 360.
6. OPEN (low) Workshop and Rig filter chips run off the right edge (320: "Processors" clipped; 360: "D…"). Probably a sideways scroll row, but nothing hints there are more.
7. OPEN (low) Results at 360x640: another card peeks out behind the Drop again button.
8. NOTE (design) 1440x900: the game is a centered narrow column as required; left and right are plain dark. Art direction call whether to add side art.
9. NOTE The busy fixture opens Welcome back on every debug jump; it covers the first screenshot (expected, my script clicks Claim).

## Things I saw working
Home and Results look polished. Rig tray now shows owned parts (the old empty-tray bug is gone). Drop shows real gems and ore rising and a "+1" pick-up. Haul Up (debug results) shows Results.

## Environment notes (not game bugs)
In this sandbox the splash took 7-18 s with GPU rendering on and about 1 s with --disable-gpu, and a 1440x900 capture killed the browser with GPU on. I treat both as the sandbox. One "detached Frame" error on the Guide did not repeat in two re-runs; unexplained.
