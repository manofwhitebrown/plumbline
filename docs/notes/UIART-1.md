# UIART-1 notes (UI theme)

## Done so far
- Fonts: Cinzel (display) and Outfit (UI), variable woff2, Latin only, 58 KB, in public/fonts/, preloaded from src/ui/theme/index.js.
- Icons: 62 unique ids in src/ui/icons/ (merged by src/ui/icons.js; ICONS and iconHtml unchanged, plus ICON_IDS, hasIcon, aliases).
- Textures and 7 backdrops: src/ui/theme/textures.js (seeded, deterministic, safe without canvas). Backdrop layer sits beside .screen-host.
- theme.css: tokens, type, metal/leather/gold/glass, toggles, sliders, bars, tab bar, toasts, part cards, colorblind, high contrast, reduce motion.
- Wiring: one line in src/ui/index.js (`import './theme/index.js'` after polish.css). Needed so theme.css is last.
- Tests: tests/uiart-{icons,emoji,contrast,textures}.test.js.

## Findings for other owners
- Home at 360 px with big wallet numbers: the gear button overlaps the core pill (also without the theme).
- Home scene (homeScene.js) covers the Home backdrop.
- crewCard.js draws its own inline icons; icons.js has crew-* versions ready.
- index.html could carry the font preload links (now added by JS).

## Checks run (real Chromium, dev server, seeded state)
- All 7 screens at 360x640 (busy), 320x568 and 430x932 (extreme + Large text), 1440x900 (busy), 360x640 (colorblind + Reduce motion).
- No horizontal overflow and no console errors in any of them.
- Ellipsis-truncated text with the theme vs without it (320 px, Large text, extreme): never worse (Workshop 1 vs 8). Part names use the UI face, not Cinzel, so they do not get wider.
- Three visual rounds: fixed mis-sized rivets, noisy metal/leather, grey header blocks, Cinzel truncating card titles, backdrop layer being wiped by the shell.
- npm run check green (776 tests) on the pushed commit. Contrast test caught --ember at 4.43:1; fixed to #ff8a58.

## Known gaps
- Empty/locked/error illustrations exist (icons illo-empty/illo-locked/illo-error) but screen JS must call iconHtml() for them; theme.css has the .ui-state class ready.
- Home backdrop is behind the game's own SVG scene, so only the scene shows.
- On desktop the area beside the phone column is the page background (not themed).
- Pre-existing at 320-360 px with big wallet numbers: the Home gear button overlaps the core pill; "Winch Hand" and "Day 1 reward is ready" truncate in Large text (same without the theme).
- Screenshot harness used a throwaway headless Chromium outside the repo; tools/ui-preview.js renders icons and backdrops only (`node tools/ui-preview.js icons|backdrops [outDir]`).

STATUS: DONE
