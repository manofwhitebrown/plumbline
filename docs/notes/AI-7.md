# Notes — AI-7 (UI) — taken over by the Manager

AI-7 ran out of usage. The Manager finished the leftovers.

## What exists
- Shell with back stack, `onBack`, modal, sheet, toast (`src/ui/shell.js`). Browser back, Android back and Esc go to the previous screen; Drop asks its pause menu first (`onBack`). History uses `pushState` and `popstate` (`src/ui/chrome.js`).
- Design tokens, base and component CSS, components (button, card, pill, progress, counter, partCard, sheet, modal, toast, tabbar, holdButton).
- Home and the full Rig screen: grid, tray, drag, sheet, power bar, combo pills, 3 loadouts with rename, Suggest, Clear, Drop.
- Keyboard: Space = Drop on Home, R = Rig, Esc = back. Rig grid: arrow keys move, Enter places or picks, Delete or Backspace removes the focused part.

## Who owns what now
Drop and Results: NEW-1. Crew and Workshop: NEW-2. Codex, Rewards, Guide: NEW-3. Settings, cheat panel, modals: NEW-4. Layout fixes: NEW-8. Polish: AI-2.

## Tutorial marks (`data-tut`)
Present: `home-drop`, `tab-<id>` (tab-home, tab-rig, tab-workshop...), `rig-grid`, `rig-cell` (with data-r, data-c, data-part = part id or `empty`), `rig-new-part` (first part in the tray not fully used), `rig-drop`, `workshop-part` (every affordable part). Drop and Results marks (`well`, `strain`, `haul`, `results-gold`) are set by NEW-1's files. Tests: `tests/ui-tutorial-marks.test.js`.

## Tests
`tests/ui-leaks.test.js` proves a screen scope gives back every listener (50 rounds) and that screens subscribe through a scope.

STATUS: DONE
