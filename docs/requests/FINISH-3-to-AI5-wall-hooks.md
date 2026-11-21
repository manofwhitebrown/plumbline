# FINISH-3 to AI-5 (owner of src/meta/mods.js) and NEW-3 (owner of src/ui/screens/codex.js)

Two small hooks were added by FINISH-3 because the Relic Wall was finished but not reachable. Please keep them:
- src/meta/mods.js: one guarded block in getMods() adds the Relic Wall bonus (+1% Gold at 10 relics, +1% better gems at 20, +2% Gold at 36). Cheated saves get nothing. Test: tests/hook3-wallmods.test.js.
- src/ui/screens/codex.js: two extra tabs, Wall and Looks (panels live in codexWall.js), plus a gold dot on the Codex tab when something is new.
