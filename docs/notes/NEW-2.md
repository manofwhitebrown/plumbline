# Notes — NEW-2 (Crew screen and Workshop screen)

STATUS: IN PROGRESS (code and tests done; real-browser size checks not done yet)

## Done
- Crew screen: Gold per second header (animated counter), 6 cards, x1 / x10 / Max toggle (remembered), progress to the next doubling, Buy with a reason when disabled, manager hire, locked rule shown.
- Workshop screen: Parts and Upgrades tabs, family chips, all parts in a grid, detail sheet (description, tags, combos), upgrade list with level pips, preview, cost, Buy, max state.
- A failed buy shakes the card, plays deny and shows a toast.
- Screens redraw on `meta:changed`. Cards are built once and only changed text is written. Listeners go away on unmount.
- Tests: tests/ui-crew-logic, ui-workshop-logic, ui-crew-meta. `npm run check` is green (379 tests).

## In progress
- Nothing is half done.

## Next
- Open both screens in a real browser at 360x640, 390x844, 430x932, 1440x900 with `?debug=1&fixture=empty|busy|extreme&screen=crew|workshop`. I could not do this here (no browser in my sandbox). Check overflow, tap targets and console errors.
- Check Large text and Reduce motion.

## What others must know
- Combos a part "joins" are found by looking for the part name in the combo text (the combo data has no part list).
- The Crew mode choice is saved in localStorage under `plumbline.crewMode` (guarded, falls back to memory).
- Small shared rule: `.ellipsis` is also defined in crew.css and workshop.css (same rule, harmless).
