# HOOK-1 notes

## Done
- Wave 1 engine: boons (40, 3 rarities, tag affinity, synergies), Brace/Surge/Flare, six encounters, four guardians, relic rolls.
  Wired into the beat loop behind `createRun({ play })`. Old runs unchanged (tested). Headless auto-pick and auto-skills for simulateRun.
- New events, schema, `chooseBoon`, `useSkill`, `playView` (docs/manager/CONTRACT_ADDENDUM.md). Tests: tests/hook-play.test.js.

- Session: 'choosing' pause, `session.chooseBoon`, `session.useSkill`, `view.play`, play summary + guardian shards in the payout. Tests: tests/hook-session.test.js.
- UI (new files): boon picker with timer ring, round skill buttons with cooldown sweep, banners, guardian bar, keys 1/2/3, styles in dropPlay.css, logic tested in tests/hook-ui-model.test.js. One guarded hook in drop.js (docs/requests/HOOK-1-to-NEW-1-hook.md).

## In progress
- Real-device checks. NOT done: no browser here, so the picker, buttons and banner were not seen at 320x568 / 360x640 / 430x932 / 1440x900 with Large text and Reduce motion. CSS rules are covered by the layout tests (44 px, 12 px fonts) only.

## Next
- Wave 2 (chase HUD, relic wall, cosmetics, contracts, daily dive, mastery), Wave 3 (first-hour script, fairness extras, bot tables), cheats.
- Danger streak limit and mercy-after-3-snaps (data exists in src/data/play.js FAIRNESS, not yet applied in spawn).
