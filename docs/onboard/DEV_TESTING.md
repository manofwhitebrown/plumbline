# Testing and installing (for the team, not for players)

Moved from docs/PLAY.md. Players read docs/PLAY.md.

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

## Install on Android

Plain steps. No computer skills needed. You need a phone and a Google/GitHub login on the phone or laptop.

### First install

1. Open the repo on GitHub and tap the **Actions** tab.
2. Tap the newest run called **Android** that has a green tick. (No green tick yet? Wait a few minutes and refresh.)
3. Scroll to the bottom to **Artifacts**. Tap `plumbline-debug-apk`. A zip file downloads.
4. Open the zip (tap it in your Files app, then **Extract**). Inside is one file ending in `.apk`.
5. Tap the `.apk`. Android may say "For your security, your phone is not allowed to install unknown apps from this source". Tap **Settings**, switch on **Allow from this source**, press Back, then tap **Install**.
6. Tap **Open**. The game is called **Plumbline**. After the first start it works with no internet.

### Update to a newer build

Every push to `main` makes a new test APK. A test APK is signed with a new key each time, so Android will not install it over the old one ("App not installed"). To update a test build and keep your game:

1. In the old Plumbline open **Settings > Export save** and copy the code somewhere safe (send it to yourself in a message).
2. Uninstall Plumbline (hold the icon > **App info** > **Uninstall**).
3. Install the new APK with the First install steps.
4. Open **Settings > Import save** and paste the code.

A signed release (below) updates in place with no uninstall, and your game stays.

### What to check on the phone

- The Back button goes back one screen. On Home it sends the game to the background and asks nothing.
- The game stays upright (it does not turn sideways).
- The screen does not go dark during a drop.
- Leave the game, come back later: your progress is there and the Crew gold you earned while away is waiting to claim.

### Make a signed release (the owner does this once, then it is two taps each time)

A release APK is signed with your own key, so it can update in place and later go to Google Play.

**Step 1. Make your key (one time).** On a computer with Java installed, open a terminal and run:

```
keytool -genkeypair -v -keystore plumbline-release.keystore -alias plumbline -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and some questions (name, city: anything is fine). **Write the password on paper. Keep the file `plumbline-release.keystore` somewhere safe, like two USB sticks or your password manager. If you lose it you can never update the app.** Never put this file on GitHub.

Turn the file into one line of text:

```
base64 -w 0 plumbline-release.keystore > keystore.b64.txt
```

(On a Mac use: `base64 -i plumbline-release.keystore | tr -d '\n' > keystore.b64.txt`)

**Step 2. Add 4 secrets on GitHub (one time).** Repo > **Settings > Secrets and variables > Actions > New repository secret**. Add these four, with these exact names:

| Name | What to paste |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | everything inside `keystore.b64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | the password you chose |
| `ANDROID_KEY_ALIAS` | `plumbline` |
| `ANDROID_KEY_PASSWORD` | the same password (unless you set a different one for the key) |

**Step 3. Tag a release.** Before you tag, ask the Manager to raise `version` in `package.json` (for example 0.1.0 to 0.1.1). Android only accepts an update with a higher version. Then pick one way:

- On the website: repo page > **Releases > Draft a new release > Choose a tag**, type `v0.1.1`, press **Create new tag**, then **Publish release**.
- Or in a terminal: `git tag v0.1.1` then `git push origin v0.1.1`.

**Step 4. Download it.** Wait about 10 minutes. Open the repo page > **Releases** (right side) > the newest one > under **Assets** tap `plumbline-v0.1.1.apk`. Install it like the First install steps.

If the Android run turns red, send the Manager the name of the red step. No secrets are stored in the repo: GitHub keeps them and only the build can read them.

