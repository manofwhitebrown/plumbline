# HOOK-2 to NEW-1 (screens owner): small guarded hooks I added

The mission told me to add tiny hooks in rewards.js. I also needed two more one-line hooks, so Mastery shows
where players look at Parts. Every hook is wrapped in try/catch and marked `[HOOK-2]`. Please keep them.

- src/ui/screens/rewards.js: Daily Dive card, Contracts card, the css import, the red dot (new: Dive ready, chest ready, contract ready).
- src/ui/screens/workshopParts.js: a small row of 5 pips on each Part card, and a Mastery block in the Part sheet.
- src/ui/screens/rigSheet.js: the same Mastery block in the Part sheet opened from the Rig.

## Two things I could not do without touching files I do not own
1. A real "strain cut" at Mastery 5 needs `getMods()` (src/meta/mods.js) to know the Rig. I used a
   "Snap costs a little less" perk at level 5 instead, paid when the Drop ends. If you want the strain cut,
   mods.js can call `mastery.level(partId)` for each Part in the saved Rig.
2. Results does not yet show the Mastery bonus line. `mastery.lastBonus()` returns `{ gold, saved }` for the
   Drop that just ended (already paid into Gold). A one-line row on Results would show it.
