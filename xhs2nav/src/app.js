/* ============================================================
 * 路书 · 主程序
 * 截图/文案 → 地点列表（可编辑）→ 可选地理编码 → 地图多段导航链接
 * ============================================================ */
(function () {
  'use strict';

  var LSK = 'lushu_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- 环境 ---------- */
  var UA = navigator.userAgent || '';
  var ENV = {
    ios: /iPad|iPhone|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1),
    android: /Android/i.test(UA),
    wechat: /MicroMessenger/i.test(UA),
  };
  ENV.os = ENV.ios ? 'ios' : (ENV.android ? 'android' : 'other');

  /* ---------- 状态 ---------- */
  var S = {
    tab: 'img',
    days: [],
    city: '',
    mode: 'car',
    originIsMe: false,
    amapLoose: false,
    images: [],
    busy: '',
    cfg: {
      visionPreset: 'qwen', endpoint: '', model: '', apiKey: '',
      geoProvider: 'baidu', geoAk: '', proxy: '',
    },
  };
  var uid = 0;

  function save() {
    try {
      localStorage.setItem(LSK, JSON.stringify({
        cfg: S.cfg, city: S.city, mode: S.mode,
        originIsMe: S.originIsMe, amapLoose: S.amapLoose, days: S.days,
      }));
    } catch (e) { /* 隐私模式下 localStorage 可能抛异常，忽略 */ }
  }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(LSK) || '{}');
      if (v.cfg) Object.assign(S.cfg, v.cfg);
      ['city', 'mode', 'originIsMe', 'amapLoose'].forEach(function (k) {
        if (v[k] !== undefined) S[k] = v[k];
      });
      if (Array.isArray(v.days)) S.days = v.days;
      S.days.forEach(function (d) { d.stops.forEach(function (s) { s.id = ++uid; }); });
    } catch (e) { /* 存档损坏时忽略，从空状态开始 */ }
    if (!S.cfg.endpoint) applyPreset(S.cfg.visionPreset, true);
  }
  function applyPreset(id, keepKey) {
    var p = ZZVision.PRESETS[id];
    if (!p) return;
    S.cfg.visionPreset = id;
    S.cfg.endpoint = p.endpoint;
    S.cfg.model = p.model;
    if (!keepKey) S.cfg.apiKey = '';
  }

  function allStops() {
    var out = [];
    S.days.forEach(function (d) { d.stops.forEach(function (s) { out.push(s); }); });
    return out;
  }

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  /* ---------- 渲染 ---------- */

  function renderEnv() {
    var b = $('#env');
    b.textContent = ENV.wechat ? '微信内' : (ENV.ios ? 'iOS' : ENV.android ? 'Android' : '桌面/其他');
    b.className = 'env' + (ENV.wechat ? ' warn' : '');
    $('#wxbar').className = 'wxbar' + (ENV.wechat ? ' on' : '');
  }

  function renderInput() {
    $('#tabText').className = S.tab === 'text' ? 'on' : '';
    $('#tabImg').className = S.tab === 'img' ? 'on' : '';
    $('#paneText').style.display = S.tab === 'text' ? '' : 'none';
    $('#paneImg').style.display = S.tab === 'img' ? '' : 'none';
    $('#thumbs').innerHTML = S.images.map(function (im) {
      return '<img src="' + im.dataUrl + '" alt="">';
    }).join('');
    $('#btnExtract').disabled = !S.images.length || !!S.busy;
  }

  function renderStops() {
    var host = $('#stops');
    if (!S.days.length) {
      host.innerHTML = '<div class="note">还没有地点。上面粘贴文案或选截图，也可以直接「手动添加」。</div>';
    } else {
      host.innerHTML = S.days.map(function (d, di) {
        return '<div class="day"><div class="daylabel">' + esc(d.label) + '</div>' +
          d.stops.map(function (s, si) {
            var cls = s.error ? 'bad' : (s.lat != null ? 'ok' : (s.conf != null && s.conf < 0.7 ? 'low' : ''));
            var meta = '', mcls = '';
            if (s.error) { meta = s.error; mcls = ' err'; }
            else if (s.lat != null) {
              meta = '✓ ' + (s.matched || s.name) + (s.address ? ' · ' + s.address : '');
              mcls = ' hit';
            } else if (s.note) meta = s.note;
            else if (s.conf != null && s.conf < 0.7) meta = '不确定是不是地点，请确认';
            return '<div class="stop ' + cls + '" data-d="' + di + '" data-s="' + si + '">' +
              '<span class="idx mono">' + (si + 1) + '</span>' +
              '<div class="body">' +
                '<input class="nm" value="' + esc(s.name) + '" data-act="rename">' +
                (meta ? '<div class="meta' + mcls + '">' + esc(meta) + '</div>' : '') +
              '</div>' +
              '<div class="ops">' +
                '<button data-act="up" aria-label="上移">▲</button>' +
                '<button data-act="down" aria-label="下移">▼</button>' +
              '</div>' +
              '<button class="del" data-act="del" aria-label="删除">✕</button>' +
            '</div>';
          }).join('') + '</div>';
      }).join('');
    }
    var n = allStops().length;
    var got = allStops().filter(function (s) { return s.lat != null; }).length;
    $('#stopCount').textContent = n ? n + ' 个地点' + (got ? '，' + got + ' 个已定位' : '') : '';
    $('#btnBuild').disabled = n < 2 || !!S.busy;
    $('#goCnt').innerHTML = n < 2
      ? '还没有路线<br>至少要 2 个地点'
      : '<b>' + n + ' 站</b> · ' + (got === n ? '全部已定位' : (got ? got + ' 站已定位' : '出发时自动定位'));
  }

  function renderCfg() {
    var c = S.cfg;
    $('#visionPreset').value = c.visionPreset;
    $('#endpoint').value = c.endpoint;
    $('#model').value = c.model;
    $('#apiKey').value = c.apiKey;
    $('#geoProvider').value = c.geoProvider;
    $('#geoAk').value = c.geoAk;
    $('#proxy').value = c.proxy;
    $('#city').value = S.city;
    $('#mode').value = S.mode;
    $('#originIsMe').checked = S.originIsMe;
    $('#amapLoose').checked = S.amapLoose;
    var p = ZZVision.PRESETS[c.visionPreset];
    $('#presetNote').textContent = p ? p.note : '';
  }

  function renderOut(res) {
    var host = $('#out');
    if (!res) { host.innerHTML = ''; return; }
    if (res.mode === 'none') {
      host.innerHTML = '<div class="note err">' + esc(res.reason) + '</div>';
      return;
    }
    var head = '';
    if (res.mode === 'partial') {
      head = '<div class="hint">这几站没定位到：<b>' + res.failed.map(esc).join('、') + '</b><br>' +
        '换个更常见的叫法（如「XX店」补上城市/商场名）或删掉它，再点一次出发。' +
        (res.plans.length ? '<br>Apple 地图不受影响，下面照常可用。' : '') + '</div>';
    }
    (res.notes || []).forEach(function (n) { head += '<div class="note warn">' + esc(n) + '</div>'; });
    host.innerHTML = head + res.plans.map(function (p) {
      return '<div class="plan"><div class="hd"><div class="t">' + esc(p.title) + '</div>' +
        (p.note ? '<div class="n">' + esc(p.note) + '</div>' : '') + '</div>' +
        p.legs.map(function (lg) {
          var path = '<b>' + esc(lg.from.name) + '</b>' +
            (lg.vias.length ? ' → <span class="via">' + lg.vias.map(function (v) { return esc(v.name); }).join(' → ') + '</span>' : '') +
            ' → <b>' + esc(lg.to.name) + '</b>';
          return '<div class="leg">' +
            '<div class="path">' + (lg.title ? '<span class="mono">' + esc(lg.title) + '</span> ' : '') + path + '</div>' +
            lg.links.map(function (k) {
              return '<div class="lk">' +
                '<a href="' + esc(k.url) + '"' + (k.kind === 'web' ? ' target="_blank" rel="noopener"' : '') +
                  (k.kind === 'app' ? '' : ' class="alt"') + '>' + esc(k.label) + '</a>' +
                '<span class="ev">' + esc(k.note) + '</span>' +
                '<button class="cp" data-act="copy" data-url="' + esc(k.url) + '">复制</button>' +
              '</div>';
            }).join('') +
          '</div>';
        }).join('') + '</div>';
    }).join('');
  }

  function render() { renderEnv(); renderInput(); renderStops(); renderCfg(); }

  /* ---------- 动作 ---------- */

  function fromParsed(days, city) {
    S.days = days.map(function (d) {
      return {
        label: d.label,
        stops: d.stops.map(function (s) {
          return { id: ++uid, name: s.name, note: s.note || '', conf: s.conf };
        }),
      };
    });
    if (city && !S.city) S.city = city;
    save(); renderStops(); renderCfg(); renderOut(null);
  }

  /* 粘贴/输入即解析：不设按钮。清空文案则清空列表。 */
  var parseT;
  function applyText(immediate) {
    clearTimeout(parseT);
    parseT = setTimeout(function () {
      var t = $('#text').value;
      if (!t.trim()) { if (S.days.length) { S.days = []; save(); renderStops(); renderOut(null); } return; }
      var r = ZZParse.parse(t);
      if (!r.days.length) return;                 // 没解析出来就保持现状，不打扰
      fromParsed(r.days, '');
    }, immediate ? 0 : 400);
  }

  async function doExtractImages() {
    if (!S.images.length) return;
    S.busy = 'vision'; renderInput(); renderStops();
    $('#visionStatus').innerHTML = '<span class="spin"></span> 识别中，通常十几秒…';
    try {
      var out = await ZZVision.extract(S.images, {
        dialect: (ZZVision.PRESETS[S.cfg.visionPreset] || {}).dialect || 'openai',
        endpoint: S.cfg.endpoint, model: S.cfg.model,
        apiKey: S.cfg.apiKey, proxy: S.cfg.proxy,
      });
      if (!out.days.length) { $('#visionStatus').innerHTML = '<span class="note warn">模型没抽到地点，换张更清楚的截图，或改用粘贴文字。</span>'; }
      else {
        fromParsed(out.days, out.city);
        $('#visionStatus').innerHTML = '<span class="note">识别完成，请核对下面的地点。</span>';
      }
    } catch (e) {
      $('#visionStatus').innerHTML = '<span class="note err">' + esc(e.message) + '</span>' +
        (e.detail ? '<details><summary>详细返回</summary><div class="note">' + esc(String(e.detail).slice(0, 500)) + '</div></details>' : '');
      if (e.kind === 'config') {
        var d = $('#setVision');
        if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
    }
    S.busy = ''; renderInput(); renderStops();
  }

  /** 单一入口：点「出发」。缺坐标的站先在背后定位（不打扰用户），然后生成链接。
   *  定位服务：填了地图 Key 用百度/高德（更准）；否则免 Key 走 OSM Nominatim。
   *  任何站定位失败都不阻塞——links.build 自己会降级（逐段导航 / Apple 纯地名）。 */
  async function doGo() {
    var stops = allStops();
    if (stops.length < 2 || S.busy) return;
    var missing = stops.filter(function (s) { return s.lat == null; });
    if (missing.length) {
      S.busy = 'geo'; renderStops();
      var provider = S.cfg.geoAk ? S.cfg.geoProvider : 'osm';
      $('#goCnt').innerHTML = '<span class="spin"></span> 正在定位 0/' + missing.length +
        (provider === 'osm' ? ' <span style="opacity:.7">(免Key)</span>' : '');
      var res = await ZZGeo.resolveAll(missing, {
        provider: provider, ak: S.cfg.geoAk, proxy: S.cfg.proxy, city: S.city.trim(),
      }, function (i, n) {
        $('#goCnt').innerHTML = '<span class="spin"></span> 正在定位 ' + i + '/' + n;
      });
      res.forEach(function (r, i) {
        var s2 = missing[i];
        if (r.resolved) { s2.lon = r.lon; s2.lat = r.lat; s2.matched = r.matched; s2.address = r.address; s2.error = ''; }
        else { s2.error = r.error || '未定位'; }
      });
      save();
      S.busy = ''; renderStops();
    }
    doBuild();
  }

  function doBuild() {
    var stops = allStops().map(function (s) {
      var o = { name: s.name };
      if (s.lat != null && s.lon != null) { o.lat = s.lat; o.lon = s.lon; }
      return o;
    });
    var res = ZZLinks.build(stops, {
      mode: S.mode, os: ENV.os, city: S.city.trim(),
      originIsMe: S.originIsMe, amapLoose: S.amapLoose,
      src: 'lushu', baiduSrc: (ENV.ios ? 'ios' : ENV.android ? 'andr' : 'webapp') + '.lushu.app',
    });
    renderOut(res);
    $('#out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制'); },
        function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    // file:// 与 http 非安全上下文下 navigator.clipboard 不可用
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制'); }
    catch (e) { toast('复制失败，请长按链接手动复制'); }
    document.body.removeChild(ta);
  }

  /* ---------- 事件 ---------- */

  function bind() {
    $('#tabText').onclick = function () { S.tab = 'text'; renderInput(); };
    $('#tabImg').onclick = function () { S.tab = 'img'; renderInput(); };
    $('#text').addEventListener('input', function () { applyText(false); });
    $('#btnExtract').onclick = doExtractImages;
    $('#btnBuild').onclick = doGo;

    $('#file').onchange = async function (e) {
      var files = Array.prototype.slice.call(e.target.files || []).slice(0, 8);
      S.images = [];
      for (var i = 0; i < files.length; i++) {
        try { S.images.push(await ZZNet.downscale(files[i], 1600, 0.85)); }
        catch (err) { toast('有图片读不出来，已跳过'); }
      }
      renderInput();
      e.target.value = '';
    };

    $('#btnAdd').onclick = function () {
      if (!S.days.length) S.days.push({ label: '行程', stops: [] });
      S.days[S.days.length - 1].stops.push({ id: ++uid, name: '', note: '', conf: 1 });
      save(); renderStops();
      var ins = document.querySelectorAll('#stops .nm');
      if (ins.length) ins[ins.length - 1].focus();
    };
    $('#btnClear').onclick = function () {
      if (!allStops().length || confirm('清空所有地点？')) {
        S.days = []; save(); renderStops(); renderOut(null);
      }
    };

    $('#stops').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]'); if (!btn) return;
      var row = btn.closest('.stop');
      var di = +row.dataset.d, si = +row.dataset.s, act = btn.dataset.act;
      var arr = S.days[di].stops;
      if (act === 'del') arr.splice(si, 1);
      else if (act === 'up' && si > 0) arr.splice(si - 1, 0, arr.splice(si, 1)[0]);
      else if (act === 'down' && si < arr.length - 1) arr.splice(si + 1, 0, arr.splice(si, 1)[0]);
      S.days = S.days.filter(function (d) { return d.stops.length; });
      save(); renderStops();
    });
    $('#stops').addEventListener('change', function (e) {
      var inp = e.target.closest('input[data-act="rename"]'); if (!inp) return;
      var row = inp.closest('.stop');
      var s = S.days[+row.dataset.d].stops[+row.dataset.s];
      s.name = inp.value.trim();
      // 改了名字，之前的坐标不再对应
      s.lon = s.lat = null; s.matched = ''; s.address = ''; s.error = '';
      save(); renderStops();
    });

    $('#out').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act="copy"]');
      if (b) { copy(b.dataset.url); }
    });

    $('#btnTestVision').onclick = async function () {
      var out = $('#testVisionOut');
      out.innerHTML = '<span class="spin"></span> 正在调用…';
      try {
        var t = await ZZVision.ping({
          dialect: (ZZVision.PRESETS[S.cfg.visionPreset] || {}).dialect || 'openai',
          endpoint: S.cfg.endpoint, model: S.cfg.model, apiKey: S.cfg.apiKey, proxy: S.cfg.proxy,
        });
        out.innerHTML = '<div class="note" style="color:var(--ok)">✓ 识别 Key 可用，模型回了：' + esc(t) + '</div>';
      } catch (e) {
        out.innerHTML = '<div class="note err">✗ ' + esc(e.message) + '</div>' +
          (e.detail ? '<div class="note">' + esc(String(e.detail).slice(0, 300)) + '</div>' : '');
      }
    };
    $('#btnTestGeo').onclick = async function () {
      var out = $('#testGeoOut');
      var provider = S.cfg.geoAk ? S.cfg.geoProvider : 'osm';
      out.innerHTML = '<span class="spin"></span> 正在用' +
        (provider === 'osm' ? ' OSM（未填Key的兜底）' : (provider === 'amap' ? '高德' : '百度')) + '搜「天安门」…';
      var res = await ZZGeo.resolveAll([{ name: '天安门' }], {
        provider: provider, ak: S.cfg.geoAk, proxy: S.cfg.proxy, city: '北京',
      });
      var r = res[0];
      out.innerHTML = r.resolved
        ? '<div class="note" style="color:var(--ok)">✓ 定位可用：' + esc(r.matched || '天安门') +
          '（' + r.lon.toFixed(4) + ', ' + r.lat.toFixed(4) + '）</div>'
        : '<div class="note err">✗ ' + esc(r.error || '失败') + '</div>';
    };
    $('#visionPreset').onchange = function (e) { applyPreset(e.target.value); save(); renderCfg(); };
    [['endpoint', 'endpoint'], ['model', 'model'], ['apiKey', 'apiKey'],
     ['geoProvider', 'geoProvider'], ['geoAk', 'geoAk'], ['proxy', 'proxy']].forEach(function (p) {
      $('#' + p[0]).oninput = function (e) { S.cfg[p[1]] = e.target.value.trim(); save(); };
    });
    $('#city').oninput = function (e) { S.city = e.target.value; save(); };
    $('#mode').onchange = function (e) { S.mode = e.target.value; save(); };
    $('#originIsMe').onchange = function (e) { S.originIsMe = e.target.checked; save(); };
    $('#amapLoose').onchange = function (e) { S.amapLoose = e.target.checked; save(); };
    $('#btnDemo').onclick = function () {
      $('#text').value = document.getElementById('demo').textContent.trim();
      S.tab = 'text'; renderInput(); applyText(true);
    };
  }

  load(); bind(); render();
})();
