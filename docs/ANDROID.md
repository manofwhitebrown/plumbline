# Android guide (for the owner)

Every step is plain. Copy and paste the commands.

## 1. Turn on the laptop test page (one time)

1. Open the repo on GitHub.
2. Go to **Settings > Pages**.
3. Under **Source**, choose **GitHub Actions**.
4. Push anything to `main`. In a few minutes the game is at https://manofwhitebrown.github.io/plumbline/

## 2. Get the debug APK (no setup needed)

1. Go to **Actions** > click the newest **Android** run (green tick).
2. Scroll down to **Artifacts** > download `plumbline-debug-apk`.
3. Unzip it. Copy the `.apk` to your phone and open it.

A debug APK is fine for testing. It cannot go on the Play Store.

## 3. Make a signing key (one time, for a release APK)

You need Java installed. Run this on your computer:

```bash
keytool -genkeypair -v -keystore plumbline-release.keystore -alias plumbline -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and a few questions. **Write the password down. Keep the keystore file safe. If you lose it you cannot update the app.** Never put the keystore in the repo.

Turn the keystore into one line of text:

```bash
# Mac / Linux
base64 -w 0 plumbline-release.keystore > keystore.b64.txt
# Mac (if -w fails)
base64 -i plumbline-release.keystore | tr -d '\n' > keystore.b64.txt
```

## 4. Add four secrets on GitHub

Repo > **Settings > Secrets and variables > Actions > New repository secret**. Add:

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the whole text inside `keystore.b64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `plumbline` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the keystore password if you did not set another) |

## 5. Make a release

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub builds, signs and attaches `plumbline-v0.1.0.apk` to a new Release. Find it under **Releases** on the repo page.

## If the build fails

Open the failed run in **Actions**, click the red step, and send the last 30 lines to the Manager.
