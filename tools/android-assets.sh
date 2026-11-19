#!/bin/sh
# Puts the Plumbline icon and a dark launch screen into the generated Android project.
# Run after "npx cap add android". Needs ImageMagick (present on GitHub runners).
# Cosmetic only: if anything here fails, the build must still go on.
command -v convert >/dev/null 2>&1 && command -v identify >/dev/null 2>&1 || { echo "ImageMagick missing: keeping default Android icons"; exit 0; }
RES=android/app/src/main/res
[ -d "$RES" ] || { echo "no android project yet"; exit 0; }
ICON=public/icon-512.png
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d=${pair%%:*}; px=${pair##*:}
  mkdir -p "$RES/mipmap-$d"
  convert "$ICON" -resize ${px}x${px} "$RES/mipmap-$d/ic_launcher.png" || echo "icon resize failed ($d)"
  convert "$ICON" -resize ${px}x${px} "$RES/mipmap-$d/ic_launcher_round.png"
  convert "$ICON" -resize ${px}x${px} "$RES/mipmap-$d/ic_launcher_foreground.png"
done
# The old adaptive icon points at a blank foreground; drop it so the real icon shows.
rm -rf "$RES"/mipmap-anydpi-v26
# Dark launch screen with the icon in the middle (same size as each splash file).
find "$RES" -name 'splash.png' | while read -r f; do
  size=$(identify -format '%wx%h' "$f")
  w=${size%x*}
  convert -size "$size" xc:'#070a12' \( "$ICON" -resize $((w/3))x \) -gravity center -composite "$f" || echo "splash failed ($f)"
done
echo "android icon and launch screen step finished"
exit 0
