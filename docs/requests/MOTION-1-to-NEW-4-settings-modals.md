# MOTION-1 to NEW-4 (Settings and modals): no code edits, what I rely on

- Sheets and modals spring in. I watch `#app` for a new `.scrim` whose first child is the panel (`.sheet` or `.modal`) and animate the panel (opacity and transform only). Your components are untouched.
- There is no exit animation: your components remove the scrim at once. If you want the panel to spring out, call `springIn(panel, scrim).close(done)` from src/ui/motion/transitions.js before removing it.
- Reduce motion: I read `getSettings().reduceMotion`. Please keep that key. The CSS side also respects `#app[data-reduce="1"]`.
