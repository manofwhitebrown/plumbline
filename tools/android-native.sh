#!/bin/sh
# Native settings for the generated Android project. Run after "npx cap add android".
# Does: portrait lock, version from package.json, bar colours, and the Back button hook.
# Each step checks first and is safe to run twice. A step that fails is skipped, never fatal.
APP=android/app
MAN=$APP/src/main/AndroidManifest.xml
STY=$APP/src/main/res/values/styles.xml
GRADLE=$APP/build.gradle
[ -d "$APP" ] || { echo "no android project yet"; exit 0; }

# 1. Portrait only.
if [ -f "$MAN" ] && ! grep -q 'screenOrientation' "$MAN"; then
  sed -i 's|android:launchMode="singleTask"|android:launchMode="singleTask"\n            android:screenOrientation="portrait"|' "$MAN" && echo "portrait lock added" || echo "portrait lock skipped"
fi

# 2. Version name and code from package.json (0.1.0 -> name 0.1.0, code 100; 1.2.3 -> 10203).
if [ -f "$GRADLE" ] && command -v node >/dev/null 2>&1; then
  VN=$(node -p "require('./package.json').version" 2>/dev/null)
  VC=$(node -p "const [a,b,c]=String(require('./package.json').version).split('.').map(n=>parseInt(n,10)||0); a*10000+b*100+c" 2>/dev/null)
  case "$VN" in ''|*[!0-9.]*) VN="" ;; esac
  case "$VC" in ''|*[!0-9]*) VC="" ;; esac
  if [ -n "$VN" ] && [ -n "$VC" ] && [ "$VC" -gt 0 ]; then
    sed -i "s|versionCode [0-9][0-9]*|versionCode $VC|; s|versionName \"[^\"]*\"|versionName \"$VN\"|" "$GRADLE" && echo "version $VN (code $VC)" || echo "version skipped"
  fi
fi

# 3. Dark status bar and gesture bar, so no white flash and no light strip.
if [ -f "$STY" ] && ! grep -q 'navigationBarColor' "$STY"; then
  sed -i 's|<item name="android:background">@null</item>|<item name="android:background">@null</item>\n        <item name="android:statusBarColor">#070a12</item>\n        <item name="android:navigationBarColor">#070a12</item>|' "$STY" && echo "bar colours added" || echo "bar colours skipped"
fi

# 4. Back button: ask the game first. Home (nothing to go back to) sends the app to the background.
# Also tell the game when the app goes to the background or comes back, so it saves and pays income.
MAIN=$(find "$APP/src/main/java" -name MainActivity.java 2>/dev/null | head -1)
if [ -n "$MAIN" ] && ! grep -q 'plumblineBack' "$MAIN"; then
  PKG=$(sed -n 's/^package \(.*\);/\1/p' "$MAIN" | head -1)
  if [ -n "$PKG" ]; then
    cp "$MAIN" "$MAIN.stock"
    cat > "$MAIN" <<JAVA
package $PKG;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private void tell(String js) {
        try {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            getBridge().getWebView().evaluateJavascript(js, null);
        } catch (Exception e) {
            // never crash for a message to the game
        }
    }

    @Override
    public void onBackPressed() {
        try {
            WebView web = getBridge() == null ? null : getBridge().getWebView();
            if (web == null) {
                moveTaskToBack(true);
                return;
            }
            web.evaluateJavascript(
                "(function(){try{return window.__plumblineBack?window.__plumblineBack():'exit'}catch(e){return 'exit'}})()",
                value -> {
                    if (value == null || !value.contains("handled")) {
                        moveTaskToBack(true);
                    }
                });
        } catch (Exception e) {
            moveTaskToBack(true);
        }
    }

    @Override
    public void onPause() {
        tell("window.dispatchEvent(new Event('plumbline:background'))");
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        tell("window.dispatchEvent(new Event('plumbline:foreground'))");
    }
}
JAVA
    echo "back button hook added"
  fi
fi
echo "android native steps finished"
exit 0
