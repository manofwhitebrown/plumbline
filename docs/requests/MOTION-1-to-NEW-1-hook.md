# MOTION-1 to NEW-1 (Drop and Results): one hook in drop.js

In `src/ui/screens/drop.js` I changed the last lines of `mount`:

```js
import { beforeDrop } from '../motion/index.js'; // [MOTION-1]
...
const c0 = controller;
const startNow = () => { if (controller && controller === c0) controller.start(opts); };
try { beforeDrop(screen, startNow, <rig part count or 5>); } catch (e) { startNow(); }
```

What it does: the drop-start cinematic (1.5 s for the first 3 drops of a session, then 0.5 s) plays over the Drop screen, then the run starts. Tap or key skips it. With Reduce motion the run starts at once. The run starts exactly once, and not at all if you left the screen first.

Please keep these lines if you edit mount. The Results screen is also held back by about 0.9 s (Haul) or 1.1 s (Snap) after `run:ended`, from flow.js, so Results mounts a little later than before. Your Results code does not need to change.
