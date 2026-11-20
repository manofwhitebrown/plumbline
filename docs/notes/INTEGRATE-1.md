# INTEGRATE-1 notes (render integration pass)

## Pushed so far
- Push 1: double drawing removed (details below), Home props moved in front of crew (8 crew), tools/render-sheet.js and tools/home-sheet.js.

## Decisions (same text goes into docs/manager/RENDER_ARBITRATION.md)
- Flat well is skipped while the depth walls are opaque (`depthLayer.covering`: drawn last frame and faded fully in). It still draws as the exact fallback.
- polish.drawBack(ctx, pst, covered): when depth covers, polish skips its full-screen biome blend (it painted up to 90% over the depth stone near edges: walls vanished) and its flat wall strips (depth wall texture and silhouettes carry the detail).
- Flat well lost its own cone, hanging decor (wellDecor.js deleted) and dust motes: polish owns cone, wall detail and ambience.
- RECORD: renderer keeps world sparks and confetti; ring, second ring and gold flash dropped (record cinematic has ring, glow, ribbon). MILESTONE: world glint line dropped (cinematic marker). HAUL cinematic: fake rope, glyph bucket and golden streak dropped (renderer draws the real ones). SNAP cinematic: whip line and fibres dropped (renderer has rope.snap and fibre bursts). SNAP flash is palette white at 0.4 (was pure white 0.55).
- Baked rock and void orb: red warning glow halved (they have their own rim).
- Home crates and barrels stand on the ground in front of the crew's feet (`propSpots`, tested against 8 crew at 5 sizes).

## Not done yet
- Answer and delete the 12 files in docs/requests/ and log them in RENDER_ARBITRATION.md.
- More dead code (unused exports list from the scan), parts sheet check, 1440x900 sheet.
- Not measured on a phone.
