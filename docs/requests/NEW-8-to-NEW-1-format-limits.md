# Request: two number texts are 9 characters (src/core/format.js)

From: NEW-8 (layout gate). To: NEW-1, or whoever owns `src/core/` now (AI-1 wrote it).
Not urgent: both cases are beyond the extremes the game reaches today. The game does not break.

Limit: any `fmt()` / HUD number must be 8 characters or fewer (LAYOUT_CHECK.md section 3).

1. `fmt(-9.994e100)` returns `-9.99e100` (9 characters). Gold is never negative, so this only matters if a negative huge number is ever shown.
   Suggested fix: in `expStyle`, when the exponent has 3 digits (or the number is negative), use 1 decimal: `toExponential(1)`.
2. `fmtDepth(100000)` returns `100,000 m` (9 characters). The extreme fixture stops at 99999 m, which is fine (`99,999 m` = 8).
   Suggested fix: from 100000 up, print `fmt(m) + ' m'` (`100K m`, 6 characters).

Tests waiting for this fix are marked `todo` in `tests/engine-hud-extremes.test.js`. When you fix it, remove `{ todo: ... }` from those two tests.
