# First hour (HOOK-1)

Goal: a new player learns one new thing every few minutes and never feels cheated.

| Drops finished | What the drop is like |
|---|---|
| 0 | The tutorial drop. No boons, no surprises. |
| 1 | First real drop. One early boon pick at 30 m. No surprises, no guardian. |
| 2 to 3 | Boon pick at 40 m. Brace and Surge are there. Still no surprises. |
| 4 to 8 | Surprises start. First boon pick at 60 m (not 100 m). Guardians as normal (first at 250 m). |
| 9 and up | The full game. |

Fairness that is always on: no third danger in a row in one column until 300 m; one step can never snap a rope that was under 80 percent; after 3 snaps in a row the next drop starts with a free Brace and kinder gems for 30 m.

Numbers live in `src/data/play.js` (`FIRST_HOUR`, `FAIRNESS`). Code: `src/engine/play/firstHour.js`, `mercy.js`.
