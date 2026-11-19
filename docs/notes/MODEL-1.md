# MODEL-1 notes (software 3D baker)

## What exists
`src/render/models/`: math.js, mesh.js (mesh builder, crease-angle normals), shapes.js (lathe, tube, torus, box, ball), raster.js (z-buffered triangles),
shade.js (key + rim + fill + ambient, specular, procedural sky reflections, fake refraction and dispersion), materials.js (glass/metal/wood/stone/emissive),
render.js (frame in row slices: pass A solids + glass backs, pass B glass fronts see through to pass A), bake.js, plan.js (frame and memory budget), atlas.js,
gems.js, props.js, bucketModel.js, defs.js, index.js (`models.bake / step / getSprite / ready / setEnabled`). Tool: `tools/model-preview.js`. Tests: `tests/models-*.test.js`.

Keys: gem:1..6, ore, chest, hook, hazard:rock, hazard:void, bucket, bucket:trim. Flat, Gouraud and Phong shading all exist; gems use flat (crisp facets), smooth things use Phong.

## Contact-sheet findings (3 rounds, 24/48/96 px, dark / clay / void backgrounds)
1. Round 1: gems were washed out and pastel, void gem looked like a plain diamond with a blown-out core, rock rim was peach. Fix: tinted reflections, facet contrast from the sky, soft highlight shoulder, deeper ruby, four-horned void gem with a small core.
2. Round 2: hook too thin, rock rim still salmon. Fix: thicker tube and ring, darker rock, redder rim.
3. Round 3: at 24 px all six gems have different silhouettes (tall hexagon, wide step-cut, teardrop, round brilliant, spiky void, triangle) and distinct hues. Rock keeps a red-orange rim on dark and clay. No muddy or noisy sprites seen. Weakest: ruby and emerald are both wide; colour and the pointed base tell them apart.

## Numbers (Node, this dev machine; not a phone)
- Full bake of 12 models, 41 css px items at dpr 2: about 0.5 s total, 5.2 MB atlas (cap 12 MB). Per-frame slice default 5 ms, 1.5-3 ms when the game is slow.
- Frame counts cut from the brief's 24/16 to 8-16 (symmetric gems repeat sooner, sphere needs 1) to hit the time budget. Bucket is baked at 1x supersampling; items at 2x.
- NOT done: a real browser/phone frame-time check with 40 gems on screen. I had no browser here. Please run `npm run dev` and watch `debugStats().frameMs`. A mid phone is likely 3-4x slower than this machine, so the 600 ms total bake target is probably missed (about 2 s), though it is spread over slices of 5 ms.
- Not done: a handle arch on the bucket (two side ears only, so the sprite keeps its size); `models.noteFrame` is not called by the renderer yet.

## Notes
Deterministic: same seed gives the same pixels (tested). The prism and chest/hook swing instead of spinning. Hazard void orb is violet-rimmed; the old red warning glow is still drawn under it.
