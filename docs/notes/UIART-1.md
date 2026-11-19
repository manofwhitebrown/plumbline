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

## Not done yet
- Previews at 430x932 and 1440x900, extreme state, Large text, colorblind, Reduce motion.
- Empty/locked/error illustrations are in icons.js (illo-*) but no screen uses them yet (needs screen JS).

STATUS: IN PROGRESS
