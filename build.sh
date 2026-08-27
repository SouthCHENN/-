#!/usr/bin/env bash
# 「走着」APK 构建脚本（无 Android SDK 环境的手动管线）
#
# 依赖（Ubuntu/Debian apt 即装即用，无需 dl.google.com）：
#   apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 default-jdk
#
# 管线：aapt 生成 R.java → javac → dx(dalvik-exchange) → aapt 打包资源+assets
#       → aapt add classes.dex → zipalign → apksigner (v1+v2)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
AJ="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
MAIN="$ROOT/app/src/main"
OUT="$ROOT/build"
DIST="$ROOT/dist"
KS="$ROOT/keystore/zouzhe.keystore"
KS_PASS="zouzhe2026"
APK_NAME="zouzhe-v1.0.2.apk"

rm -rf "$OUT"
mkdir -p "$OUT/gen" "$OUT/classes" "$DIST" "$ROOT/keystore"

echo "==> [1/6] aapt 生成 R.java"
aapt package -f -m \
  -M "$MAIN/AndroidManifest.xml" \
  -S "$MAIN/res" \
  -I "$AJ" \
  -J "$OUT/gen"

echo "==> [2/6] javac 编译（target 8，dx 兼容）"
javac -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$AJ" -classpath "$AJ" \
  -d "$OUT/classes" \
  $(find "$MAIN/java" "$OUT/gen" -name '*.java') 2>&1 | grep -v '^warning:' || true
test -f "$OUT/classes/com/zouzhe/app/MainActivity.class"

echo "==> [3/6] dx 转 classes.dex"
dalvik-exchange --dex --min-sdk-version=26 --output="$OUT/classes.dex" "$OUT/classes"

echo "==> [4/6] aapt 打包资源 + assets（resources.arsc 不压缩，targetSdk30+ 安装要求）"
aapt package -f \
  -M "$MAIN/AndroidManifest.xml" \
  -S "$MAIN/res" \
  -A "$MAIN/assets" \
  -I "$AJ" \
  -0 arsc \
  -F "$OUT/unaligned.apk"
( cd "$OUT" && aapt add unaligned.apk classes.dex >/dev/null )

echo "==> [5/6] zipalign 4 字节对齐"
zipalign -f 4 "$OUT/unaligned.apk" "$OUT/aligned.apk"

echo "==> [6/6] apksigner 签名（v1+v2）"
if [ ! -f "$KS" ]; then
  echo "    生成签名密钥库 $KS"
  keytool -genkeypair -keystore "$KS" -alias zouzhe \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -dname "CN=Zouzhe Travel, OU=Zouzhe, O=Zouzhe, C=CN"
fi
apksigner sign --ks "$KS" --ks-key-alias zouzhe \
  --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --min-sdk-version 26 \
  --out "$DIST/$APK_NAME" "$OUT/aligned.apk"

apksigner verify --min-sdk-version 26 "$DIST/$APK_NAME"
echo "==> 完成: $DIST/$APK_NAME"
ls -la "$DIST/$APK_NAME"
