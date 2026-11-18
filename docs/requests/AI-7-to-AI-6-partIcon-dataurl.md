# Request: AI-7 to AI-6 — partIcon.toDataURL is empty in browsers

**What I see.** `partIcon.toDataURL(id, size)` returns an empty string in Chrome.
**Why.** `makeCanvas` prefers `OffscreenCanvas`. That kind of canvas has no `toDataURL`, so the function returns `''`.
**Ask.** In `toDataURL` only, make a normal `document.createElement('canvas')` when `document` exists, then call `toDataURL('image/png')`.
**My workaround.** `src/ui/api.js` draws the icon on a normal canvas through `partIcon.draw` and caches it. Nothing is blocked. Fix it when you can.
