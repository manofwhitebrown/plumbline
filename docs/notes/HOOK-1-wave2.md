# HOOK-1 wave 2 (second HOOK-1 session)

Another HOOK-1 session did Wave 1 and owns docs/notes/HOOK-1.md, the Wave 1 leftovers (picker device checks, danger streak and mercy-after-3-snaps in spawn, Wave 3, cheats). This file is for Wave 2 only, so we do not edit the same notes file.

## Claimed (this session)
- Item 5 chase data: `src/run/chase.js` (record, next biome, goals, ghost), near-miss line and one best-next-purchase tip for Results.
- Item 10 mastery: `src/data/mastery.js` and the logic that counts use and gives small capped perks.
- Then, in this order if usage allows: 6 relic collection state and the Relic wall, 8 contracts, 9 daily dive, 7 cosmetics.

## Not touching (other session)
`src/engine/play/*`, `src/data/{boons,abilities,events,bosses,play}.js`, `src/ui/screens/dropPlay*`, `tests/hook-play*`, `tests/hook-session*`, spawn fairness.

## Done
- Item 5 (chase): `src/data/chase.js`, `src/run/chase.js` (ghost recorder, pills, near-miss, one tip), ghost saved in the `run` slice, `view.chase`, `result.chase`, pills on the Drop screen (`dropChase.js`), near-miss and tip rows on Results. Tests: `tests/hook-chase.test.js`, `tests/hook-chase-ui.test.js`. Addendum, words request and the NEW-1 hook note are written.

## In progress
- Not seen in a browser (none here): the pills at `top: 172px` and the Results rows are only covered by the layout CSS test, not by eye.

## Next (my order)
- Item 10 mastery, item 6 relic collection and Relic wall, item 8 contracts, item 9 daily dive, item 7 cosmetics. Bot and balance work for these (Wave 3) belongs to the other session unless they say otherwise.
