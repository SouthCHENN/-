#!/usr/bin/env bash
# 渲染应用图标 PNG（需 chromium + python3-pillow；本容器: /opt/pw-browsers/chromium）
# 注：headless chromium 对过小窗口会强制最小视口导致缩放，故统一 512 窗口渲染后裁切
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/opt/pw-browsers/chromium}"
ICON_HTML="file://$ROOT/scripts/icon.html"
RES="$ROOT/app/src/main/res"
WIN=512

shot() { # variant size out
  local tmp="$3.tmp.png"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 --default-background-color=00000000 \
    --window-size="$WIN,$WIN" --screenshot="$tmp" \
    "$ICON_HTML?variant=$1&size=$2" >/dev/null 2>&1
  python3 - "$tmp" "$3" "$2" <<'PY'
import sys
from PIL import Image
src, dst, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
Image.open(src).crop((0, 0, size, size)).save(dst)
PY
  rm -f "$tmp"
}

# 传统图标（API < 26 / 兜底）
shot legacy 48  "$RES/mipmap-mdpi/ic_launcher.png"
shot legacy 72  "$RES/mipmap-hdpi/ic_launcher.png"
shot legacy 96  "$RES/mipmap-xhdpi/ic_launcher.png"
shot legacy 144 "$RES/mipmap-xxhdpi/ic_launcher.png"
shot legacy 192 "$RES/mipmap-xxxhdpi/ic_launcher.png"

# 自适应图标前景层（API 26+，背景为纯色 @color/icon_bg）
shot fg 108 "$RES/mipmap-mdpi/ic_launcher_fg.png"
shot fg 162 "$RES/mipmap-hdpi/ic_launcher_fg.png"
shot fg 216 "$RES/mipmap-xhdpi/ic_launcher_fg.png"
shot fg 324 "$RES/mipmap-xxhdpi/ic_launcher_fg.png"
shot fg 432 "$RES/mipmap-xxxhdpi/ic_launcher_fg.png"

echo "icons done:"
file "$RES"/mipmap-*/*.png
