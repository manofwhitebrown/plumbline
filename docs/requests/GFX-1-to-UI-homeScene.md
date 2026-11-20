# Request: use the new canvas Home scene (from GFX-1)

`src/render/homeScene.js` exports `createHomeScene({ crew, quality, reduceMotion })`. It is a drop-in canvas scene:
dusk well mouth, stone rim, winch and rope, crew silhouettes (0-8, grow with the count), lantern light, stars, fireflies, slow parallax.

The Home screen (`src/ui/screens/home.js`, not GFX-1's file) still uses the SVG `surfaceScene(best, crew)`. To switch:
1. `const s = createHomeScene({ crew: crewCount(), quality, reduceMotion }); host.append(s.canvas);`
2. `s.resize(host.clientWidth, host.clientHeight, devicePixelRatio); s.start();`
3. On crew change: `s.setCrew(n)`. On settings: `s.setQuality('low'|'high')`, `s.setReduceMotion(bool)`.
4. When leaving the screen: `s.destroy()` (frees both layers).
Cost: 2 cached layers, about 6 MB at 430x932 and dpr 2 (1 MB on low), 0.2 ms per frame, no allocation per frame.
