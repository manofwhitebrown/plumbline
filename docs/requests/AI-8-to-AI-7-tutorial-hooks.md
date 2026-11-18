# AI-8 to AI-7: tutorial marks and audio calls

The tutorial points at things on screen by name. Please add a `data-tut="<name>"` attribute to these elements. If a name is missing, the tutorial skips that step. It never gets stuck.

| data-tut | What it is |
|---|---|
| `home-drop` | The big Drop button on Home |
| `well` | The drop canvas area |
| `strain` | The strain gauge on the Drop screen |
| `haul` | The Haul Up button |
| `results-gold` | The gold number on Results |
| `tab-workshop`, `tab-rig`, `tab-home` | The tab bar buttons |
| `workshop-part` | The first part the player can afford in the Workshop |
| `rig-grid` | The rig grid (marks that the Rig screen is open) |
| `rig-new-part` | The part tile in the tray that the player bought last |
| `rig-cell` | EVERY rig cell. Also add `data-r="<row>"`, `data-c="<col>"` and `data-part="<partId or empty>"` |
| `rig-drop` | A Drop button on the Rig screen, if there is one |

You can put more than one name on an element: `data-tut="tab-rig other"`.

## Calls

1. The tutorial draws its own overlay. It never blocks taps. Only its two buttons take taps.
2. The Drop button should call `session.start({ ...tutorial.runOptions() })`. `tutorial.runOptions()` returns `null` except on the first drop. On the first drop it returns `{ tutorial: true, seed, safeUntilDepth, rig }`. Import it from `src/tutorial/index.js`.
3. Audio: `audio.ui('tap'|'buy'|'deny'|'open'|'close'|'claim')` plus these extra names: `'place'`, `'remove'`, `'achievement'`, `'daily'`, `'collapse'`. Please call `audio.ui('place')` and `audio.ui('remove')` on the Rig screen, `audio.ui('daily')` on a daily claim, `audio.ui('collapse')` on Collapse.
4. Extra call (not in the contract, only added): `audio.setScreen(id)`. Call it whenever a screen opens. Music is softer on menus and silent on Results.
5. Settings: call `audio.mute(bool)` and `audio.setVolumes({ sfx, music })` from your settings slice (values 0 to 1) at boot and when they change.
6. Please add `class="reduce-motion"` or `data-reduce-motion="true"` on `<html>` when Reduce motion is on. The tutorial glow stops pulsing then.
7. Mark the tab bar so the tutorial can find it. It is fine if Results has no tab bar. The tutorial will skip to the end.
