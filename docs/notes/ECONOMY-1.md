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

STATUS: NOT DONE (in progress)
