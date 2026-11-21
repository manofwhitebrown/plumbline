# ECONOMY-2 notes

## Session 1: what changed and why (all pushed together, check green)
Plain words: the game was too fast in the middle and had "jackpot drops" (one drop jumping from 400 m to 1100 m and paying millions). The cause was rope relief stacking, not the per-metre strain.

- tools/bot.js: boons ON by default (the real game has them), uses the first-hour script and mercy-after-snaps like the real game. `--play=off` = old plain engine. New: `--seed=N` (other luck), `--parts=off` (skip slow part checks).
- Brace: -12% to -6% of rope, wait 31 to 38 steps (src/data/abilities.js). Reason: it grew with rope size and cancelled all strain deep down.
- Cooler 2 to 1.5, Oil Can 0.5 to 0.4. Tests in parts-effects updated to match.
- Boons: Cool Head 0.0015 to 0.0006 and its cap 0.006 to 0.0012; general strain cap 0.3 to 0.25; legendary chance after a guardian 30% to 18%.
- Biomes: Amber bat 4 root 5 danger share 19%; Magma root 6 steam 5 share 22%; Void steam 10 void 9 share 27%; Abyss dangers 6/8/11/11/10. Dangers (not strain per metre) are what limits depth, so this is the real depth dial. strainBase 0.35 and strainPerMeter 0.0016 are unchanged (they barely matter; first drop stays 50 to 70 s, so the first-drop test still passes untouched).
- Rope price: base 70, growth 2.6 (was 100 and 2.2). First levels cost about the same, later levels cost much more. Test "upgrades: buy" now gives 1e11 Gold because the full ladder costs about 9e9.
- Collapse gate: 20M Gold (was 1M) and Core Dust divisor 10M (was 1M). Gold earned by a style-85 player is 1.8e7 at 2 h. At the gate you get sqrt(2) x 1.5 = 2 Core Dust = +20% Gold (contract says 15 to 25%). Collapse tests updated: same checks, new gold figures, expected first gain is 2.
- hook-play guardian test: more seeds (8 instead of 3). The rule it checks (no one-step snap) is unchanged; the eased biomes just made 3 seeds not meet a guardian.

## Results (boons on, 2 seeds shown as a/b, 6 h cap) after these changes
| Style | first part | 100 m | 250 m | 500 m | Collapse ready | 1000 m |
|---|---|---|---|---|---|---|
| 50 | 0.7 min | 9 min | not reached | not reached | not reached | not reached |
| 70 | 0.8 min | 5.8 / 5.3 min | 20 / 23 min | 2.8 / 3.0 h | 2.8 / 3.0 h | NR / 3.3 h |
| 85 | 1.0 min | 4.7 / 5.5 min | 17 / 20 min | 79 / 76 min | 2.12 / 2.09 h | not reached |
| 100 | 1.1 min | 6.7 / 6.4 min | 21 / 22 min | 56 / 44 min | 1.6 / 1.7 h | 86 min / 1.7 h |

Targets met: first part, first drop, 100 m, 250 m, Collapse window for 70, 85, 100.
NOT met yet: style 50 stalls (hauling at half the rope only buys about 100 m); 1000 m not reached by style 85; boon pick rates and part checks not re-measured.

## Next
1. Style 50 progress. 2. 1000 m after Collapse for style 85. 3. boon rates and `node tools/balance-report.js`. 4. Re-run all styles before the last push.

STATUS: NOT DONE (style 50, 1000 m, boon and part checks still open)
