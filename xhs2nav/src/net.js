/* ============================================================
 * 照着走 · 网络层
 *
 * 浏览器直连国内大模型/地图服务端 API 大概率被 CORS 拦截（它们是服务端 API，
 * 通常不发 Access-Control-Allow-Origin）。因此所有外部请求都过这一层：
 *   - 未配置代理：直连，失败时把「疑似 CORS」明确标出来，而不是报一句 Failed to fetch
 *   - 配置了代理：把目标 URL 交给代理转发（见 proxy/worker.js）
 * ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZZNet = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function ZZError(kind, message, detail) {
    var e = new Error(message);
    e.kind = kind;           // 'cors' | 'network' | 'http' | 'parse' | 'config'
    e.detail = detail;
    return e;
  }

  /**
   * @param {string} url    目标绝对 URL
   * @param {Object} opt    { method, headers, body, proxy, timeoutMs }
   *   proxy: 形如 'https://xxx.workers.dev/'，会被拼成 proxy + '?url=' + encodeURIComponent(url)
   */
  async function request(url, opt) {
    opt = opt || {};
    var target = url, headers = Object.assign({}, opt.headers || {});

    if (opt.proxy) {
      var p = opt.proxy.replace(/\?.*$/, '').replace(/\/+$/, '');
      target = p + '/?url=' + encodeURIComponent(url);
    }

    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, opt.timeoutMs || 60000) : null;

    var res;
    try {
      res = await fetch(target, {
        method: opt.method || 'GET',
        headers: headers,
        body: opt.body,
        signal: ctl ? ctl.signal : undefined,
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err && err.name === 'AbortError') throw ZZError('network', '请求超时', String(err));
      // fetch 对 CORS 失败与断网抛的都是 TypeError，浏览器不允许区分。
      // 没配代理时，跨域是压倒性可能的原因，如实说明两种可能。
      throw ZZError('cors',
        opt.proxy ? '连不上代理，检查代理地址是否正确、是否已部署'
                  : '请求失败。最可能是浏览器跨域(CORS)被拦——这类 API 通常只允许服务端调用。' +
                    '也可能是断网或域名不可达。配置一个代理地址可绕过跨域。',
        String(err));
    }
    if (timer) clearTimeout(timer);

    var text = await res.text();
    if (!res.ok) throw ZZError('http', 'HTTP ' + res.status + ' ' + res.statusText, text.slice(0, 800));
    if (opt.raw) return text;
    try { return JSON.parse(text); }
    catch (e) { throw ZZError('parse', '返回不是合法 JSON', text.slice(0, 800)); }
  }

  /** 图片压缩：控制上传体积与 token 成本，同时保证中文小字仍可辨认。
   *  iPhone 截图 1179×2556 原图在 Claude 高分辨率档约 3956 视觉 token，
   *  压到长边 1280 后大幅下降；行程图字号大，实测几乎不掉准确率。 */
  function downscale(file, maxEdge, quality) {
    maxEdge = maxEdge || 1280;
    quality = quality == null ? 0.85 : quality;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxEdge / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        var dataUrl = cv.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl: dataUrl,
          base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
          mediaType: 'image/jpeg',
          width: cw, height: ch,
          bytes: Math.round(dataUrl.length * 0.75),
        });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(ZZError('parse', '图片读取失败')); };
      img.src = url;
    });
  }

  return { request: request, downscale: downscale, ZZError: ZZError };
});
