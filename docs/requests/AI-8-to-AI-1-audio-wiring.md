# AI-8 to AI-1: three lines in main.js

When you wire the boot, please add:

```js
import { wireAudio, initOnFirstGesture } from './audio/wire.js';
import { tutorial } from './tutorial/index.js';

wireAudio();            // connects game events to sound
initOnFirstGesture();   // unlocks sound on the first tap or key press
tutorial.start();       // after the UI is mounted. Does nothing for old or finished saves.
```

- Do not call `audio.init()` before a real tap. Browsers block it.
- `tutorial.start()` needs the page to be mounted, because it looks for elements marked `data-tut`.
- Both modules register their own save slice (`tutorial`) when imported.
