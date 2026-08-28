# 照着走 · 小红书行程截图 → 地图多段导航

把小红书上截到的行程，转成高德/百度地图的多段路线（带途经点），点一下就能开始导航。

产物是**单文件** `index.html`，手机浏览器直接打开即用。不填任何 Key 也能跑。

## 快速开始

```bash
python3 build.py     # src/ → index.html
```

把 `index.html` 传到手机（微信文件传输助手 / 网盘 / 自己的静态托管）用浏览器打开。
或者本地起个服务看效果：`npx http-server . -p 8080`。

## 两种用法

### 零 Key（开箱即用，全程不联网）

粘贴小红书文案 → 解析 → 核对 → 生成链接。
解析在本地完成，不上传任何东西。

得到的是**逐段导航**：N 个地点拆成 N-1 段，每段 A→B 用地名直传给地图。
每到一站回来点下一段。

### 填 Key（一条链接带完整行程）

在设置里填地图 Key → 点「解析坐标」→ 生成链接。
得到的是**真·多途经点**：一条链接包含起点、途经点、终点。

**为什么必须要坐标**：高德的 `vialons`/`vialats` 和百度的 `viaPoints` 都把经纬度写成必填字段。
起点和终点可以只给名字（地图自己搜），但途经点不行——地图收到多点路线时不会挨个弹搜索框让你确认。
详见 [`RESEARCH.md`](RESEARCH.md)。

## 高德还是百度

| | 高德 | 百度 |
|---|---|---|
| 带途经点能否直接进导航 | **不能**，落到路线规划页，需再点一次「开始导航」 | **能**（`baidumap://map/navi` + `viaPoints`） |
| 途经点上限 | 官方未定义；工具默认 3，可放宽到 10 | 官方明文 3 个 |
| 证据强度 | 参数未进官方参数表（旁证：高德自家 JS API 源码 + 官方活动页） | 逐字对照官方 SDK 源码 |

工具两家链接都生成，你现场挑。

## 图片识别（可选）

选截图 → 交给你配置的多模态模型 → 出地点列表。

内置 4 个预设：通义千问 VL、豆包视觉、Claude、自定义 OpenAI 兼容端点。
endpoint 和模型名都在 UI 里可改。

> 千问和豆包的默认 endpoint / 模型名**没能一手核对**（构建环境访问不了 `help.aliyun.com`
> 和 `www.volcengine.com`），按公开检索填的，以官方控制台为准。
> 豆包的 `model` 通常要填控制台的**接入点 ID（`ep-` 开头）**，不是模型名。

图片会先压到长边 1280px 再上传。

## 撞 CORS 怎么办

浏览器直连大模型和地图的服务端 API 大概率被跨域拦截——它们是服务端 API，不发 `Access-Control-Allow-Origin`。

`proxy/worker.js` 是一个可直接部署到 Cloudflare Workers 的最小转发代理（带域名白名单）。
部署后把地址填进「设置 → 代理」，所有外部请求会经它转发。

零 Key 用法完全不联网，不受这个问题影响。

## 微信内打不开

微信只对合作方放行 scheme 唤起，高德/百度不在白名单里，**没有参数能绕过**。
工具检测到微信环境会直接提示「右上角 → 在浏览器中打开」，不做无谓尝试。

## 工程结构

```
src/
  parse.js            小红书文案 → 有序地点列表（纯本地，无依赖）
  vision.js           可配置多模态识别（openai / anthropic 两种方言）
  geocode.js          地点名 → 坐标（百度优先，可切高德），就近消歧
  links.js            坐标/地名 → 各端导航链接
  net.js              统一网络层 + 图片压缩，CORS 失败给可诊断的错误
  style.css
  app.js              UI 与状态
  index.template.html
build.py              打包成单文件 index.html
proxy/worker.js       可选 Cloudflare Worker 转发代理
test/                 解析器样本、链接层单测、Playwright 端到端
RESEARCH.md           每条接口结论的证据等级与来源
index.html            产物
```

各模块是 UMD，node 与浏览器共用，可以单独 `require` 做测试。

## 测试

```bash
node test/run.js          # 解析器：5 种小红书版式样本
node test/links.test.js   # 链接层：有/无坐标、分段切割边界
node test/e2e.js          # Playwright 端到端（412×915 Android UA）
```

## 已知边界

- 高德的 `vian` 系列参数未进官方参数表，**需要真机实测**
- 百度传 2 个以上途经点未经实测（官方 SDK 在这条路径上有个真实 bug，见 `RESEARCH.md`）
- 解析器只负责拿到 80%，剩下的靠 UI 里增删改排序
- Key 存在浏览器 localStorage 里。自用没问题；要分享给别人用，把 Key 放进代理的环境变量

完整的证据等级与待实测清单：[`RESEARCH.md`](RESEARCH.md)
