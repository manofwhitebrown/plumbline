# PERF-2: frame times (real headless Chromium)

## How this was measured (read this first)
- Tool: `dev/perf-run.js` (setup lines at its top). Page: `dev/perf-lab.html`. Chromium 153 headless, 360x640 at pixel ratio 2, Chrome DevTools CPU slowdown 4x and 6x.
- Scene: one scripted Drop on the real renderer, every step a full row of gems and dangers, a full rig, chains and hits, strain 82%, particles held at 300. The renderer has no boss picture, so this worst-case row stands in for "boss or encounter on screen". 5 s warm-up not counted, then 10 s counted per run (about 10 s is NOT a full 45 to 90 s Drop; the lab can do 90 s with `--seconds 90`).
- Canvas: `--canvas cpu` (canvas drawn by the CPU). The sandbox has ONE CPU core and no GPU, so every number is much worse than a real phone. Use them to compare before and after, NOT as phone speed. The target (p95 under 16.7 ms at 4x on low, under 25 ms on high) CANNOT be judged here: even low quality has a floor of about 130 ms in this sandbox, and the game's own drawing code takes only 0.5 ms of that.
- "gap" = time between frames (what a player feels). "draw" = time the game's drawing calls took.
- quality low / high = a hand-picked level (governor off); auto = governor on.

## BEFORE (main at 9bb6b59), all numbers in ms
| slowdown | quality | biome | gap median | gap p95 | gap worst | draw median |
|---|---|---|---|---|---|---|
| 4x | low | clay | 133.3 | 183.3 | 200.1 | 0.5 |
| 4x | low | quartz | 133.3 | 183.4 | 216.6 | 0.6 |
| 4x | low | amber | 133.3 | 183.3 | 183.4 | 0.5 |
| 4x | low | magma | 133.4 | 183.4 | 249.9 | 0.6 |
| 4x | low | void | 133.4 | 200 | 216.6 | 0.6 |
| 4x | low | abyss | 133.3 | 183.4 | 249.9 | 0.6 |
| 4x | high | clay | 233.3 | 266.7 | 333.3 | 53.8 |
| 4x | high | quartz | 233.4 | 316.7 | 350 | 58.3 |
| 4x | high | amber | 216.7 | 316.5 | 333.3 | 46.4 |
| 4x | high | magma | 216.7 | 283.3 | 316.7 | 47.5 |
| 4x | high | void | 216.7 | 266.8 | 316.6 | 48.4 |
| 4x | high | abyss | 233.4 | 283.3 | 333.3 | 61.7 |
| 4x | auto | clay | 250 | 300 | 300.1 | 56.3 |
| 4x | auto | quartz | 249.9 | 300 | 366.7 | 62.1 |
| 4x | auto | amber | 216.8 | 283.3 | 350.1 | 49.5 |
| 4x | auto | magma | 200.1 | 283.2 | 283.3 | 43.7 |
| 4x | auto | void | 216.7 | 266.6 | 266.7 | 50.2 |
| 4x | auto | abyss | 233.3 | 283.4 | 316.7 | 59.2 |
| 6x | low | clay | 199.9 | 250 | 266.6 | 0.6 |
| 6x | low | quartz | 200 | 250 | 333.3 | 0.6 |
| 6x | low | amber | 199.9 | 249.9 | 283.3 | 0.6 |
| 6x | low | magma | 183.4 | 233.4 | 250 | 0.6 |
| 6x | low | void | 183.3 | 249.9 | 266.7 | 0.6 |
| 6x | low | abyss | 200 | 250 | 266.6 | 0.7 |
| 6x | high | clay | 350 | 450 | 466.7 | 75 |
| 6x | high | quartz | 366.7 | 466.6 | 483.4 | 85.5 |
| 6x | high | amber | 383.3 | 433.4 | 450 | 84.1 |
| 6x | high | magma | 349.9 | 483.3 | 500 | 75.2 |
| 6x | high | void | 349.9 | 416.7 | 433.3 | 79.3 |
| 6x | high | abyss | 383.2 | 449.9 | 466.7 | 85.6 |
| 6x | auto | clay | 333.4 | 433.4 | 483.2 | 81.8 |
| 6x | auto | quartz | 350 | 400 | 450.1 | 86.2 |
| 6x | auto | amber | 383.3 | 433.4 | 433.4 | 77.8 |
| 6x | auto | magma | 350 | 516.7 | 549.9 | 76.6 |
| 6x | auto | void | 350 | 433.4 | 450 | 81.6 |
| 6x | auto | abyss | 416.7 | 599.9 | 600 | 89.9 |

## What the numbers say
- High costs about 100 ms more per frame than low at 4x (gap median about 225 vs 133). Depth layer (CPU canvas, 1x, clay, high) alone: median 22.6 ms; the camera blit is 10.7 of that, foreground silhouettes 3.5, lights 2.9, fog 2.0, everything else under 1.5 each. Medium: 10.5 ms total (blit 5.4, foreground 3.6).
- Auto mode did not help: it ended on 'high' (or fell straight to low) in every biome. Cause: quality.js drops layers after 2 s of slow frames and then jumps to low, while the governor needs 45 frames (about 11 s at these speeds) before it moves at all, and nothing ever raises quality again after quality.js went to low.
- Sandbox artifact: with `--canvas gpu` (Chromium's software GPU) single frames stall for 9 to 27 s inside one raster flush; not a game problem.
