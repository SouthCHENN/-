/* ============================================================
 * 照着走 · 地图链接生成层
 *
 * 证据等级（见 xhs2nav/RESEARCH.md）：
 *   [官方]   官方文档明文
 *   [半官方] 高德/百度自家代码或官方活动页在用，但未进参数表
 *   [实测]   仅社区实现佐证，必须真机验证
 *
 * 关键结构事实：
 *  - 途经点一律需要经纬度。起点/终点可以只给名字，途经点不行。
 *  - 高德 Web  是「经度,纬度,名称」；高德 App 是具名的 slat/slon。顺序相反，写反不报错。
 *  - 高德 dev=0 表示「我给的已是 GCJ-02」；dev=1 表示「我给的是 WGS84，请你加偏」。
 *  - 百度 coord_type=gcj02 可直接吃高德坐标，故全程只需一套 GCJ-02，无需 BD-09 转换。
 *  - 「多途经点 + 直接进导航」只有百度能做（baidumap://map/navi + viaPoints）；
 *    高德带途经点只能落到路线规划页，用户需再点一次「开始导航」。
 * ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZZLinks = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var E = encodeURIComponent;
  var PIPE = '%7C';                     // | 在部分 WebView/短信/二维码里会被截断，一律编码

  /* 途经点上限。3 = 两家都保证的安全值（百度官方明文上限，也等于高德 App 手动添加上限）。
     高德可放宽到 10——证据是 act.amap.com 官方活动页发出过 vian=10 的链接，但未真机实测，
     超限行为（全生效/截断/整条失败）未知，故不做默认。 */
  var VIA_MAX = { amap: 3, amapLoose: 10, baidu: 3 };

  /* 百度 direction 的 mode 合法集经官方 SDK 源码确认为
     {driving, transit, walking, neweng, truck} —— 没有 riding。
     骑行在百度是独立入口 baidumap://map/bikenavi，且不支持途经点。 */
  /* ⚠️ 高德 t 的具体枚举（0驾车/1公交/2步行/3骑行）没有任何一手证据支撑——
     已证实的只有「高德 JS API 对 androidamap://route 的 t 做了 0→2、2→4 重映射」，
     说明枚举跨 host 不通用。这里沿用最广泛的写法，属待实测项。 */
  var MODE = {
    car:  { amapT: '0', amapWeb: 'car',  baidu: 'driving',  apple: 'driving' },
    bus:  { amapT: '1', amapWeb: 'bus',  baidu: 'transit',  apple: 'transit' },
    walk: { amapT: '2', amapWeb: 'walk', baidu: 'walking',  apple: 'walking' },
    ride: { amapT: '3', amapWeb: 'ride', baidu: null,       apple: 'cycling' },
  };

  /* GCJ-02 → BD-09。百度官方 SDK 是在客户端先把途经点转成 BD-09 再拼 JSON，
     且 navi/direction 构造器根本不拼 coord_type——「外层 coord_type 会作用到
     viaPoints 内部 lat/lng」是推测，无任何证据。故这里自行转换后按 BD-09 传。 */
  var X_PI = Math.PI * 3000.0 / 180.0;
  function toBd09(lon, lat) {
    var z = Math.sqrt(lon * lon + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
    var th = Math.atan2(lat, lon) + 0.000003 * Math.cos(lon * X_PI);
    return { lon: z * Math.cos(th) + 0.0065, lat: z * Math.sin(th) + 0.006 };
  }

  function hasCoord(p) {
    return p && typeof p.lon === 'number' && typeof p.lat === 'number' &&
           isFinite(p.lon) && isFinite(p.lat);
  }
  function allCoords(list) { return list.length > 0 && list.every(hasCoord); }

  /** 把 N 个点按「每条链接最多 viaMax 个途经点」切成若干段，段间首尾相接。
   *  10 个点、viaMax=3 → [0..4], [4..8], [8..9]（每段 起+3途+终）。 */
  function chunkRoute(points, viaMax) {
    var per = viaMax + 2, out = [], i = 0;
    if (points.length <= per) return [points.slice()];
    while (i < points.length - 1) {
      var seg = points.slice(i, i + per);
      if (seg.length < 2) break;
      out.push(seg);
      i += per - 1;                      // 首尾相接：上一段的终点是下一段的起点
    }
    return out;
  }

  /* ---------------- 高德 ---------------- */

  /** [官方] Web/H5 路径规划页。via 官方只文档化了 1 个；多 via 的分隔符属未定义行为。 */
  function amapWeb(seg, opt) {
    var m = MODE[opt.mode] || MODE.car;
    var from = seg[0], to = seg[seg.length - 1], vias = seg.slice(1, -1);
    function pt(p) { return hasCoord(p) ? p.lon + ',' + p.lat + ',' + E(p.name) : ',,' + E(p.name); }
    // 官方 from/to 要求「经度,纬度,名称」；只给名字不成立，退化成搜索页
    if (!hasCoord(to)) {
      return 'https://uri.amap.com/search?keyword=' + E(to.name) +
             '&src=' + E(opt.src || 'zhaozhezou') + '&callnative=1';
    }
    var u = 'https://uri.amap.com/navigation?from=' + pt(from) + '&to=' + pt(to);
    if (vias.length) u += '&via=' + vias.map(pt).join(opt.viaSep === ';' ? '%3B' : PIPE);
    u += '&mode=' + m.amapWeb + '&policy=1&coordinate=gaode&callnative=1&src=' + E(opt.src || 'zhaozhezou');
    return u;
  }

  /** App scheme + 多途经点。
   *  证据：高德 App 自身的 DriveUtil.startRoute 逐一读取 vialons/vialats/vianames
   *  并按 | split —— 这是客户端解析代码的一手证据，强于文档转述。
   *  硬性约束是 vialons.length === vialats.length（不等则整组途经点被静默丢弃）；
   *  vian 的值被读取后直接丢弃，实际个数取自 split 数组长度，这里仍带上以防其他解析路径用到。
   *  ⚠️ 曾出现在早期资料里的 amapuri://drive/multiViaPointPlan/ 已移除：
   *     GitHub 全网检索 0 命中，且不存在于高德自家反编译的 drive bundle 中，
   *     唯一来源是会编造内容的搜索摘要，判定为很可能不存在。
   *  ⚠️ iOS 侧只有「高德 JS API 发送空 via 值」这一间接证据，非空 via 的实际处理未验证。 */
  function amapScheme(seg, opt, os) {
    var m = MODE[opt.mode] || MODE.car;
    var from = seg[0], to = seg[seg.length - 1], vias = seg.slice(1, -1);
    var base = os === 'ios' ? 'iosamap://path?' : 'amapuri://route/plan/?';
    var q = 'sourceApplication=' + E(opt.src || 'zhaozhezou');
    // 起点三项全空 = 用「我的位置」
    if (hasCoord(from)) q += '&slat=' + from.lat + '&slon=' + from.lon + '&sname=' + E(from.name);
    else if (opt.originIsMe) q += '&slat=&slon=&sname=';
    else q += '&slat=&slon=&sname=' + E(from.name);
    q += '&dlat=' + (hasCoord(to) ? to.lat : '') + '&dlon=' + (hasCoord(to) ? to.lon : '') +
         '&dname=' + E(to.name) + '&dev=0&t=' + m.amapT;
    if (vias.length) {
      q += '&vian=' + vias.length +
           '&vialons=' + vias.map(function (p) { return p.lon; }).join(PIPE) +
           '&vialats=' + vias.map(function (p) { return p.lat; }).join(PIPE) +
           '&vianames=' + vias.map(function (p) { return E(p.name); }).join(PIPE);
    }
    return base + q;
  }

  /* ---------------- 百度 ---------------- */

  /** viaPoints：外层对象包一层同名键，内层 name/lat/lng，整体 URL-encode。
   *  参数名与三个内层键名均由百度官方 Android SDK 与 iOS 头文件双链印证。
   *  坐标先转 BD-09（见 toBd09 的说明）。 */
  function viaPointsParam(vias) {
    return E(JSON.stringify({
      viaPoints: vias.map(function (p) {
        var b = toBd09(p.lon, p.lat);
        return { name: p.name, lat: b.lat, lng: b.lon };
      }),
    }));
  }

  function bdLatLng(p) { var b = toBd09(p.lon, p.lat); return b.lat + ',' + b.lon; }

  /** [官方+SDK逐字印证] 带途经点直接进入导航态——所有方案里唯一的真·一键导航。
   *  参数与顺序对照官方 SDK 的 navi 构造器：origin / origin_uid / location /
   *  destination_uid / src / viaPoints / type / mode。
   *  终点用 location=纬度,经度；SDK 从不用 query= 指定 navi 终点。 */
  function baiduNavi(seg, opt) {
    var from = seg[0], to = seg[seg.length - 1], vias = seg.slice(1, -1);
    var u = 'baidumap://map/navi?';
    if (!opt.originIsMe && hasCoord(from)) u += 'origin=' + bdLatLng(from) + '&';
    u += 'location=' + bdLatLng(to) +
         '&src=' + E(opt.baiduSrc || 'andr.zhaozhezou.app');
    if (vias.length) u += '&viaPoints=' + viaPointsParam(vias);
    u += '&mode=driving';                 // SDK 另有 neweng（新能源）；货车走 truck/navigation
    return u;
  }

  /** [官方SDK印证=参数集；途经点=未证实] 路线规划页。
   *  origin/destination 支持纯地名 → 这是零 key 路径的主力。
   *  viaPoints 挂在 direction 上【没有一手证据】：官方 SDK 的 direction 构造器
   *  确实不拼这个参数，只有二手文档示例提到过。故仅在有坐标时附带，并标注需实测。 */
  function baiduDirection(seg, opt) {
    var m = MODE[opt.mode] || MODE.car;
    var bmode = m.baidu || 'driving';
    var from = seg[0], to = seg[seg.length - 1], vias = seg.slice(1, -1);
    function pt(p) {
      return hasCoord(p) ? 'name:' + E(p.name) + PIPE + 'latlng:' + bdLatLng(p) : E(p.name);
    }
    var u = 'baidumap://map/direction?origin=' + (opt.originIsMe ? '' : pt(from)) +
            '&destination=' + pt(to) + '&mode=' + bmode + '&target=1' +
            '&src=' + E(opt.baiduSrc || 'andr.zhaozhezou.app');
    if (opt.city) u += '&region=' + E(opt.city);   // region 仅二手来源支持
    if (vias.length && allCoords(vias)) u += '&viaPoints=' + viaPointsParam(vias);
    return u;
  }

  /** [二手来源] 网页版路线规划。origin/destination 认纯地名 →
   *  未装 App / 微信内的降级。官方 web 端参数表未能一手核对。 */
  function baiduWeb(seg, opt) {
    var m = MODE[opt.mode] || MODE.car;
    var bmode = m.baidu || 'driving';
    var from = seg[0], to = seg[seg.length - 1];
    function pt(p) { return hasCoord(p) ? 'name:' + E(p.name) + PIPE + 'latlng:' + bdLatLng(p) : E(p.name); }
    var u = 'https://api.map.baidu.com/direction?origin=' + pt(from) + '&destination=' + pt(to) +
            '&mode=' + bmode + '&coord_type=bd09ll&output=html' +
            '&src=' + E(opt.baiduSrc || 'webapp.zhaozhezou.app');
    if (opt.city) u += '&region=' + E(opt.city);
    return u;
  }

  /* ---------------- Apple 地图 ---------------- */

  /** [官方文档原文] https://maps.apple.com/directions
   *  三家里唯一一个途经点【接受纯地名】的——官方原文：waypoint 的取值是
   *  "Specify an address, coordinate, or a place name"，且
   *  "You can specify multiple waypoints by repeating the waypoint parameter"
   *  （重复参数，不是竖线或逗号分隔）。
   *  因此它是零 key 情况下唯一能做真·多途经点的通道。
   *  坐标顺序是【纬度,经度】（对照官方示例 waypoint=37.795442,-122.393624）。
   *  统一 URL 方案需 iOS 18.4+；省略 source 则以「当前位置」为起点。
   *  ⚠️ 未验证：中国大陆下 Apple 地图（用高德数据）对中文地名的解析质量、
   *     坐标基准是 GCJ-02 还是 WGS-84、waypoint 数量上限（官方未声明）、
   *     以及 iOS 18.4 以下的降级行为。 */
  function applePt(p, city) {
    if (hasCoord(p)) return p.lat + ',' + p.lon;      // 纬度在前
    var n = p.name;
    if (city && n.indexOf(city) < 0) n = n + ' ' + city;  // 补城市，帮它消歧
    return E(n);
  }

  function appleDirections(seg, opt, startDelay) {
    var m = MODE[opt.mode] || MODE.car;
    var from = seg[0], to = seg[seg.length - 1], vias = seg.slice(1, -1);
    var city = (opt.city || '').trim();
    var u = 'https://maps.apple.com/directions?';
    if (!opt.originIsMe) u += 'source=' + applePt(from, city) + '&';
    u += 'destination=' + applePt(to, city);
    vias.forEach(function (v) { u += '&waypoint=' + applePt(v, city); });   // 重复参数
    u += '&mode=' + (m.apple || 'driving');
    if (startDelay != null) u += '&start=' + startDelay;
    return u;
  }

  /* ---------------- Android intent 包装 ---------------- */

  /** Chrome 25+ 禁止 location.href='xxx://'，网页里唤起 App 必须用 intent 语法。 */
  function toIntent(scheme, pkg, url, fallback) {
    var body = url.slice(url.indexOf('://') + 3);
    return 'intent://' + body + '#Intent;scheme=' + scheme + ';package=' + pkg +
           (fallback ? ';S.browser_fallback_url=' + E(fallback) : '') + ';end';
  }

  /* ---------------- 对外主函数 ---------------- */

  /** Apple 地图只在 iOS 与桌面上有意义（Android 打开 maps.apple.com 只是个网页）。 */
  function pushApple(plans, pts, opt, os) {
    if (os === 'android') return;
    var links = [
      { kind: 'app', label: '打开 Apple 地图', note: '[官方文档] 途经点接受纯地名',
        url: appleDirections(pts, opt, null) },
      { kind: 'app-alt', label: '打开并自动开始导航', note: '[未实测] start=3 延迟3秒自动起航',
        url: appleDirections(pts, opt, 3) },
    ];
    plans.push({
      app: 'apple', title: 'Apple 地图',
      note: '需 iOS 18.4+。国内用的是高德数据。三家里唯一途经点不要坐标的',
      legs: [{ title: '', from: pts[0], to: pts[pts.length - 1], vias: pts.slice(1, -1), links: links }],
    });
  }

  /**
   * @param {Array}  stops  [{name, lon?, lat?}]，按经过顺序
   * @param {Object} opt    { mode, os:'android'|'ios'|'other', city, src, baiduSrc,
   *                          originIsMe, amapLoose, viaSep }
   * @returns {Object} { mode:'route'|'segment', coords:boolean, plans:[...] }
   *   plans[].legs[] = { title, from, to, vias, links:[{app,kind,url,label,note}] }
   */
  function build(stops, opt) {
    opt = opt || {};
    var pts = (stops || []).filter(function (s) { return s && s.name; });
    if (pts.length < 2) return { mode: 'none', coords: false, plans: [], reason: '至少需要 2 个地点' };

    var coords = allCoords(opt.originIsMe ? pts.slice(1) : pts);
    var os = opt.os || 'other';
    var plans = [];

    if (coords) {
      /* ---- 有坐标：真·多途经点 ---- */
      var amapMax = opt.amapLoose ? VIA_MAX.amapLoose : VIA_MAX.amap;
      plans.push({
        app: 'amap', title: '高德地图',
        note: '落地是路线规划页，需再点一次「开始导航」。URI 解析层无途经点数量上限，下游是否截断未知',
        legs: chunkRoute(pts, amapMax).map(function (seg, i, arr) {
          var webUrl = amapWeb(seg, opt);
          var links = [];
          if (os === 'android') {
            links.push({ kind: 'app', label: '打开高德 App', note: '[高德客户端代码证实]',
              url: toIntent('amapuri', 'com.autonavi.minimap', amapScheme(seg, opt, 'android'), webUrl) });
          } else if (os === 'ios') {
            links.push({ kind: 'app', label: '打开高德 App', note: '[iOS 侧 via 未验证]',
              url: amapScheme(seg, opt, 'ios') });
          }
          links.push({ kind: 'web', label: os === 'other' ? '打开高德' : '网页版（未装 App）',
            note: seg.length > 3 ? '[未证实] 官方只有 1 个 via 的示例，多 via 分隔符无依据' : '[via 参数真实，文档化程度存疑]',
            url: webUrl });
          return {
            title: arr.length > 1 ? '第 ' + (i + 1) + '/' + arr.length + ' 段' : '',
            from: seg[0], to: seg[seg.length - 1], vias: seg.slice(1, -1), links: links,
          };
        }),
      });

      if ((opt.mode || 'car') === 'car') {
        plans.push({
          app: 'baidu', title: '百度地图',
          note: '带途经点直接进导航态（真·一键）。官方限 3 个途经点；2 个以上未经实测',
          legs: chunkRoute(pts, VIA_MAX.baidu).map(function (seg, i, arr) {
            var links = [];
            var navi = baiduNavi(seg, opt), dir = baiduDirection(seg, opt), web = baiduWeb(seg, opt);
            if (os === 'android') {
              links.push({ kind: 'app', label: '直接开导航', note: '[SDK逐字印证] 仅驾车',
                url: toIntent('bdapp', 'com.baidu.BaiduMap', navi, web) });
              links.push({ kind: 'app-alt', label: '路线规划页', note: '[途经点未证实] SDK 未拼 viaPoints',
                url: toIntent('bdapp', 'com.baidu.BaiduMap', dir, web) });
            } else if (os === 'ios') {
              links.push({ kind: 'app', label: '直接开导航', note: '[SDK逐字印证] 仅驾车', url: navi });
              links.push({ kind: 'app-alt', label: '路线规划页', note: '[途经点未证实]', url: dir });
            }
            links.push({ kind: 'web', label: '网页版（无途经点）', note: '[二手来源] 网页版途经点能力未证实', url: web });
            return {
              title: arr.length > 1 ? '第 ' + (i + 1) + '/' + arr.length + ' 段' : '',
              from: seg[0], to: seg[seg.length - 1], vias: seg.slice(1, -1), links: links,
            };
          }),
        });
      }
      pushApple(plans, pts, opt, os);
      return { mode: 'route', coords: true, plans: plans };
    }

    /* ---- 无坐标：降级为分段导航，每段 A→B 用地名直传 ---- */
    var legs = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var seg2 = [pts[i], pts[i + 1]];
      var bweb = baiduWeb(seg2, opt);
      var links2 = [];
      if (os === 'android') {
        links2.push({ kind: 'app', label: '百度地图', note: '[SDK印证] origin/destination 支持纯地名',
          url: toIntent('bdapp', 'com.baidu.BaiduMap', baiduDirection(seg2, opt), bweb) });
        links2.push({ kind: 'app-alt', label: '高德地图', note: '[实测] 无坐标时仅凭名称发起',
          url: toIntent('amapuri', 'com.autonavi.minimap', amapScheme(seg2, opt, 'android'), amapWeb(seg2, opt)) });
      } else if (os === 'ios') {
        links2.push({ kind: 'app', label: '百度地图', note: '[SDK印证]', url: baiduDirection(seg2, opt) });
        links2.push({ kind: 'app-alt', label: '高德地图', note: '[实测]', url: amapScheme(seg2, opt, 'ios') });
      }
      links2.push({ kind: 'web', label: '网页版', note: '[官方]', url: bweb });
      legs.push({
        title: '第 ' + (i + 1) + '/' + (pts.length - 1) + ' 段',
        from: pts[i], to: pts[i + 1], vias: [], links: links2,
      });
    }
    var segPlans = [{ app: 'mixed', title: '分段导航（高德/百度）', note: '每到一站回来点下一段', legs: legs }];
    // Apple 地图的途经点接受纯地名 → 无坐标时它仍能给出一条完整多点路线
    pushApple(segPlans, pts, opt, os);
    return {
      mode: 'segment', coords: false,
      reason: '高德/百度的途经点要经纬度，没有坐标只能逐段走；Apple 地图接受纯地名，仍可一条链接走完',
      plans: segPlans,
    };
  }

  return { build: build, chunkRoute: chunkRoute, _apple: appleDirections, VIA_MAX: VIA_MAX, _amapWeb: amapWeb, _amapScheme: amapScheme, _baiduNavi: baiduNavi };
});
