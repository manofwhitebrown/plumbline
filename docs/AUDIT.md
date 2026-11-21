# Final audit (FINAL-3)

PASS = checked and fine. FAIL = a real problem. NOT CHECKED = I could not do it here. "tests pass" means a test says so; "seen" means a screenshot in a real browser (QA-2, see docs/qa/QA-2.md).
Commit audited: the one that contains this file, on top of 20f96c5.

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | npm run check | **PASS** | 1040 tests pass, 0 fail; build ok; secret scan ok (676 files). |
| 2 | Fuzz tests | **PASS** | `integration-engine-fuzz` and `integration-balance` run inside `npm test` and pass. |
| 3 | Bot, style 85 | **PASS** | 29 drops, 2.4 h; 100 m at 4.8 min, 500 m at 19 min, 1000 m at 1.8 h, first Collapse at 2.4 h; 42.6M Gold per hour. |
| 4 | Bot, style 70 | **FAIL (balance)** | 3 h; 1000 m at 2.2 h, first Collapse at 3.0 h; 35.4M Gold per hour. 19 FAIL lines: seven parts count as "must have" (banning one cuts the best rig's Gold by 91 to 97%, limit 70%). Not a crash. |
| 5 | Bot, style 50 | **FAIL (balance)** | 6 h; 500 m at 3.7 h, 1000 m and Collapse not reached; 11.7M Gold per hour. 20 FAIL lines, same "must have" parts (93 to 98%). A very careful player is slow. |
| 6 | Bot, style 100 (never haul) | **FAIL (balance)** | 1.6 h; 1000 m at 50 min, first Collapse at 1.6 h; 67.2M Gold per hour, the fastest style. Fails: part "jackpot" is never worth buying. The same bot result shows never hauling beats hauling at 85%, which weakens "know when to Haul Up". Needs a designer decision. |
| 7 | balance-report | **FAIL (balance)** | Missed targets are the same: "must have" parts at style 70 (multiplier, prism, cooler, oilcan, smelter, net, spikeguard), jackpot at style 100 and never haul. Full report was written to a scratch file, not committed. |
| 8 | Forbidden words in player text (code scan) | **PASS** | A scan of text, label, title, aria-label and similar strings in `src/` found 0 hits for beat, lane, tick, entity, seed, slice, bus, payload, debug, null, undefined, NaN, Infinity. It is a pattern scan, so odd wording could slip past it. |
| 9 | Forbidden words in player text (real browser) | **PASS after one fix** | Text read on 10 screens at 4 sizes, plus Contracts, Daily Dive, Relic Wall, Looks, Settings About, Collapse. One hit: the Collapse box showed the word "null". Fixed in commit "[QA-2] Collapse box no longer prints the word null". Help tips and tutorial text were not read in the browser: **NOT CHECKED**. |
| 10 | Secrets in the repo | **PASS** | Secret scan passes. The only "github_pat" text is the word itself in docs (AI_RULES, old audit); no real token anywhere. `.git/config` has none. |
| 11 | Console errors | **PASS** | 0 errors, warnings or failed requests on 40 screen/size pairs and the Workshop, Crew, Rig, Drop, Results, Collapse, Codex, Large text and Reduce motion runs. |
| 12 | Listener leaks | **PASS (tests only)** | "scope: 50 mount and unmount rounds leave zero listeners" and the stage dispose test pass. Not measured in a browser over a long session: **NOT CHECKED** at run time. |
| 13 | Cheat menu hidden, password never written | **PASS (tests only)** | cheats-gate, cheats-menu, cheats-sha, cheats-repo-scan pass; the password is stored only as a hash. I did not try the 7 taps in a browser. |
| 14 | Old save loads for every slice | **PASS (tests only)** | meta-migrate and integration-meta-save pass. I did not check slice by slice myself. |
| 15 | Offline earnings | **PASS (tests only)** | "offline: away income waits, is claimed once, and is capped" passes. |
| 16 | Collapse pays once | **PASS** | "pressing Collapse twice only works once" passes. One real Collapse seen in a browser: Gold reset, Core Dust kept, new Drop started. |
| 17 | Haul Up pays once | **PASS** | "a haul pays exactly once" and "double haul pays once" pass. One Haul Up seen: Results in 0.96 s, numbers counted up. |
| 18 | Snap pays once | **PASS (tests only)** | "a snap pays exactly once" passes. A Snap was not seen in a browser (a passive Drop ran 142 s with no Snap). |
| 19 | Daily rewards pay once | **PASS (tests only)** | "claim pays exactly once and survives a second peek" passes. |
| 20 | Contracts and Daily Dive pay once | **NOT CHECKED** | I found no test with that name. The screens render and show correct text; payment was not tested. |
| 21 | Workflows ci, pages, android green on the final commit | **NOT CHECKED** | This sandbox cannot read the GitHub API (access refused), so I could not poll runs or re-run ci three times. My pushes reached `main` (remote head matched). Look at the Actions tab. |
| 22 | Live game link works | **NOT CHECKED** | This sandbox cannot reach github.io. |
| 23 | Docs vs game (CONTRACT numbers, WORDS, CHEATS, PLAY, ART_DIRECTION) | **NOT CHECKED in full** | PLAY.md was updated by ONBOARD-2 (Contracts, Daily Dive, Mastery, Relic Wall, Looks). The balance targets quoted in CONTRACT were not compared line by line. The README was rewritten (what it is, Built by line, commands, live link, debug and signed APK steps). |
| 24 | STATUS lines and requests | **PASS** | 11 notes without a STATUS line got an honest one. The two finished requests (wall hooks, Mastery hooks) were deleted: the hooks are in the code and their tests pass. |
| 25 | Dead code sweep | **NOT CHECKED** | Not done; no safe time. |

## Verified
Tests, build, secret scan, bot at style 85, console cleanliness in a real browser at 320x568, 360x640, 430x932 and 1440x900, the Collapse "null" bug found and fixed, Haul Up, Results count-up, Loadout save and load, Collapse, Large text on 8 screens.

## NOT verified
- Real phone speed and layout (no device). The depth layer on high quality was reported over budget on the CPU canvas by earlier notes.
- A Snap in a real browser; Reduce motion effect; tutorial box position; "+1 Shards" plural wording.
- The three workflows, the live site, the signed release APK (needs the 4 secrets).
- Contracts and Daily Dive paying once.

## Open balance problems (need the owner or ECONOMY)
Seven parts are "must have" for hauling styles, jackpot is never worth buying, and never hauling is the fastest way to earn. These come from the bot, not from a crash.

## For the owner
REVOKE the GitHub token now, it is pasted in many chats and prompts.
