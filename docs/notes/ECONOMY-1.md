# ECONOMY-1 notes

## Findings (baseline, bot style 85, 3 h)
- Crew pays far more Gold than drops (about 500x late). Gold is never the limit, so pacing is set by Crew growth.
- With the play layer on (the real game), Brace + strain boons + Cooler/Oil Can keep the rope near 50%, so single drops reach 1000 to 4900 m.
- Rare boons drive the extremes: Phoenix Rope, Unbreakable, Time Tinker, Golden Age, Star Chain, Cool Head (top 10% of drops).
- Heavy tail: one 1000 m drop pays 7M Gold while normal drops at the same rope pay 20-40K.

## Done and pushed
- tools/bot.js: styles 50, 70, 85, 100, never; play layer on like the real game (opts.play=false for the old way); `onDrop` callback; `boonStats` tally; keeps playing after Collapse is available to see if 1000 m is reachable.

## Work in progress (NOT applied; tests still expect old numbers)
- docs/notes/ECONOMY-1-wip-numbers.patch = my tuning so far (Crew output down, Manager x2, rope cost 1.75 and +55, strain per metre 0.005, gold factors flattened, Cooler/Oil Can/Anchor/Brace/boon caps cut). Apply with `git apply`.
- Last result with it: styles 70/85/100 hit 500 m between 1.5 and 2.5 h but 1000 m too early (85: 2.45 h); style 50 never reaches 250 m. Not done.

## Next
1. Cap the rare-boon extremes (Phoenix Rope, Unbreakable, caps on maxStrain and second).
2. Re-tune, then update the old tests that pin old numbers (crew manager x3, rope clamp, first drop time).
3. Tables for styles 50, 70, 85, 100 and boon pick rates.

- Pushed: boon caps cut (strain cap 0.4, hazard 0.5, coolPerGem 0.006, Cool Head 0.0015). Next: tests pin Cooler/Oil Can/Brace/Manager/rope numbers (test 518, 218, crew, upgrades), so those stay as they are unless the test owners agree.
STATUS: NOT DONE (in progress)
- Pushed: biome gold factors flattened (1, 1.3, 1.7, 2.2, 2.8, 3.4). Tested alone: engine numbers (strainPerMeter, depthBonusDiv) break tests 145 and 255 (pinned Gold example and first drop 45-90 s), so not applied.
- Pushed: Crew tiers 2 to 6 output cut (smithy 4, cart 16, lamp 80, assay 400, foundry 2000 Gold/s). Winch Hand (1) and Manager (x3) stay: tests pin them.
- Measured with boons on (--play=on, 6 h cap), after biome + crew + boon-cap changes:

| Style | 100 m | 250 m | 500 m (Collapse ready) | 1000 m | Gold/h |
|---|---|---|---|---|---|
| haul at 50% | 9 min | 20 min | 3.94 h | 3.94 h | 4.7e7 |
| haul at 70% | 3.8 min | 16.5 min | 63 min | 63 min | 3.5e7 |
| haul at 85% | 3.7 min | 13.6 min | 50 min | 1.63 h | 1.8e9 |
| haul at 100% | 8.6 min | 19 min | 30 min | 58 min | 3.7e7 |

  Far too fast with boons on. The cause is the deep-drop Gold tail plus stacked rare boons, not the Crew. Next: cut the tail (legendary boons, Gold caps), then re-measure.

## Session 3 (cut short on purpose: pushed what is safe, notes on the rest)
Pushed: `tools/bot.js` now counts boon pick rates whenever the play layer is on and prints them (share of all picks and rate per offer). The part-ban check ("must-have part") uses 24 seeds and a trimmed mean (richest quarter left out): before, one lucky 1000 m drop made 8 to 10 parts look mandatory and the answer changed with every small number change.

NOTE: another ECONOMY-1 session pushed crew tier cuts (smithy 4 ... foundry 2000) while this patch was made against the older crew numbers, so the crew hunk of the v2 patch may not apply: apply it with `git apply --reject` and keep the newer crew numbers.

NOT applied (it breaks 21 old tests that pin the old numbers): `docs/notes/ECONOMY-1-wip-numbers-v2.patch`. It is the old WIP patch plus these changes: strainPerMeter 0.0067 (was 0.0016; WIP 0.005), rope +48 per level at growth 1.75, relic chance 0.03/0.06/0.09/0.12 in Amber/Magma/Void/Abyss, Vacuum strain 0.4, Drill speed 0.8. Apply with `git apply`.

Bot results with the patch (play layer on, 3.5 h, haul at X% of Strain; times are noisy by about 20 minutes because rare boons make a heavy tail):
| style | 250 m | 500 m | first Collapse | 1000 m |
| 70 | 1.54 h | 2.17 h | 2.17 h | not in 3.5 h |
| 85 (at strain 0.0062) | 34 min | 1.52 h | 1.77 h (too early) | not in 3.5 h |
| 100 (at strain 0.0062) | 46 min | 85 min | 2.22 h | 2.61 h |
| 50 | never past 100 m (careful play stalls) |
Part checks passed at all three styles with the trimmed mean (no must-have part, jackpot used). Boon share of picks: highest 7% (second_wind); per-offer rates are noisy for rare boons (small samples). Gold per hour is 1M to 20M, which the number formatter fits in 8 characters.

## Left to do
1. Style 85 collapses too early (1.77 h, target 2 to 3 h): the last try was strainPerMeter 0.0067; it was not measured (stopped).
2. Style 50 never reaches 250 m: decide whether a timid player must keep progressing.
3. 1000 m is only reached by style 100 (2.6 h); style 85 and 70 do not reach it in 3.5 h. Decide if that is fine or loosen late strain.
4. Apply the v2 patch and update the 21 tests that pin old numbers (gold example 145, first drop 45-90 s, rope ladder clamp, never-haul Collapse window, crew milestones and manager, upgrades, away income, Vacuum, Oil Can and Cooler, Drill and Anchor), with the test owners' agreement.
5. Run `node tools/balance-report.js` once the numbers are applied and paste its table here (not run this session).
6. Re-check numbers: all displayed numbers must stay 8 characters or fewer (tests/engine-hud-extremes covers the formatter).

STATUS: NOT DONE (bot tooling pushed; numbers parked in a patch, tests not updated)
