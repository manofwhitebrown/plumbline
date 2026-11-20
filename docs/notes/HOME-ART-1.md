# HOME-ART-1 notes (Home screen art)

## What was done
- Home now shows the canvas scene (createHomeScene). Old SVG drawing stays only as a fallback if a canvas is missing.
- Stone well: 3-tone rounded cobbles with mortar, lit rim, deep shaft with faint glow, moss and dust.
- Wooden winch: posts, braces, beam, turning drum with coiled rope, crank, rope, hanging bucket with metal bands, lantern on the right post.
- Crew 0-8: 8 looks (crank turner, headlamp, pickaxe, rope hauler, sack carrier, waver, 2 plain). Breathing, sway, wave, crank turning, all out of sync. Rim light and soft ground shadow.
- Atmosphere: dusk sky, stars, thin moon, 3 hill ranges, village, headframe, mine cart, grass, dirt path, crates, barrels, fireflies, lantern dust, slow parallax.
- Reduce motion = still frame. Low quality = pixel ratio 1, fewer fireflies and dust, no parallax.
- Memory: about 6.5 MB at 430x932, dpr 2 (test caps at 8 MB). Tests: tests/home-art-scene.test.js.

## Files
src/render/homeScene.js, src/render/art/{homeArt,homeSky,homeGround,homeWell,crewLooks,crewDraw}.js, src/ui/screens/{home,homeScene}.js.

## Known gaps
- Previews were checked headless only (360x640, 430x932, 1440x900); not yet seen on a real phone.
- Crates and barrels can hide behind outer crew at 8 crew.
- Best flag / Drop button positions are unchanged but not re-checked on device.
