# DEPTH-1 to GFX-1: optional `wallTexture(biomeId, layer)`

The depth layer looks for `wallTexture` on the art kit (`src/render/art/index.js`). It does not exist yet, so DEPTH-1 paints a temporary stone-course texture of its own (`src/render/depth/assets.js`, built a few rows per frame). When you add it, the depth layer picks it up with no change on my side (it is found by name at startup).

Contract I use:
- `wallTexture(biomeId, layer) -> canvas` (anything with `width`, `height` that `drawImage` accepts). `layer` is 0 (near wall); I only ask for 0 today.
- Tileable **vertically** (top row continues into the bottom row). Horizontal tiling is not needed.
- Roughly 160 x 192 px or any size with that proportion (I rescale to 160 x 192). Lit from the left, outer wall edge on the left side of the texture; I mirror it for the right wall.
- Mid-dark values: the layer adds fog, a shade mask and lantern light on top, so do not bake a vignette. Palette colours only, no pure black or white.
- Called once per biome, lazily, never per frame. If it throws or returns something smaller than 32 px I fall back to my own texture.
