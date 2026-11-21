# QA-2 report (second real-browser pass)

Browser: headless Chromium (puppeteer-core), built game via `vite preview`, test saves `busy` and `extreme` (`?debug=1&fixture=..`). Sizes: 320x568, 360x640, 430x932, 1440x900.
"I saw it" below means I looked at a screenshot. "Measured" means a script read the page, I did not see a picture.

## Measured on all 40 screen/size pairs (10 screens x 4 sizes)
No console errors or warnings, no failed requests, no NaN/undefined/null text, no sideways scroll, no tap target under 44 px.
Exception: the Collapse box showed the word "null" (found by reading the text, then fixed, see problem 1).

## Verdict on every earlier problem
| QA-1 problem | Verdict | What I saw |
|---|---|---|
| Rig pinned bar covers help buttons | FIXED (seen) at 360x640 and 1440x900 | Help (i) buttons are clear of the bar. At 1440x900 the bar still cuts the names under the first tray row at first view (reachable by scrolling): STILL OPEN, low. |
| 320 clipping (Rewards heading, Crew name) | FIXED (seen) | Rewards heading fits; Crew shows "Winch Hand" on two lines. |
| Filter chips run off the edge | FIXED (seen) | The row now fades at the right edge, so it reads as scrollable. |
| Results card peeking behind Drop again | FIXED (seen) at 360x640 | A divider line now separates the scroll area from the pinned buttons. |
| Achievement pop-up | STILL OPEN (low-medium) | Name now correct ("Gear Head"). It stays about 4 s (measured, 8 samples 0.5 s apart), not 2.5 s, and still covers the Workshop title and the top of the well (seen). |
| Drop goal chips cut with "..." | FIXED (seen) at 320, 360, and with Large text | Chips wrap to full text ("Collect 26 level 3+ gems"). |
| Tutorial box covers things | FIXED (seen) | Brand-new save at 360, 320, 430, and with Large text and Reduce motion: notes sit clear of the hint lines. Also fixed a Rig-step ring that was off-screen (ONBOARD-2). |
| "+1 Shards" plural | FIXED (seen) | Results shows "+1 Shard" and "+2 Shards". |
| Scripted click opened Settings (QA-1 #14) | NOT REPRODUCED | Note: scripted `element.click()` does not work on Loadout chips (they need real pointer events); real mouse and touch work. Not a game bug. |

## Unseen parts now covered
- Workshop buy: SAW the part sheet and the buy (Smelter: button changed to Owned, Gold went down). Measured text, picture of result seen only for the sheet.
- Crew buy and Manager: measured (rate 125 -> 128 after Buy, 209 after Hire manager; that manager button disappears). Saw the Crew screen, not the hired state.
- Rig: SAW place a part (power 2793 -> 3396), SAW "Loadout saved" and Loadout 1 glowing yellow. Clear -> real tap on Loadout 1 restored power 2445 and the chip turned yellow (colour measured).
- Full Drop with Haul Up: SAW the Drop (gems, +1 pick-ups, Strain bar, goal chips). Results appeared 0.96 s after the tap and counted up (Depth 0, 8, 11, 12; Gold 0, 17, 29, 34, 36): no blank wait. Drop again started a new Drop.
- Snap: NOT SEEN. A passive Drop ran 142 s and reached 119 m with the Strain bar about a third full; no Snap. Engine tests cover it (Snap pays once).
- Collapse (extreme save): SAW the preview (+15Qa Core Dust, Resets / Stays lists, Hold to Collapse). Held 1.5 s: Gold went to 0, Core Dust 15Qa stayed, Home says "Buy Crew to earn Gold while you rest", and a new Drop started. Core Dust effect on Gold in a Drop: measured only (Gold climbed quickly), not compared.
- Codex: SAW Parts and the Looks tab (Looks list, "Locked" ones). Wall tab measured: "0 of 36 found", rows "??? " for unfound relics, no NaN.
- Contracts, Daily Dive (More screen): SAW Daily Dive and the twist; Contracts read as text (3 contracts with progress and rewards).
- Settings About: SAW the text "Built by Mohammed Abdul Nayeem."
- Large text (320x568): Home, Workshop, Crew, Rig, Codex, More, Drop, Results: no sideways scroll, no small taps. 1 clipped item on Workshop and 2 on More (measured, not looked at). SAW Drop and More: fine.
- Reduce motion: switch turns On, every screen loads with no errors. I did not measure what stops moving.

## Top problems (worst first)
1. FIXED [QA-2] (medium) Collapse box printed the word "null" under Stays/Resets whenever "You keep N of each Crew" was empty (the usual case). Cause: `body.append(..., null)` in src/ui/modalsCollapse.js. Fixed (filter before append).
2. OPEN (low-medium) Achievement pop-up stays about 4 s and covers screen titles (all screens) and the top of the well (Drop). Owner HUD-2 / MOTION-1.
3. OPEN (low) Rig at 1440x900: the pinned bar cuts the names of the first tray row at first view. Owner LAYOUT.
4. OPEN (low) Large text: 1 clipped text on Workshop, 2 on More at 320 (measured, not identified). Owner LAYOUT.
5. NOT CHECKED (low) "+1 Shards" plural wording.
6. NOT CHECKED (low) Tutorial box position on a brand-new save.
7. NOT SEEN (medium risk) Snap in a real browser. A passive Drop lasts over 140 s, longer than the "45 to 90 s" in the brief; probably by design, but check pacing with the owner.
8. NOT SEEN (low) Reduce motion: what stops moving.
9. NOTE (design) 1440x900 side areas, see below.
10. NOTE Screenshots here use the `busy` test save, so Welcome back and an achievement pop-up show on every screen; real play will show fewer.

## Art director note: plain dark sides at 1440x900
Home looks good as a phone-sized column, but the left and right thirds are flat navy with a few faint stars, so the screen feels like a phone pasted onto a desktop. Cheap fix with no change to the game: continue the Home sky and ground into the sides (same night gradient, a faint copy of the hills and well glow, darkened and blurred), and use a slow, very dark vignette on the other screens. Do not add anything bright or animated; it must not pull the eye from the column. Not done now (not tiny).

STATUS: NOT DONE (Snap not seen, tutorial and plural not re-checked, Reduce motion effect not measured)
