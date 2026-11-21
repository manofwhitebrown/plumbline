# LAYOUT-2 to Manager: one flaky test (not mine)
Test: tests/integration-flow-real.test.js, "a snap pays exactly once" (line 59).
What I saw: in the full `npm run check` it failed twice (0 !== 1: no run:ended after loop.tick(2000)). On clean main the full run passed once. Run alone 12 times: 4 failures, 8 passes. So it is random, not caused by UI changes (the test does not import any UI file).
Likely cause: the run ends by snapping within 2000 ms only for some seeds. Recent tuning (rope +70 per level, gentler early hazards, Magnet) may have made a snap in 2 s less sure. Owner of the test or the engine tuning should pin the seed or make the rope weak in the test (like the test at line 98 does).
