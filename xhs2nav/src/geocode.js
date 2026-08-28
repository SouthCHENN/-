/* ============================================================
 * 路书 · 地理编码层（地点名 → 坐标）
 *
 * 只有拿到坐标才能传途经点。默认百度（用户指定优先），可切高德。
 * 两家 Web 服务 API 都是服务端接口，浏览器直连大概率撞 CORS → 走 ZZNet 的代理开关。
 *
 * 坐标系策略：全链路统一成 GCJ-02。
 *   - 百度 place/v2/search 默认返回 BD-09；请求 ret_coordtype=gcj02ll 可直接要 GCJ-02。
 *     该参数若不被接受，回退到 BD-09 并本地转换（公式见 bd09ToGcj02）。
 *   - 高德本来就是 GCJ-02。
 * 统一 GCJ-02 后：高德链接用 dev=0，百度链接用 coord_type=gcj02，两边都不用再换算。
 * ============================================================ */
(function (root, factory) {
  var api = factory(typeof require === 'function' ? require('./net.js') : root.ZZNet);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZZGeo = api;
})(typeof self !== 'undefined' ? self : this, function (Net) {
  'use strict';

  var X_PI = Math.PI * 3000.0 / 180.0;

  /** BD-09 → GCJ-02。仅在百度不接受 ret_coordtype 时作为回退使用。 */
  function bd09ToGcj02(lon, lat) {
    var x = lon - 0.0065, y = lat - 0.006;
    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
    var th = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
    return { lon: z * Math.cos(th), lat: z * Math.sin(th) };
  }
  /** GCJ-02 → BD-09。备用。 */
  function gcj02ToBd09(lon, lat) {
    var z = Math.sqrt(lon * lon + lat * lat) + 0.00002 * Math.sin(lat * X_PI);
    var th = Math.atan2(lat, lon) + 0.000003 * Math.cos(lon * X_PI);
    return { lon: z * Math.cos(th) + 0.0065, lat: z * Math.sin(th) + 0.006 };
  }

  /** 粗略球面距离（米），只用于候选排序，精度足够。 */
  function distM(a, b) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad;
    var la1 = a.lat * toRad, la2 = b.lat * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* ---------------- 百度 ---------------- */

  async function baiduSearch(name, cfg, city) {
    var base = 'https://api.map.baidu.com/place/v2/search?output=json&page_size=10' +
      '&query=' + encodeURIComponent(name) +
      '&region=' + encodeURIComponent(city || '全国') +
      (city ? '&city_limit=true' : '') +
      '&ak=' + encodeURIComponent(cfg.ak);

    var j, gcj = true;
    try {
      j = await Net.request(base + '&ret_coordtype=gcj02ll', { proxy: cfg.proxy, timeoutMs: 20000 });
      if (j && j.status !== 0) throw Net.ZZError('http', '百度返回 status=' + j.status + ' ' + (j.message || ''));
    } catch (e) {
      if (e.kind === 'cors' || e.kind === 'network') throw e;
      // ret_coordtype 不被接受 → 退回默认 BD-09，本地转换
      j = await Net.request(base, { proxy: cfg.proxy, timeoutMs: 20000 });
      gcj = false;
      if (j && j.status !== 0) {
        throw Net.ZZError('http', '百度返回 status=' + j.status + ' ' + (j.message || '') +
          '（status=240 通常是 AK 没开「地点检索」权限，302/210 是配额或校验失败）');
      }
    }

    return (j.results || []).filter(function (r) { return r.location; }).map(function (r) {
      var lon = r.location.lng, lat = r.location.lat;
      if (!gcj) { var c = bd09ToGcj02(lon, lat); lon = c.lon; lat = c.lat; }
      return {
        name: r.name, address: r.address || '', city: r.city || '',
        lon: lon, lat: lat, source: 'baidu', uid: r.uid || '',
      };
    });
  }

  /* ---------------- 高德 ---------------- */

  async function amapSearch(name, cfg, city) {
    var url = 'https://restapi.amap.com/v3/place/text?output=json&offset=10' +
      '&keywords=' + encodeURIComponent(name) +
      (city ? '&city=' + encodeURIComponent(city) + '&citylimit=true' : '') +
      '&key=' + encodeURIComponent(cfg.ak);
    var j = await Net.request(url, { proxy: cfg.proxy, timeoutMs: 20000 });
    if (j && j.status !== '1') {
      throw Net.ZZError('http', '高德返回 ' + (j.info || '') + ' (infocode=' + (j.infocode || '') + ')');
    }
    return (j.pois || []).filter(function (p) { return p.location; }).map(function (p) {
      var xy = String(p.location).split(',');
      return {
        name: p.name, address: p.address || '', city: p.cityname || '',
        lon: parseFloat(xy[0]), lat: parseFloat(xy[1]), source: 'amap', uid: p.id || '',
      };
    });
  }

  /** 候选排序：优先离上一站近的（同城同片区），其次保持 API 原始权重。 */
  function pickBest(cands, prev) {
    if (!cands.length) return null;
    if (!prev) return cands[0];
    var scored = cands.map(function (c, i) {
      return { c: c, d: distM(prev, c), i: i };
    });
    // 200km 以内按距离选；全部很远说明上一站参考价值不大，退回原始第一条
    var near = scored.filter(function (s) { return s.d < 200000; });
    if (!near.length) return cands[0];
    near.sort(function (a, b) { return a.d - b.d || a.i - b.i; });
    return near[0].c;
  }

  /**
   * 逐个解析地点。串行执行——并发会更快，但个人 key 的 QPS 很低，串行更稳。
   * @param {Array}  stops [{name}]
   * @param {Object} cfg   { provider:'baidu'|'amap', ak, proxy, city }
   * @param {Function} onProgress (index, total, result)
   * @returns {Promise<Array>} [{name, resolved:bool, lon, lat, matched, candidates, error}]
   */
  async function resolveAll(stops, cfg, onProgress) {
    var search = cfg.provider === 'amap' ? amapSearch : baiduSearch;
    var out = [], prev = null;
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i], rec = { name: s.name, note: s.note || '', resolved: false };
      try {
        var cands = await search(s.name, cfg, cfg.city);
        if (!cands.length && cfg.city) cands = await search(s.name, cfg, '');   // 放宽城市再试一次
        var best = pickBest(cands, prev);
        if (best) {
          rec.resolved = true;
          rec.lon = best.lon; rec.lat = best.lat;
          rec.matched = best.name; rec.address = best.address; rec.city = best.city;
          rec.candidates = cands.slice(0, 5);
          prev = best;
        } else {
          rec.error = '搜不到这个地点';
        }
      } catch (e) {
        rec.error = e.message;
        rec.errorKind = e.kind;
        if (e.kind === 'cors' || e.kind === 'network') {
          // 网络层面挂了，后面每个都会同样失败，直接停
          out.push(rec);
          for (var k = i + 1; k < stops.length; k++) {
            out.push({ name: stops[k].name, note: stops[k].note || '', resolved: false, error: '已跳过（网络不可用）' });
          }
          if (onProgress) onProgress(stops.length, stops.length, rec);
          return out;
        }
      }
      out.push(rec);
      if (onProgress) onProgress(i + 1, stops.length, rec);
    }
    return out;
  }

  return {
    resolveAll: resolveAll, pickBest: pickBest, distM: distM,
    bd09ToGcj02: bd09ToGcj02, gcj02ToBd09: gcj02ToBd09,
  };
});
