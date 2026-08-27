# 走着 · 单文件离线旅行行程 App（Android）

「走着」的 Android WebView 壳工程 + 已签名 APK。一次旅行 = 一份数据包；本包内置 **意大利 13 天行程（2026.9.24–10.6）**：罗马 → 索伦托/卡普里 → 佛罗伦萨 → 威尼斯 → 米兰，110+ 时间线节点、住宿/餐厅/行李寄存、票务订位待办、应急电话。**全程离线可用**（字体、运行时、数据全部内置于单文件 HTML）。

## 安装包

**`dist/zouzhe-v1.0.1.apk`**（约 4.9 MB）

| 项 | 值 |
|---|---|
| 包名 | `com.zouzhe.app` |
| 版本 | 1.0.1 (versionCode 2) |
| minSdk / targetSdk | 26 (Android 8.0) / 34 (Android 14) |
| 签名 | APK Signature Scheme v2 + v3（自签名） |
| 方向 | 竖屏锁定，深色主题 `#0A0F1C`（含状态栏/导航栏） |

### 小米 15 Pro 安装步骤
1. 把 `dist/zouzhe-v1.0.1.apk` 传到手机（微信文件传输助手 / USB / 网盘均可）。
2. 点击 APK → 系统提示「未知来源应用」→ 允许当前来源安装。
3. HyperOS 若弹「纯净模式」拦截，选择 **仍要安装**（或临时关闭纯净模式：设置 → 隐私与安全 → 纯净模式）。
4. 安装后打开即用；**飞行模式下全部行程数据可用**，仅「唤起在线地图」需联网。

> 兼容性说明：小米 15 Pro（Android 15 / HyperOS 2）。targetSdk 34 避开 Android 15 强制 edge-to-edge，保证 WebView 内容不被状态栏遮挡；设计稿目标视口 412×915 即该机型逻辑分辨率，已按此视口冒烟验证渲染。

## 功能（壳层职责）
- WebView 加载 `assets/index.html`（自包含离线单文件），`domStorageEnabled` 开启 → 勾选/进度经 localStorage 持久化
- 拦截 `tel:` → 系统拨号盘；拦截外部 http(s)（Google Maps 等）→ 外部浏览器/地图 App
- `file://` 属非安全上下文，`navigator.clipboard` 不可用 → 注入 `ZouzheBridge` 剪贴板桥接，保证「复制地址/电话」可用
- `textZoom=100` 锁定，系统字体缩放不破坏像素级设计稿布局
- 返回键：WebView 有历史则后退，否则退出

## 工程结构
```
app/src/main/
  AndroidManifest.xml
  java/com/zouzhe/app/MainActivity.java   # 唯一 Activity（无 androidx 依赖）
  assets/index.html                       # 离线单文件（勿手改，见 design/README.md）
  res/                                    # 主题、字符串、自适应图标
design/                                   # 设计交付物（源文件/运行时/规格/行程原稿）
scripts/                                  # 图标渲染（chromium headless + SVG）
build.sh                                  # 构建脚本
keystore/zouzhe.keystore                  # 签名密钥库（口令 zouzhe2026，仅自用侧载）
dist/zouzhe-v1.0.1.apk                    # 交付安装包
```

## 从源码构建
本工程不依赖 Android SDK（dl.google.com），全部工具来自 Debian/Ubuntu 仓库：

```bash
apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 default-jdk
./build.sh          # 产物: dist/zouzhe-v1.0.1.apk
```

管线：`aapt`(R.java) → `javac`(target 8) → `dx` → `aapt package`（resources.arsc 不压缩，满足 targetSdk 30+ 安装要求）→ `zipalign` → `apksigner`(v1+v2 签名，Android 7+ 实际启用 v2/v3)。

图标重新生成（需 chromium + Pillow）：`scripts/gen_icons.sh`。

## 换一次旅行
数据模型见 `design/README.md`。替换 `app/src/main/assets/index.html` 为新旅行的离线单文件，改 `versionCode/versionName` 后重新 `./build.sh` 即可（同一密钥库签名可覆盖安装）。

> ⚠️ 密钥库口令已明文写入本仓库，仅适用于个人侧载分发；如需上架或对外分发，请更换新密钥库并妥善保管口令。
