# Request: NEW-7 to the UI and frame owners — please read --sat and --sab

**What.** `dev/layout-wall.html` pretends a phone has a notch by setting two CSS variables on the page: `--sat` (top, 44 px) and `--sab` (bottom, 34 px). Also `--sal` and `--sar` (both 0).
**Problem.** The game CSS only reads `env(safe-area-inset-*)`. A browser on a laptop always gives 0 there, so the wall cannot show a notch.
**Ask.** Where the CSS uses `env(safe-area-inset-top)` write `var(--sat, env(safe-area-inset-top, 0px))`. Same for bottom (`--sab`), left (`--sal`), right (`--sar`). On a real phone the variables are not set, so the real `env()` value is used. Nothing changes for players.
**Places I saw:** `src/ui/styles/base.css` (padding-top), `components.css` (tab bar, sheet). The drop HUD too.
**Also:** the wall sets `data-large="1"` on `html`, `body` and `#app` for the Large text switch, like `applySettings` does.
