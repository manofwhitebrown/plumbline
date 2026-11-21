# FINISH-3 to Manager: one flaky test

tests/integration-flow-real.test.js, "a snap pays exactly once", fails now and then (`0 !== 1`: the snap did not happen inside the 2000 ms tick). Seen on the code from before FINISH-3's changes too (1 failed run in 6, same file), and 0 in 6 on current main, so it is timing luck, not a FINISH-3 change. Owner of the test: NEW-6 / integration tests. Likely fix: make the Drop's snap not depend on real time.
Also: the HOOK-3 render "no per-frame allocation" test was flaky once before (see PERF-2 notes).
