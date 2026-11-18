# NEW-4 notes (Settings, hidden panel, modals)

## Done
- Settings screen: Sound (mute, sound and music sliders, haptics), Display (Reduce motion, Large text, Colorblind palette, Quality auto/high/low), Save (export copy and download, import with confirm, Reset with the word RESET plus a second confirm), About (build label line, credits).
- Everything saves to the `settings` slice at once. Sound is told straight away with `audio.mute` and `audio.setVolumes`.
- Hidden panel: 7 quick taps on the build label open a small password box. 5 wrong tries lock it for 30 seconds. The right word opens the panel: 7 grouped cards, big buttons, switches for toggles, a toast for every action, a result box for Tools data, the banner "Cheats used — records are off", a "Lock cheats" button, a "Start clean" hold button. The FPS chip shows when the Tools cheat turns it on.
- Modals: Welcome back (count-up, Claim) and Collapse (what resets, what stays, Core Dust gain, 1 second hold).
- Shared modal frame `openFrame` in `src/ui/modalsWelcome.js`: header with a visible Close, own scroll, buttons stay in view, Tab stays inside, Esc closes, focus goes back, safe-area padding. Any screen can use it.
- Tests: `tests/ui-settings-*.test.js`, `tests/ui-modals-*.test.js`. `npm run check` passes (394 tests).
- No password text is in any file. Tests use a throwaway test-only word and a test gate.

## In progress
- Nothing.

## Next
- Nothing required. Ideas: show particle count in the FPS chip (needs a renderer handle from the Drop screen).

## Small edits outside my files (tiny, on purpose)
- `src/ui/settings.js`: Quality now accepts `auto` (new default), and `applySettings` also sets `data-reduce-motion="true"` on the page (the tutorial glow reads it).
- `src/ui/screens/home.js`: uses the new Welcome back and Collapse modals. The old inline code was removed. `src/ui/collapse.js` is no longer used by anyone; AI-7 or the Manager may delete it.

## What other AIs must know
- Drop screen owner: Quality `auto` means do not lock the renderer (its own auto-lowering stays on). `high` or `low` means call `setQuality(level)` as a player choice.
- Import: `importSave` replaces the save the moment it passes its checks, so the box asks the player first. A bad code changes nothing. After a good import or a Reset the page reloads so every module reads the new save.
- The FPS chip shows frames per second only.
- Welcome back: if the player closes it without Claim, the Gold stays waiting and the box does not pop up again for the same pile in this session.

## Layout check
Tested in headless Chromium against `npm run dev`. Checked: no sideways scroll, no tap target under 44 px, no text under 12 px, no console errors, Esc closes, Tab stays inside.

| Screen | 360x640 | 390x844 | 430x932 | 1440x900 | 844x390 |
|---|---|---|---|---|---|
| Settings | PASS | PASS | PASS | PASS | not tested |
| Password box | PASS | PASS | PASS | PASS | PASS |
| Hidden panel | PASS | PASS | PASS | PASS | PASS |
| Welcome back | PASS | PASS | PASS | PASS | PASS |
| Collapse | PASS | PASS | PASS | PASS | PASS |

Large text and Reduce motion were ON for at least one size of every row (Settings: all four). Not tested: 320x568, 768x1024, browser zoom, notch simulation, rotating while open, real phones, the real password (panel was tested with a test-only gate).

STATUS: DONE
