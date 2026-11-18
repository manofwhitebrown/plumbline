# AI-2 to Manager: polish ideas for the look and feel

I own only the engine, so I did not touch `src/render/` or `src/ui/`. These ideas use events the engine already sends. Please hand them to AI-6 and AI-7.

## Gradients and colour (AI-6 / AI-7)
- Blend the biome gradient into the next one over the last 15 m before a BIOME event, so the colour never jumps.
- Add a soft vignette that gets darker with depth, and a warm glow around the bucket that follows the lantern.
- Tint the strain gauge with a smooth gradient (green, amber, red), not three hard steps.

## Motion (AI-6)
- COLLECT: a short pop and a gold number that floats up. The pitch and size grow with `combo`.
- CHAIN: draw a bright line that fades over about 160 ms from the `from` cell to the `to` cell.
- HAZARD with `absorbedBy`: a ring flash on that cell. Without it: a small rope shake that grows with `strainDelta`.
- MILESTONE: a thin light band sweeps across the well. SNAP: freeze for 80 ms, then a crack flash.
- Use `alpha` from the loop to slide items between beats so they move smoothly at 60 fps.

## Icons (AI-6)
- One consistent line weight and a rounded end on all part icons. A soft inner gradient per family: collector gold, processor blue, defense green, engine ember, special violet.

## Layout (AI-7)
- HAUL UP: use `riskInfo.beatsToSnap` to pulse faster as the rope nears the limit (999 means calm).
- Show `peekNext` rows as faint ghost items above the bucket when a Lantern is in the rig.
