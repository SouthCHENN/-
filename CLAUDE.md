# 项目约定与个人偏好

## 交付前必须功能级验证（个人偏好 · 重要）

针对 APK / App 的复现、构建或修复，**不得仅凭结构/签名检查就交付**。交付前必须：

1. **先定位并修复根因**，不做表面缝补。
2. **找到一种真实可行的验证方式并实跑**（本项目：用 Playwright + 预装 Chromium
   以 WebView 方式实跑 `assets/index.html`，见下方脚本），把用户报告的每个场景都
   写成断言逐一跑通。
3. **全部通过后再推送/交付**，并附上验证结论（必要时附截图）。

即「修复 → 在（GitHub 上的开源工具等）找到验证方式 → 明确无问题 → 再交付」。

## 返回/导航规则

实现返回逻辑前，**先把层级关系梳理清楚并确认**，再严格按层级逐层返回：

```
行程列表 → 行程详情·总览 → 今日/待办 → (节点详情浮层 票根/厕所 | 地图浮层)
```

- 系统返回 / 左滑 / 走着 logo 统一经 `popstate` 处理（单一入口）。
- 采用「单哨兵历史模型」：进入行程压入 1 个哨兵历史项；每次停留在行程内的返回都
  补回 1 个哨兵；返回到行程列表时不补 → 再次返回才退出 App。
- 底层 React 应用自身不使用 history API（已实测：打开浮层 0 次 pushState）。

## 走哲Pro 构建 / 验证速查

- 源码与脚本在 `work/`；构建：`cd work && venv/bin/python rebuild_apk.py <版本>`。
- 构建 = 向原版 `dist/zouzhe-v1.2.2.apk` 的 HTML 注入 `multi_trip_v3.js` + 改包名
  `com.zouzhe.app→com.zouzhe.pro` + Activity 名改绝对类 `com.zouzhe.app.MainActivity`
  + `sign-apk-py` 做 V2+V3 签名。详见 `work/README.md`。
- 功能验证（WebView 实跑）：
  ```bash
  # 提取待测 HTML
  python3 - <<'PY'
  import zipfile;z=zipfile.ZipFile("outputs/走哲Pro_<版本>.apk")
  open("/tmp/zz/index.html","wb").write(z.read("assets/index.html"))
  PY
  # 用 Playwright 加载 file:///tmp/zz/index.html，注入 window.ZouzheBridge 桩，
  # 断言：各行程 phase=pre / 层级返回 sheet→today→overview→list→退出。
  # Chromium: /opt/pw-browsers/chromium-1194/chrome-linux/chrome
  ```
- 易踩坑：切换行程必须同时设置 `compInst.Y`（年份），否则 `dateOf()/nowDate()`
  用错年份把未来行程算成「已结束」。
