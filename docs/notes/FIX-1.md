# FIX-1 notes

Job: the ci workflow failed on about half of the pushes in "Run npm run check" (4 of the last 20 runs: 4dfb5e6, b5f238b, 8d9f9a4, 99fb6f7; each failed after about 80 s, so tests, not a timeout), while it passes on a laptop.

## Flaky tests found
1. tests/hook3-render.test.js, "no per-frame allocation (gradients are built once; heap stays flat)".
   - Cause: it read process.memoryUsage().heapUsed with no garbage collection in between. Short-lived garbage from 20000 frames counted as growth whenever a big collection had not run yet. Seen: 6.93 MB against a 6 MB limit (normal runs sit just under it).
   - Fix: force garbage collection before and after, measure only what is still alive, best of 3 rounds, limit 2 MB. The "no new gradients per frame" check is unchanged. Reason for the new limit: retained memory after a collection is the real leak signal; garbage per frame was never measurable with heapUsed.
   - Failure rate before: about 2 of 8 runs on a 1-core machine.

2. tests/integration-flow-real.test.js, "a snap pays exactly once" (and the same shape in "auto-haul: the session hauls at the chosen strain level").
   - Cause: session.start() with no seed takes its seed from the clock. In about 1 of 4 seeds (45 of 150 checked) the drop stops at depth 100 and waits for the player to pick a boon; the test never picks, so the run never ends (checked up to 40000 ticks). Failed 2 of 12 standalone runs, and once in a full npm run check. The game itself is fine: a real player picks or the offer times out.
   - Fix: both tests start with a fixed seed and play: false (boon offers off). All 300 seeds checked snap with that setting. Nothing loosened: the same assertions still run.
   - After the fix: 40 of 40 standalone runs green.
   - Also repeated 12 times each, all green: hook-session, run-session, run-random, integration-balance.

## Checked and not reproduced
uiart-textures, integration-suggest, perf-texture-budget, perf-foreground-patch, engine-balance (already best of several), motion-rewards, core-save: run under 4 busy loops and with a clock sped up 8x and 30x. Only engine-balance failed, at the unrealistic 30x.

## Runs repeated
- Every test file run alone, 4 rounds (604 file runs): the only failure was hook3-render in round 1, before the fix.
- Full npm test once (1010 tests, all passed, 207 s on 1 core). A second full run found the integration-flow-real flake above (1009 of 1010).
- Not tested: --test-concurrency=4 (the sandbox has 1 core).

## CI
- Added timeout-minutes: 15 to the check job.

## Pushed
- 64ac5d2: both fixes plus the CI timeout. Its ci run was green (first green run with the fixes).
- f3760af (notes only): ci green too (second in a row with the fixes).

- 6feb4c7 (notes only): ci green. Three ci runs in a row green with the fixes: 64ac5d2, f3760af, 6feb4c7.

## Honest limits
- Three greens in a row is good, not proof: before the fixes about 1 in 5 recent runs failed (4 of 20), so three greens can happen by luck. If ci goes red again, look at the step "Run npm run check" and run the failing test file about 40 times alone to find the flake.
- I saw the two flaky tests fail and then pass 40 of 40 here; I cannot read ci job logs, so I never saw the exact ci failure message. The two fixed tests are the only flaky ones I could find (604 single-file runs plus 3 full runs).
- ci runs fa16c89 and ba19b67 failed just before my fixes; they are older than the fixes, so they were most likely the same flakes.

STATUS: DONE
