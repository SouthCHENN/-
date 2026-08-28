# 调研结论与证据等级

本文件记录「照着走」所依赖的每一条地图接口事实、它的证据强度、以及**哪些必须由你在真机上点一次才能定论**。
代码里的每个链接模板都对应这里的一行。

## 证据等级

| 标记 | 含义 |
|---|---|
| **一手** | 在官方 SDK 源码、官方头文件、官方 GitHub 组织仓库里**逐字看到** |
| **二手** | 只有搜索引擎对官方文档页的摘要转述，官方页面原文未能读到 |
| **工程惯例** | 多个互相独立的真实生产仓库写法一致，但无官方出处 |
| **未证实** | 有说法但缺一手证据，或被一手证据部分反证 |

> ⚠️ **本次调研的根本限制**：执行环境的出网策略封禁了 `lbs.amap.com`、`developer.amap.com`、
> `lbsyun.baidu.com`、`lbs.baidu.com`、`api.map.baidu.com`、`help.aliyun.com`、
> `www.volcengine.com`、`developers.weixin.qq.com`、CSDN、掘金、archive.org 等**全部中文官方文档域名**。
> 凡标「一手」的结论，靠的是改用可达的替代一手源：反编译的百度官方 Android SDK、
> 百度官方 iOS 头文件 `BMKNavigation.h`、百度官方 Flutter 插件源码、百度官方 GitHub 组织
> `baidu-maps` 的参数表、高德自家 JS API 的打包产物、以及高德官方活动页 `act.amap.com` 发出的真实链接。
> **官方文档页原文一次都没有读到。**

---

## 一、最重要的三条结论

### 1. 途经点一律需要经纬度，起终点可以只给名字

| 接口 | 途经点参数 | 坐标是否必需 |
|---|---|---|
| 高德 Web `uri.amap.com/navigation` | `via=经度,纬度,名称` | 必需（坐标是位置参数） |
| 高德 App scheme | `vian` + `vialons`/`vialats`/`vianames` | 必需（经度、纬度、名称三个等长列表） |
| 百度 App scheme | `viaPoints={"viaPoints":[{name,lat,lng}]}` | 必需（`lat`/`lng` 是 JSON 必需键） |

**推论**：不填地图 Key 就拿不到坐标，拿不到坐标就传不了途经点。
本工具因此设计成双轨——无 key 时降级为逐段导航（每段 A→B 用地名直传），填了 key 升级为真·多途经点。

补充（**一手**）：高德 `uri.amap.com/navigation` 的 `from`/`to` 同样要求「经度,纬度,名称」，
**纯名字不成立**，只能退化到 `uri.amap.com/search?keyword=`。而百度 `direction` 的
`origin`/`destination` **支持纯地名**——这是零 key 路径选百度作主力的原因。

### 2. 「多途经点 + 直接开始导航」只有百度能做到

- **百度**（**一手**）：`baidumap://map/navi` 的构造器里确实 `append("&viaPoints=")`，
  且 navi 就是直接进入导航态的入口。参数与拼接顺序逐字对照官方 Android SDK：
  `origin / origin_uid / location / destination_uid / src / viaPoints / type / mode`。
  iOS 侧 `BMKNavigation.h` 声明了 `NSArray<BMKPlanNode *> *viaPoints`，两端语义一致。
- **高德**（**二手**）：能一键直达导航的 `androidamap://navi` 结构上**没有途经点参数位**；
  带途经点的 `amapuri://route/plan/` 落地是**路线规划页**，用户需再点一次「开始导航」。
  这是高德 scheme 体系的结构性限制，不是参数没找对。

### 3. 百度官方 SDK 自己有一个多途经点 bug

（**一手**）`NaviParaOption.getWayPoint()` 里 `JSONObject` 被分配在 `for` 循环**之外**，
循环内每次 `put` 覆盖同一个对象，再把**同一个引用**压进 `JSONArray` N 次。
即：**百度官方 SDK 传 2 个以上途经点时，实际生成的 JSON 是「最后一个途经点重复 N 遍」。**

含义有两层：

1. 「官方 SDK 源码印证了多途经点写法」这条证据**只对单个途经点成立**。2 个以上仍需实测。
2. 本工具自己构造 JSON（每个途经点是独立对象），在这一点上比官方 SDK 正确。

---

## 二、已核实可用的模板

### 百度（**一手**，逐参数对照官方 SDK 构造器）

```
带途经点直接进导航态（首选）
baidumap://map/navi?origin={起点纬度},{起点经度}&location={终点纬度},{终点经度}
  &src={andr|ios}.{公司}.{应用}&viaPoints={URLEncode(JSON)}&mode={driving|neweng}
  &type={BLK|TIME|DIS|FEE|HIGHWAY|DEFAULT}

路线规划页（参数集已核实，途经点未证实）
baidumap://map/direction?origin=name:{名}|latlng:{纬度},{经度}&destination=...
  &mode={driving|transit|walking|neweng|truck}&target=1&src=...
```

修正了三处早期错误结论：

- 终点用 `location=纬度,经度`，**不要用 `query=地名`**——SDK 从不用 `query` 指定 navi 终点。
- `mode` 不恒为 `driving`，`neweng`（新能源）是 SDK 中确实存在的第二个取值；货车走 `truck/navigation`（也支持途经点）。
- `direction` 的 mode 合法集是 `{driving, transit, walking, neweng, truck}`，**没有 `riding`**。骑行是独立入口 `bikenavi`，且不支持途经点。

**途经点上限 3 个**（**一手**：百度官方 Flutter 插件 `flutter_baidu_mapapi_utils` 3.9.1 源码注释
「途经点（最大3个）」）。SDK 侧无任何数量校验，超限行为未知。

### 高德（**二手 / 工程惯例**）

```
App scheme + 多途经点（Android，证据最强）
amapuri://route/plan/?sourceApplication={应用名}&slat={纬度}&slon={经度}&sname={名}
  &dlat={纬度}&dlon={经度}&dname={名}&dev=0&t=0
  &vian={个数}&vialons={经度1}%7C{经度2}&vialats={纬度1}%7C{纬度2}&vianames={名1}%7C{名2}
iOS 同参数挂在 iosamap://path

Web/H5（官方示例只给了 1 个 via）
https://uri.amap.com/navigation?from={经度},{纬度},{名}&to={经度},{纬度},{名}
  &via={经度},{纬度},{名}&mode=car&policy=1&coordinate=gaode&callnative=1&src=...
```

`vialons/vialats/vianames` 现在有**一手证据**：高德 App 自身的 `DriveUtil.startRoute`
逐一 `getQueryParameter("vialons"/"vialats"/"vianames")` 并 `.split("\\|")`。
客户端解析代码的证据强度不低于文档。

两处必须知道的细节：

- **`vian` 的值被读取后直接丢弃**（裸调用无赋值），实际途经点个数取自 split 后的数组长度。
  所以「vian 必须与三个列表等长」是**无根据的**。
- 真正的硬性约束是 **`vialons.length === vialats.length`**，不等则**整组途经点被静默丢弃**。
  `vianames` 反而可以更短，缺失项回退到默认名。

### ⚠️ 一个被撤下的「首选方案」

早期资料里出现过 `amapuri://drive/multiViaPointPlan/`，声称是高德官方活动页发出的
10 途经点专用 host，一度被列为首选。**复核后判定为很可能不存在，已从代码中移除**：

- GitHub 全网检索 `multiViaPointPlan` 与 `ViaPointPlan` 均 **0 命中**；
- 该 host **不存在于**高德自家反编译的 drive bundle 中，而同一份代码里 `amapuri://route/plan/` 是存在的；
- 唯一来源是搜索摘要——而本次调研中**当场抓到该摘要后端编造内容**（见下）。

---

## 三、坐标系（最容易出错的地方）

| 项 | 高德 | 百度 |
|---|---|---|
| 坐标系 | GCJ-02 | BD-09（默认 `bd09ll`） |
| Web URI 顺序 | **经度,纬度** | **纬度,经度** |
| App scheme | 具名 `slat`/`slon` | `location=纬度,经度` |
| 「我给的已是本系坐标」 | `dev=0` | `coord_type=bd09ll` |
| 「我给的是 WGS84，请你转」 | `dev=1` | `coord_type=wgs84` |

- **顺序两套且相反**，写反不报错，点位落到几千公里外。
- `dev` 不是「开发者模式」。`dev=0` = 已是 GCJ-02，`dev=1` = 请加偏。搞反会固定偏移几百米。
- **实测偏移量**：GCJ-02 坐标不转换直接喂百度，北京偏 890m、广州偏 928m；WGS84 当 BD-09 用偏 950–1378m。这是**导错街区**级别，不是精度抖动。

**本工具的做法**：全链路存 GCJ-02；生成百度链接时**自行转成 BD-09** 后再传。
原因（**一手**）：百度官方 SDK 就是在客户端预先把途经点转成 BD-09 才写进 JSON，
且 navi/direction 构造器**根本不拼 `coord_type`**——「外层 `coord_type` 会作用到 `viaPoints`
内部 lat/lng」这个说法**没有任何证据**，不能依赖。

---

## 四、必须由你真机实测才能定论的清单

按重要性排序。这些**不是已知结论**，工具里都标了「未证实」。

1. **高德途经点传超过 3 个会怎样**——URI 解析层已确认**无上限、无截断**（`DriveUtil` 的循环
   `for (i=0; i<vialons.length; i++)` 全量遍历，类内 `MAX_COUNT=20` 在该方法中未被引用），
   但下游路线规划页是否二次截断到 UI 上限，单凭一个文件无法判断。工具默认 3 个，设置里可放宽到 10。
2. **iOS 端对非空 `via` 的处理完全未验证**。Android 侧有客户端解析代码，
   iOS 侧只有「高德自家 JS API 发送**空** via 值」这一间接证据。
   不要因为 Android 已证实就假定 iOS 同构。
3. **高德 `t` 参数的枚举**（0驾车/1公交/2步行/3骑行）**没有任何证据支撑**。
   已证实的只有「JS API 对 `androidamap://route` 的 t 做了 0→2、2→4 重映射」，说明枚举跨 host 不通用。
4. **百度传 2 个以上途经点是否真的生效**（官方 SDK 的 bug 意味着这条路径可能从没被认真走通过）。
5. **百度 `direction` 上的 `viaPoints`**——官方 SDK 的 direction 构造器**不拼**这个参数，只有二手文档示例提到。工具把它放在 navi 之后作为备选。
7. **高德 Web `via` 传多个时的分隔符**——官方只文档化了 1 个 via。社区一半用 `|`、一半用 `;`。工具默认 `|`，需要时把 `%7C` 换成 `%3B` 各测一遍，并确认是不是只有第一个途经点生效。
8. **浏览器直连千问/豆包/地图 Web 服务 API 是否被 CORS 拦**——大概率会。撞了就部署 `proxy/worker.js`。
9. **千问/豆包的 endpoint 与模型名**——`help.aliyun.com` 与 `www.volcengine.com` 均无法访问，默认值按公开检索填写，以官方控制台为准。豆包的 `model` 通常是**接入点 ID（`ep-` 开头）**而非模型名。

---

## 五、已确认做不到的事

- **微信内一键拉起地图 App**——实践中普遍失败。微信只对合作方放行 scheme，高德/百度不在白名单。
  （据实说明：这条属业界共识，本次**未取得一手证据**，`developers.weixin.qq.com` 不可达，
  故不用「必然/100%」这类绝对措辞。）
  `wx-open-launch-app` 只能拉起**你自己主体名下已绑定的 App**，原理上就拉不了高德，不是门槛问题。
  工具的做法是检测 `MicroMessenger` 后直接显示「右上角 → 在浏览器中打开」引导，不做无谓尝试。
- **百度网页版带途经点**——`api.map.baidu.com/direction` 的官方参数表无此项（**二手**），
  GitHub 全站检索零命中。零命中是弱否定证据，故标「未证实」而非「确认不支持」，但按不支持设计降级。
- **`baidumap://map/routeplanbyviapoints`** ——这个路径**不存在**，是早期检索里的模型幻觉。已在 SDK 常量表与代码检索中双重排除。
- **PC 端 `map.baidu.com/dir` 多途经点**——是百度前端未公开的分享链接内部格式（墨卡托坐标 + `$$` 分隔），
  无任何官方来源可核对，随前端改版失效。**刻意不提供模板**。

---

## 六、顺带纠正的几条常见误传

- 「高德途经点上限 16 个」——16 是 **JS API 2.0 / Web 服务 API** 的路线规划上限，
  和唤起 App 的 URI API 完全是两套 API 家族，对 `via` 没有任何约束力。GitHub 上多个项目搞错了这点。
  （16 这个数字本身也只有二手来源，未能一手证实；但「不能挪用到 URI API」这个推理是确定的——
  高德 URI 解析器里根本没有 16 这个数。）
- 「PC 端 `ditu.amap.com/dir` 用 `via[0][name]` 表达多途经点」——**无依据**。
  全部命中都是 2026 年的 AI 生成旅行规划 skill，是同一段模板代码的互相复制，
  且彼此矛盾（一处写死 max 6，一处注释「无硬上限」，两个数字都没有来源）。
  这是 LLM 生成内容自我繁殖后被当成生态共识的典型，不构成独立证据。
- 「百度 Web 服务算路途经点上限 10~18」——精确值是 **18**（**一手**：`baidu-maps` 官方参数表
  「支持18个以内的有序途径点」），端点是 `/direction/v2/driving`（`/v1` 已过时），
  参数名是 **`waypoints`**（竖线分隔的「纬度,经度」串），**不是** `viaPoints`。
- 「百度 navi 的 `type` 取值不明」——可以确证为 `BLK|TIME|DIS|FEE|HIGHWAY|DEFAULT`
  （**一手**：官方 SDK 的 `NaviRoutePolicy` 枚举直接返回这些字面量）。
- 「高德 `city` 参数能过滤城市」——它**只加权不过滤**。官方原文举例「在深圳市搜天安门，返回北京天安门结果」。
  必须显式加 `citylimit=true`（v3）/ `city_limit=true`（v5）。
- 「高德 Key 通用」——按平台强隔离。用 JS API 的 key 调 Web 服务直接返回 `10009 USERKEY_PLAT_NOMATCH`，
  必须单独申请**「Web 服务」**平台的 Key。
- 「高德/百度 status 判断可以共用」——**语义相反**：高德 `status=1` 成功，百度 `status=0` 成功。
