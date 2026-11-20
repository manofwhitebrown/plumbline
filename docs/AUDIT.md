# Final audit (FINAL-1)

Honest list. PASS = checked and fine. FAIL = a real problem. NOT CHECKED = I could not do it here.
Full `npm test` before my fixes: 903 pass, 1 fail. After fixes the one failure is gone (see the table).

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | Flaky test | **FIXED** | `tests/engine-balance.test.js` "speed: a 300-beat run" timed the machine, not the game. It failed when tests ran at the same time as other work (2 of 3 parallel runs). Now takes the best of 5 samples with a looser limit. The game itself runs a 300-step drop in about 0.5 ms. |
| 2 | Forbidden words on screen | **FIXED** | Found and changed: codex text "relic of tier N" -> "level N"; Rig warning "in their lane" -> "in their column"; relic "Night Seed" -> "Night Acorn"; relic text "It beats, slowly." -> "It pulses, slowly." The matching test was updated. A scan of every quoted string in `src/` finds no other player-facing hit. Remaining hits are error logs and code (for example "save slice", "bus handler", "debug screen failed"). They go to the developer console, not the screen. |
| 3 | Secrets | **PASS** | `node tools/check-secrets.js` passes (594 files). No `github_pat_` text anywhere in the repo. `grep -c github_pat .git/config` prints 0. The cheat password is stored only as a hash, and `cheats-repo-scan` proves no word in the repo hashes to it. |
| 4 | Console errors | **PASS (static)** | No `console.log` or `console.debug` anywhere in `src/`. Only 4 `console.error` or `console.warn` calls, all in failure paths. **NOT CHECKED in a real browser**: I cannot open the game here, so a live console was not watched. |
| 5 | Listener leaks | **PASS (static)** | Every listener on `window` or `document` (resize, orientationchange, visibilitychange, pagehide) is added once at start-up and guarded (`installLifecycle`, `listening` flag). Screen-level listeners are on elements that are thrown away with the screen. No per-run or per-screen growth found. Not measured at run time. |
| 6 | Cheat menu stays hidden | **PASS** | Opens only after 7 quick taps on the build label in Settings, then needs the password. 5 wrong tries lock it 30 seconds. Tests `cheats-gate`, `cheats-menu`, `cheats-sha`, `cheats-repo-scan` pass. Note: `?debug=1` (see PLAY.md) opens screens and test games, but not cheats, and never saves. |
| 7 | Old save loads (migration) | **PASS** | `meta-migrate` (v0 save upgrades with no loss, garbage becomes safe defaults) and `integration-meta-save` (old stored save, export and import, bad codes change nothing). |
| 8 | Offline earnings | **PASS** | `meta-offline` (12 tests: under a minute gives nothing, 1 hour pays 60% of Crew income, capped) and the flow test "away income waits, is claimed once, and is capped". |
| 9 | Collapse | **PASS** | `meta-mods-collapse`, "Collapse: the saved rig is checked again", and the whole-journey test through Collapse and a new Drop. |
| 10 | Daily rewards | **PASS** | `meta-rewards`: streak day 1 to 7 then back to 1, one claim per day, a missed day starts over. |
| 11 | Haul Up and Snap | **PASS** | "a haul pays exactly once", "a snap pays exactly once", Snap keeps 30% of Gold (loses 70%), Haul keeps all, mercy after 3 snaps in a row. |
| 12 | android.yml builds a debug APK on every push to main | **PASS (read, not run)** | Node 22, Java 17, build, `cap add android` if missing, sync, `assembleDebug`, uploads the APK. |
| 13 | android.yml signs and builds the APK on a `v*` tag | **PASS (read, not run)** | On `refs/tags/v*` it runs `assembleRelease`, zipaligns, signs with `apksigner` from four secrets, and attaches `plumbline-<tag>.apk` to the GitHub Release. **It needs these 4 repo secrets or the tag build fails:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. I cannot see whether they are set, and I did not push a tag. |
| 14 | README and docs/PLAY.md | **PASS with a gap** | Commands and links are right (`npm ci`, `npm run dev`, `npm run check`, play link, debug APK steps). Gap: PLAY.md does not say how to get the signed release APK; it only points to ANDROID.md. |
| 15 | 60 fps on a mid-range Android phone | **NOT CHECKED** | No device here. DEPTH-1 and PERF-1 notes also say this is unverified. The depth layer on high quality is over budget on the CPU canvas. |
| 16 | Other AIs' notes | **NOT ALL DONE** | DEPTH-1 and ECONOMY-1 say "NOT DONE"; NEW-7 says "PARTLY DONE"; NEW-8 says "IN PROGRESS". Many older notes have no STATUS line. I ran the audit anyway because of the time limit. Re-run `npm run check` after they land. |

## Before you ship
1. Add the 4 signing secrets in the GitHub repo settings, then push a tag like `v0.1.0` and watch the Android run.
2. Install the debug APK on a real phone and check speed, Haul Up, a Snap, and the Settings > cheat taps.
3. Ask ECONOMY-1 and DEPTH-1 to finish, then run this audit again.
