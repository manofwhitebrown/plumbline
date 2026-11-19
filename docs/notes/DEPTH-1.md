# DEPTH-1 notes (shaft depth layer)

## Done
- `src/render/depth/`: `index.js` (createDepth), `walls.js` (mode-7 slices, far wall, ribs, door rings, shade, fog, light), `assets.js` (textures with 3 mips, rings, lobes, pulses, shade mask; built in small steps), `foreground.js` (silhouettes placed purely by depth, lane erase mask), `silhouettes.js` (roots, stalactites, crystals, pipes, ladders, planks), `camera.js`, `light.js`, `math.js`, `constants.js` (all tuning in one file).
- Hook in `src/render/index.js` (see `docs/requests/DEPTH-1-to-NEW-7-hook.md`), request to GFX-1 for `wallTexture`.
- Tests `tests/depth-*.test.js` (math and seams, layer behaviour, foreground safety), tool `tools/depth-preview.js`.

## Status
IN PROGRESS: preview rounds, frame time and final notes still to do.
