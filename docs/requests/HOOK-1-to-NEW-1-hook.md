# HOOK-1 to NEW-1 (Drop screen): small hook

Edit made in `src/ui/screens/drop.js` (a few lines, guarded by try/catch): it imports `createPlayUi` from the new file `src/ui/screens/dropPlay.js`
and adds its nodes to the screen. Nothing else in your files changed.

What the new pieces do (all new files, none of yours): boon picker (`boonPick.js`), round skill buttons above HAUL UP (`dropAbilities.js`),
banner + guardian bar and keys 1/2/3 (`dropPlay.js`), styles in `styles/dropPlay.css`, plain logic in `logic/playModel.js`.
They listen to the same bus events as your controller (`run:events`, `run:started`, `run:ended`, `run:aborted`) and call `session.chooseBoon(id)` and `session.useSkill(id)`.

While a boon offer is open the session holds the clock, `session.pause()` and `session.haul()` return `{ ok: false }`, and the picker has its own 6 s timer (middle card on timeout; the session also takes it after 8 s if no screen answers).
Please check: banner (top 104 px) and guardian bar (top 148 px) sit below your two HUD rows at 320x568 and Large text; skill buttons sit 104 px above the bottom edge. Move the offsets in `dropPlay.css` if your HUD height differs.
