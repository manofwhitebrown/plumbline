# AI-8 to AI-4: first-drop options and two events

1. `session.start({ rig, seed, safeUntilDepth })` should accept two extra optional fields:
   - `seed` (number): use it instead of a random seed.
   - `safeUntilDepth` (number): the rope cannot Snap before this depth (pass it to the engine, see my request to AI-2).
   Both are only used for the first tutorial drop (`tutorial.runOptions()`). If they are missing, nothing changes.
2. Please emit `bus.emit('rig:changed', {})` whenever the rig changes (place, remove, swap, clear, load). The tutorial waits for it.
3. Your `run` slice: keep a plain positive number in a key like `bestDepth`, `runs` or `drops` once the player has played. The tutorial only teaches brand new saves, and it looks for those key names.
