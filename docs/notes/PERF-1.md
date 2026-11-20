# PERF-1 notes (frame-time governor, texture budget)

- Push 3: src/render/governor.js (pure tier ladder: step down in about 1 s, up slowly with doubling wait) + tests/perf-governor.test.js. Not wired yet.
- Push 4: governor wired into render/index.js (depth level, baking pause, particle share, polish low at reduced). Bug fixed: Drop passed 'auto' and the renderer locked it to 'high', so auto-downgrade never ran; now 'auto' keeps the governor on, 'high'/'low' are the player's choice. Baker pauses when disabled. tests/perf-renderer.test.js.
