# How to play Plumbline

## Play on laptop

1. Open **https://manofwhitebrown.github.io/plumbline/**
2. The game shows as a tall column in the middle of the window. That is on purpose.
3. Keys: **Space** = Drop / Haul Up, **R** = Rig, **Esc** = back or pause.

Every push to `main` makes a new build. It takes about 2 minutes to appear.
The build label is in **Settings** (bottom of the page). It looks like `Plumbline v0.1.0 · build abc1234 · 2026-11-18`. Compare it with the latest commit to see if you have the newest build.

### The page looks old?

1. Hard refresh: **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (Mac).
2. Still old? Clear the site data: browser menu > Settings > Privacy > Site data > find `manofwhitebrown.github.io` > Clear.
   (This also clears your saved game on this browser. Use Settings > Export save first if you want to keep it.)

### Jump to any screen (for testing)

Add `?debug=1` to the address. Then:

- `?debug=1&screen=rig` opens a screen. Names: home, rig, drop, results, crew, workshop, codex, rewards, settings, guide.
- `?debug=1&fixture=busy` loads a test game. Names: `empty`, `busy`, `extreme`.
- Put them together: `?debug=1&screen=results&fixture=extreme`.

Test games live only in the page. Your real saved game is never touched, and nothing is saved. Reload the page without `?debug=1` to get your real game back.

## Play on phone

1. On GitHub open the **Actions** tab, click the newest **Android** run.
2. At the bottom, under **Artifacts**, download `plumbline-debug-apk` and unzip it.
3. Send the `.apk` to your phone and tap it. If asked, allow "Install unknown apps" for your file app.
4. Open **Plumbline**. It works offline.

The APK is built on every push to `main`. If the newest Android run is not green yet, wait a few minutes and try again.

For a signed release APK, see [ANDROID.md](ANDROID.md).
