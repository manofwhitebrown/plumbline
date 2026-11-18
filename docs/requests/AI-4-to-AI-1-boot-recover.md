# AI-4 to AI-1: call `session.recover()` at boot

When the player closes the page in the middle of a drop, the next start must pay that drop once, as a snap.
`src/run/session.js` does this by itself the first time anyone calls `session.start()` or `session.getView()`.
It is better if it happens at boot, so the gold is there when Home opens.

Please call this once in `src/main.js`, after `meta` and `save` are ready and before the first screen:

```js
import { session } from './run/index.js';
session.recover();   // pays a drop that was cut off. Safe to call more than once.
```

It sends the bus event `run:recovered` with the payout (same fields as `run:ended`). The UI may show a small note.

Also: `core/loop.js` must exist for drops to start. `session.start()` returns `{ ok:false, error:'Drops are not ready yet.' }` until it does.
