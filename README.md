# 走着 · 单文件离线旅行行程 App（Android）

「走着」的 Android WebView 壳工程 + 已签名 APK。一次旅行 = 一份数据包；本包内置 **意大利 13 天行程（2026.9.24–10.6）**：罗马 → 索伦托/卡普里 → 佛罗伦萨 → 威尼斯 → 米兰，110+ 时间线节点、住宿/餐厅/行李寄存、票务订位待办、应急电话。**全程离线可用**（字体、运行时、数据全部内置于单文件 HTML）。

## 安装包

**`dist/zouzhe-v1.2.1.apk`**（约 4.9 MB）

| 项 | 值 |
|---|---|
| 包名 | `com.zouzhe.app` |
| 版本 | 1.2.1 (versionCode 14) |
| minSdk / targetSdk | 23 (Android 6.0) / 34 (Android 14) |
| 签名 | v1 + v2 + v3 全方案（自签名，Android 6.x 亦可安装） |
| 方向/主题 | 竖屏锁定；深/浅双主题可切换（含状态栏/导航栏同步） |

### 小米 15 Pro 安装步骤
1. 把 `dist/zouzhe-v1.2.1.apk` 传到手机（微信文件传输助手 / USB / 网盘均可）。
2. 点击 APK → 系统提示「未知来源应用」→ 允许当前来源安装。
3. HyperOS 若弹「纯净模式」拦截，选择 **仍要安装**（或临时关闭纯净模式：设置 → 隐私与安全 → 纯净模式）。
4. 安装后打开即用；**飞行模式下全部行程数据可用**，「唤起在线地图」直接拉起本机高德/百度等地图 App 搜索该地址。

### 兼容性
- **系统版本**：Android 6.0+（minSdk 23）；targetSdk 34 避开 Android 15 强制 edge-to-edge，WebView 内容不被状态栏遮挡（小米 15 Pro / HyperOS 2 实测目标机型）
- **WebView 内核**：页面运行时用到 `??` 等 ES2020 语法，需 **Chromium 80+**（2020 年后更新过的 Android System WebView / 厂商内核均满足）；启动时自动检测，内核过旧会弹窗引导更新而非白屏；个别无 WebView 组件的精简 ROM 会提示后优雅退出
- **屏幕适配**：360–800px 逻辑宽度实测布局完好（360×640 / 360×800 / 393×873 / 412×915 / 480×1067 / 800×1280），超过 520px 内容居中（平板可用）；竖屏/触屏/多点触控均声明为非必需，平板、Chromebook、无通话功能设备可安装
- **无 GMS 设备**（华为等）：不依赖 Google 服务；地图走 `geo:`/高德/百度 deeplink，系统自带地图亦可响应

## 新增功能（v1.1.x 插件层）
- **每日离线地图**（行程页「精简行程」路线卡同框内嵌预览，随所看日期联动）：13 天共 23 张手绘示意地图，参照真实地理——道路名（中/意双语）、参照物、行进方向箭头、时刻锚点、指北针；步行=青实线、车/船=品红虚线、海路=青点线；多场景日拆多张子图，地图在路线卡内位于站点图上方，点击站点仅切换对应场景的地图（不弹节点卡；节点详情仍从时间线进入），当前所看行程段的站点在路线图上青色高亮标示；点击预览图全屏，**双指缩放/拖动平移/双击放大**看清名称与方向；断网/迷路场景完全可用（全部内置，无需网络）
- **深浅主题切换**（「走着」banner 右上角 ☀/☾ 图标，34×34 热区）：浅色版为白天户外阅读调校（纸白底+深色字，品牌青/品红自动映射为日间色），状态栏/导航栏颜色与图标明暗随之切换；选择持久化，重启保持；不影响 App 原交互主流程
- **行程点厕所位置**（节点详情卡尾独立分区）：源自《如厕作战手册》，13 天约 50 个节点带点位/价格/干净度星级/要点；缺厕场景（庞贝、跳水日、威尼斯大殿等）品红警示样式
- **票根上传与展示**（原图存 IndexedDB，离线持久）：节点详情卡「本节点票根」区直接添加（壳层 onShowFileChooser 拉起相册/文件选择器）；行程页「本日票根」卡聚合当天全部节点（缩略图带节点名角标），添加时先选所属节点；长按缩略图删除（二次确认）；点击全屏查看原图，下拉手势关闭
- 插件层独立注入（`addon/` + `scripts/inject_addon.py`），不修改 App 编译产物内部逻辑

## 功能（壳层职责）
- WebView 加载 `assets/index.html`（自包含离线单文件），`domStorageEnabled` 开启 → 勾选/进度经 localStorage 持久化
- 拦截 `tel:` → 系统拨号盘；「唤起在线地图」解析出地址关键词后 deeplink 直拉本机地图 App（`geo:` 系统选择器 → 高德 `androidamap://` → 百度 `baidumap://` 逐级兜底，全部未装才回落浏览器）；其余外链 → 外部浏览器
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
addon/                                    # 插件层：每日地图数据×3 + 查看器/主题框架
design/                                   # 设计交付物（源文件/运行时/规格/行程原稿）
scripts/                                  # 图标渲染（chromium headless + SVG）
build.sh                                  # 构建脚本
keystore/zouzhe.keystore                  # 签名密钥库（口令 zouzhe2026，仅自用侧载）
dist/zouzhe-v1.2.1.apk                    # 交付安装包
```

## 从源码构建
本工程不依赖 Android SDK（dl.google.com），全部工具来自 Debian/Ubuntu 仓库：

```bash
apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 default-jdk
./build.sh          # 产物: dist/zouzhe-v1.2.1.apk
```

管线：`aapt`(R.java) → `javac`(target 8) → `dx` → `aapt package`（resources.arsc 不压缩，满足 targetSdk 30+ 安装要求）→ `zipalign` → `apksigner`(v1+v2 签名，Android 7+ 实际启用 v2/v3)。

图标重新生成（需 chromium + Pillow）：`scripts/gen_icons.sh`。
地图/主题插件改动后重新注入：`python3 scripts/inject_addon.py`（幂等），再 `./build.sh`。

## 换一次旅行
数据模型见 `design/README.md`。替换 `app/src/main/assets/index.html` 为新旅行的离线单文件，改 `versionCode/versionName` 后重新 `./build.sh` 即可（同一密钥库签名可覆盖安装）。

> ⚠️ 密钥库口令已明文写入本仓库，仅适用于个人侧载分发；如需上架或对外分发，请更换新密钥库并妥善保管口令。
