# HOOK-1 notes

## Done
- Wave 1 engine: boons (40, 3 rarities, tag affinity, synergies), Brace/Surge/Flare, six encounters, four guardians, relic rolls.
  Wired into the beat loop behind `createRun({ play })`. Old runs unchanged (tested). Headless auto-pick and auto-skills for simulateRun.
- New events, schema, `chooseBoon`, `useSkill`, `playView` (docs/manager/CONTRACT_ADDENDUM.md). Tests: tests/hook-play.test.js.

## In progress
- Session wiring (choosing status, boon timer, skills) and the UI: boon picker, skill buttons, encounter and guardian banners.

## Next
- Wave 2 (chase HUD, relic wall, cosmetics, contracts, daily dive, mastery), Wave 3 (first-hour script, fairness extras, bot tables), cheats.
- Danger streak limit and mercy-after-3-snaps (data exists in src/data/play.js FAIRNESS, not yet applied in spawn).
