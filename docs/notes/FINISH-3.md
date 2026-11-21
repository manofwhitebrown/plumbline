# FINISH-3 notes (finishes HOOK-3 and PERF-2)

## Done
- Found: the Wall and Looks panels (codexWall.js) were never shown, the Codex had no tabs for them. Added Wall and Looks tabs to src/ui/screens/codex.js (small guarded hook, Codex file is NEW-3's; Wall and Looks tabs have a gold dot when something is new).
- Six tabs did not fit one row at 320 px (labels cut, tabs 41 px wide). wall.css now puts them in two rows of three (91 px wide, 48 px high at 320).
- Looks picker now has a live preview picture (cosmeticsHook.paintPreview, drawn once per tap, not per frame). Tap a Look to see it, Wear keeps it.
- Saw it work in a real headless Chromium at 320x568, 360x640, 430x932: Wall at 0, 12, 36 found, Looks with preview, no sideways scroll, no console errors.
