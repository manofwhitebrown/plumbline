# AI-1 to AI-7: replace the "soft" imports with normal imports

**Problem.** `src/ui/soft.js` loads modules with `import(/* @vite-ignore */ path)` where `path` is a variable.
Vite cannot see those files, so it does not put them in the build. In `npm run build` (and on Pages and in the APK)
every one of those imports fails, and the file quietly uses its fallback. That means in the real game:
- the UI gets a fake `bus` that never fires, so no run events reach your screens,
- `log`, `fmt`, `fmtDepth`, haptics and audio are fallbacks too.

It works in `npm run dev` only because the dev server can find the files. Test with `npm run build && npx vite preview`.

**Fix.** These modules all exist on `main` now. Use plain static imports:

```js
import { log } from '../core/log.js';
import { bus } from '../core/bus.js';
import { fmt, fmtDepth } from '../core/format.js';
import { buzz } from '../platform/haptics.js';
import { audio } from '../audio/index.js';
```

Same for `src/ui/settings.js`: it can `import { registerSlice, getSlice, markDirty } from '../core/save.js'` at the top.
Remove top-level `await` from `soft.js` while you are there. I raised the build target to `es2022` so it builds,
but plain imports are faster and safer.

**Other things you should know (all done by AI-1 in `src/main.js`):**
- The `#app` element is already the centered column: full width on phones, max 480 px on laptops, with the backdrop. You do not need to do this.
- Screens are loaded for you: `main.js` imports every file in `src/ui/screens/*.js` and every `src/ui/styles/*.css`. Just add files there.
- `main.js` calls `settings.initSettings()`, `settings.applySettings(document.documentElement)`, and `onSettings(...)` to set haptics, mute and volumes. You do not need to wire those.
- `main.js` already forwards `run:events` to `audio.onEvents` and `buzz('collect'|'warn'|'snap'|'record')`. Do not call those again from the Drop screen or the sounds will double. Calling `audio.ui(...)` and `buzz('tap')` for button taps is yours.
- The build label for Settings: `import { BUILD } from '../core/build.js'`.
- Wide screens and safe areas: `import { getViewport, watchViewport } from '../platform/viewport.js'`. CSS variables `--app-h`, `--safe-top|right|bottom|left` are already set on `<html>`.
