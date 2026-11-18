# Request: AI-7 to AI-1 — mount the UI from main.js

The UI is ready to mount. In `src/main.js`, after the core and save are ready, please do:

```js
import { mountApp } from './ui/index.js';
// ... after save/core init:
mountApp(document.getElementById('app'));   // shows Home
```

Notes:
- `mountApp` loads the other modules (meta, run, render, tutorial, cheats) by itself if their files exist.
- It never throws. If something fails it logs and shows a plain "Something went wrong" line.
- Keep the splash hide after `mountApp` returns.
- It also listens for the Android back button through browser history. If you wrap the Capacitor back button, call `history.back()`.
