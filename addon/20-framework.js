/* ============================================================
 * 走着 · 插件层框架：每日地图查看器 + 深浅主题切换
 * 独立于 App 运行时：自己的浮动按钮/overlay/状态，不侵入主流程
 * ============================================================ */
(function () {
  'use strict';
  if (window.__ZZ_ADDON_BOOTED) return;
  window.__ZZ_ADDON_BOOTED = true;

  var MAPS = window.__ZZ_MAPS || [];
  var DAYS = [
    ['9.24', '罗马'], ['9.25', '罗马'], ['9.26', '罗马'], ['9.27', '罗马'],
    ['9.28', '庞贝→索伦托'], ['9.29', '卡普里'], ['9.30', '索伦托'],
    ['10.1', '→佛罗伦萨'], ['10.2', '佛罗伦萨'], ['10.3', '→威尼斯'],
    ['10.4', '威尼斯→米兰'], ['10.5', '米兰'], ['10.6', '回程'],
  ];
  var LSK_THEME = 'zz_theme', LSK_APP = 'zouzhe_italy_2026_v1';

  /* ---------------- CSS ---------------- */
  var CSS = [
    ':root{--zz-cyan:#00F0FF;--zz-mag:#FF2E88;--zz-bg:#0A0F1C;--zz-panel:#0D1424;',
    '--zz-text:#D8E6F0;--zz-sub:#9FB6C9;--zz-dim:#5E7186;--zz-line:rgba(0,240,255,.3);',
    '--zzm-bg:#0A1220;--zzm-water:#0B2438;--zzm-watername:#3E7A96;--zzm-park:#0E2A22;',
    '--zzm-parkname:#3E8A6A;--zzm-roadc:#060B14;--zzm-road:#24384F;--zzm-roadname:#8FB0C6;',
    '--zzm-rail:#6E82A0;--zzm-text:#E8F2FA;--zzm-halo:#050A12;--zzm-note:#7C93A8;--zzm-grid:rgba(0,240,255,.05)}',
    'html.zz-light{--zz-bg:#F2F5F9;--zz-panel:#FFFFFF;--zz-text:#1D2A38;--zz-sub:#44586C;',
    '--zz-dim:#7A8CA0;--zz-line:rgba(0,120,140,.35);--zz-cyan:#0090A8;--zz-mag:#D81B6E;',
    '--zzm-bg:#EEF3F8;--zzm-water:#C9E2F2;--zzm-watername:#4A7FA0;--zzm-park:#D4EAD8;',
    '--zzm-parkname:#4E8A62;--zzm-roadc:#B9C6D6;--zzm-road:#FFFFFF;--zzm-roadname:#4A5D72;',
    '--zzm-rail:#8A9AB0;--zzm-text:#15222F;--zzm-halo:#FFFFFF;--zzm-note:#5A6E82;--zzm-grid:rgba(0,100,120,.06)}',
    /* 浅色模式：整体反色滤镜作用于 App 容器（插件 UI 不受影响，走上面的变量） */
    'html.zz-light .zz-apphold{filter:invert(1) hue-rotate(180deg) contrast(.92) saturate(1.2);background:#0d0a06}',
    /* 顶栏右上角主题切换按钮：位于「走着」banner 行最右（网络点之后）。
       在 App 容器内，固定深色值 → 浅色模式经反色滤镜与顶栏其余元素同步变换 */
    '.zz-tbtheme{flex:none;width:34px;height:34px;margin-left:0;display:flex;align-items:center;justify-content:center;',
    'background:none;border:none;color:#00F0FF;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}',
    '.zz-tbtheme svg{width:20px;height:20px;display:block}',
    /* overlay */
    '.zz-ov{position:fixed;inset:0;z-index:9000;background:var(--zz-bg);display:none;flex-direction:column;font-family:"Noto Sans SC",system-ui,sans-serif}',
    '.zz-ov.on{display:flex}',
    '.zz-ovhead{flex:none;display:flex;align-items:center;gap:10px;padding:12px 14px 8px;border-bottom:1px solid var(--zz-line)}',
    '.zz-ovmark{font:900 15px "Share Tech Mono",monospace;color:var(--zz-cyan);text-shadow:0 0 10px rgba(0,240,255,.5)}',
    'html.zz-light .zz-ovmark{text-shadow:none}',
    '.zz-ovtitle{flex:1;font:700 14px/1.3 "Noto Sans SC",system-ui;color:var(--zz-text)}',
    '.zz-ovtitle small{display:block;font:400 10.5px "Noto Sans SC",system-ui;color:var(--zz-dim);margin-top:1px}',
    '.zz-x{flex:none;width:40px;height:40px;border:1px solid var(--zz-line);border-radius:3px;background:transparent;color:var(--zz-sub);font-size:18px;cursor:pointer}',
    '.zz-days{flex:none;display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-bottom:1px solid var(--zz-line);scrollbar-width:none}',
    '.zz-days::-webkit-scrollbar{display:none}',
    '.zz-day{flex:none;min-width:46px;min-height:40px;padding:4px 6px;border-radius:3px;border:1px solid rgba(94,113,134,.35);',
    'color:var(--zz-dim);font:700 11px "Share Tech Mono",monospace;text-align:center;cursor:pointer;background:transparent}',
    '.zz-day span{display:block;font-size:9px;font-weight:400;margin-top:1px}',
    '.zz-day.on{color:var(--zz-cyan);border-color:var(--zz-cyan);box-shadow:0 0 10px rgba(0,240,255,.35);background:rgba(0,240,255,.07)}',
    '.zz-tabs{flex:none;display:flex;gap:6px;overflow-x:auto;padding:8px 12px 2px;scrollbar-width:none}',
    '.zz-tabs::-webkit-scrollbar{display:none}',
    '.zz-tab{flex:none;padding:8px 12px;min-height:36px;border-radius:3px;border:1px solid rgba(94,113,134,.35);color:var(--zz-sub);font:600 12px "Noto Sans SC",system-ui;cursor:pointer;background:transparent}',
    '.zz-tab.on{color:var(--zz-mag);border-color:var(--zz-mag);box-shadow:0 0 10px rgba(255,46,136,.3);background:rgba(255,46,136,.07)}',
    '.zz-canvas{flex:1;position:relative;overflow:hidden;background:var(--zzm-bg);touch-action:none}',
    '.zz-inner{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}',
    '.zz-inner svg{display:block}',
    '.zz-zoom{position:absolute;right:10px;bottom:14px;display:flex;flex-direction:column;gap:8px;z-index:2}',
    '.zz-zbtn{width:42px;height:42px;border-radius:3px;border:1px solid var(--zz-line);background:rgba(13,20,36,.85);color:var(--zz-cyan);font:700 18px "Share Tech Mono",monospace;cursor:pointer}',
    'html.zz-light .zz-zbtn{background:rgba(255,255,255,.9);color:#0090A8}',
    '.zz-foot{flex:none;padding:8px 14px calc(10px + env(safe-area-inset-bottom));border-top:1px solid var(--zz-line);',
    'font:10.5px/1.6 "Share Tech Mono",monospace;color:var(--zz-dim);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}',
    '.zz-leg i{display:inline-block;width:16px;height:0;border-top:2.5px solid var(--zz-cyan);vertical-align:middle;margin:0 4px 2px 8px}',
    '.zz-leg i.r{border-top-style:dashed;border-color:var(--zz-mag)}.zz-leg i.s{border-top-style:dotted}',
    /* 行程页内嵌地图预览（并入 ROUTE 路线卡同一框内：地图在上，站点图在下） */
    '.zz-inline{margin:6px 4px 4px;padding-bottom:8px;border-bottom:1px solid rgba(0,240,255,.15);background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.zz-inhead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:6px 4px 7px}',
    '.zz-inhead b{font:600 10px "Share Tech Mono",monospace;color:#00F0FF;opacity:.8;letter-spacing:.5px;font-weight:600}',
    '.zz-inhead span{font:600 10px "Share Tech Mono",monospace;color:#5E7186;white-space:nowrap}',
    /* 统一预览视窗：固定高度，地图按比例居中放入，留边与图底同色 */
    '.zz-inthumb{position:relative;height:184px;background:#0A1220;border:1px solid rgba(0,240,255,.18);border-radius:3px;overflow:hidden}',
    '.zz-inthumb svg{width:100%;height:100%;display:block}',
    '.zz-inzoom{position:absolute;right:8px;bottom:8px;padding:4px 9px;border:1px solid rgba(0,240,255,.4);border-radius:3px;background:rgba(10,15,28,.78);color:#00F0FF;font:600 10px "Share Tech Mono",monospace}',
    /* —— 厕所位置：与节点信息/按钮区分离的独立区块（三种交互方案） —— */
    /* A/B：卡尾独立分区（虚线分隔线明确与上方节点操作区切开） */
    '.zz-wcsec{margin:12px -2px 0;padding:10px 2px 2px;border-top:1px dashed rgba(0,240,255,.3)}',
    '.zz-wch{display:flex;align-items:center;gap:8px;min-height:36px;cursor:pointer;-webkit-tap-highlight-color:transparent;',
    'font:600 11px "Share Tech Mono",monospace;color:#00F0FF;letter-spacing:.5px}',
    '.zz-wcsec.warn .zz-wch{color:#FF2E88}',
    '.zz-wch .zz-wcarw{margin-left:auto;font-size:13px;opacity:.8}',
    '.zz-wcb{padding:2px 1px 4px;font:12.5px/1.7 "Noto Sans SC",system-ui;color:#D8E6F0}',
    /* —— 票根模块（原型）：缩略图网格 / 添加位 / 全屏查看 —— */
    '.zz-tksec{margin:12px -2px 0;padding:10px 2px 2px;border-top:1px dashed rgba(0,240,255,.3)}',
    '.zz-tksec .zz-wch{cursor:default}',
    '.zz-tkgrid{display:flex;gap:9px;flex-wrap:wrap;padding:7px 1px 4px}',
    '.zz-tkthumb{position:relative;width:64px;height:88px;border:1px solid rgba(0,240,255,.35);border-radius:3px;overflow:hidden;background:#E8E4D8;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.zz-tkthumb img{width:100%;height:100%;object-fit:cover;display:block}',
    '.zz-tkadd{width:64px;height:88px;border:1px dashed rgba(0,240,255,.45);border-radius:3px;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:3px;color:#00F0FF;background:rgba(0,240,255,.03);cursor:pointer;',
    'font:600 10.5px "Noto Sans SC",system-ui;-webkit-tap-highlight-color:transparent}',
    '.zz-tkadd span{font:300 22px/1 "Share Tech Mono",monospace}',
    '.zz-tkcard{margin:10px 14px 0;border:1px solid rgba(0,240,255,.22);border-radius:4px;background:rgba(255,255,255,.03);padding:10px 12px 8px}',
    '.zz-tkcard>b{display:flex;justify-content:space-between;font:600 10px "Share Tech Mono",monospace;color:#00F0FF;letter-spacing:.5px}',
    '.zz-tkcard>b span{color:#5E7186;font-weight:400}',
    '.zz-tkview{position:fixed;inset:0;z-index:9600;display:flex;flex-direction:column;align-items:center;justify-content:center}',
    '.zz-tkview-scrim{position:absolute;inset:0;background:rgba(2,4,10,.92)}',
    '.zz-tkview img{position:relative;max-width:86%;max-height:64%;border:1px solid rgba(0,240,255,.4);border-radius:4px;box-shadow:0 0 40px rgba(0,240,255,.18)}',
    '.zz-tkview-cap{position:relative;margin-top:12px;font:600 12px "Noto Sans SC",system-ui;color:#D8E6F0}',
    '.zz-tkview-hint{position:relative;margin-top:4px;font:10.5px "Share Tech Mono",monospace;color:#5E7186}',
    '.zz-tkview-row{position:relative;display:flex;gap:10px;margin-top:16px}',
    '.zz-tkview-row button{min-width:120px;min-height:42px;border-radius:3px;font:600 13px "Noto Sans SC",system-ui;cursor:pointer}',
    '.zz-tkview-x{border:1px solid rgba(0,240,255,.4);background:rgba(0,240,255,.08);color:#00F0FF}',
    '.zz-tkview-del{border:1px solid rgba(255,46,136,.45);background:transparent;color:#FF2E88}',
        '.zz-tkcap{position:absolute;left:0;right:0;bottom:0;padding:2px 3px;background:rgba(5,10,18,.74);color:#D8E6F0;font:8.5px "Noto Sans SC",system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.zz-tkpick,.zz-tkcfm{position:fixed;inset:0;z-index:9650}',
    '.zz-tkpick-card{position:absolute;left:16px;right:16px;bottom:calc(80px + env(safe-area-inset-bottom));max-width:480px;margin:0 auto;background:#0D1424;border:1px solid rgba(0,240,255,.4);border-radius:6px;padding:14px 16px;box-shadow:0 0 30px rgba(0,240,255,.15)}',
    '.zz-tkpick-card b{display:block;font:600 12px "Share Tech Mono",monospace;color:#00F0FF;margin-bottom:2px}',
    '.zz-tkpick-card i{display:block;font:400 11px "Noto Sans SC",system-ui;color:#5E7186;font-style:normal;margin-bottom:8px}',
    '.zz-tkpick-list{max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:10px}',
    '.zz-tkpick-item{text-align:left;min-height:42px;padding:8px 12px;border:1px solid rgba(94,113,134,.35);border-radius:3px;background:rgba(255,255,255,.02);color:#D8E6F0;font:13px "Noto Sans SC",system-ui;cursor:pointer}',
    /* 删除确认弹层：标题/副标题用正文字体；取消左·删除右，等宽撑满 */
    '.zz-tkcfm .zz-tkpick-card b{font:700 15px "Noto Sans SC",system-ui;color:#FFFFFF;letter-spacing:0;margin-bottom:3px}',
    '.zz-tkcfm .zz-tkpick-card i{font:400 12px "Noto Sans SC",system-ui;color:#9FB6C9;margin-bottom:0}',
    '.zz-tkcfm-row{display:flex;gap:10px;margin-top:14px}',
    '.zz-tkcfm-row button{flex:1;min-width:0;min-height:44px;border-radius:3px;font:600 14px "Noto Sans SC",system-ui;cursor:pointer}',
    '.zz-tkcfm-row .zz-tkcfm-yes{background:rgba(255,46,136,.12)}',
    '.zz-toast{position:fixed;left:50%;bottom:100px;transform:translateX(-50%);z-index:9700;padding:9px 16px;border-radius:4px;',
    'background:rgba(13,20,36,.92);border:1px solid rgba(0,240,255,.4);color:#7FDBE8;font:12.5px "Noto Sans SC",system-ui}',
    /* 路线图上标示当前所看行程段：站名青色加粗+细下划线（无背景/发光，不出界不叠加） */
    '.zz-onseg>div:nth-of-type(2){color:#00F0FF!important;font-weight:700!important}',
    '.zz-onseg::after{content:"";width:24px;height:2px;background:#00F0FF;margin-top:3px;border-radius:1px}',
    /* 预览卡位于 App 容器内：浅色模式经反色滤镜呈现，故其内部（含 SVG 地图）
       固定使用深色值，交由滤镜映射为日间色，避免变量被二次反转 */
    'html.zz-light .zz-inline{--zz-cyan:#00F0FF;--zz-mag:#FF2E88;--zz-line:rgba(0,240,255,.3);',
    '--zzm-bg:#0A1220;--zzm-water:#0B2438;--zzm-watername:#3E7A96;--zzm-park:#0E2A22;--zzm-parkname:#3E8A6A;',
    '--zzm-roadc:#060B14;--zzm-road:#24384F;--zzm-roadname:#8FB0C6;--zzm-rail:#6E82A0;--zzm-text:#E8F2FA;',
    '--zzm-halo:#050A12;--zzm-note:#7C93A8;--zzm-grid:rgba(0,240,255,.05)}',
    /* SVG 图层 */
    '.zzm-water{fill:var(--zzm-water)}.zzm-watername{fill:var(--zzm-watername)}',
    '.zzm-park{fill:var(--zzm-park)}.zzm-parkname{fill:var(--zzm-parkname)}',
    '.zzm-roadc{stroke:var(--zzm-roadc);fill:none;stroke-linecap:round;stroke-linejoin:round}',
    '.zzm-road{stroke:var(--zzm-road);fill:none;stroke-linecap:round;stroke-linejoin:round}',
    '.zzm-roadname{fill:var(--zzm-roadname);font:15px "Noto Sans SC",system-ui;letter-spacing:.5px}',
    '.zzm-rail{stroke:var(--zzm-rail);fill:none;stroke-width:4;stroke-dasharray:10 6}',
    '.zzm-railname{fill:var(--zzm-rail);font:14.5px "Noto Sans SC",system-ui}',
    '.zzm-rt{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:5.5}',
    '.zzm-rt.walk{stroke:var(--zz-cyan);filter:drop-shadow(0 0 4px rgba(0,240,255,.6))}',
    '.zzm-rt.ride{stroke:var(--zz-mag);stroke-dasharray:12 7;filter:drop-shadow(0 0 4px rgba(255,46,136,.5))}',
    '.zzm-rt.sea{stroke:var(--zz-cyan);stroke-dasharray:2 8;stroke-width:5}',
    '.zzm-ah-w{fill:var(--zz-cyan)}.zzm-ah-r{fill:var(--zz-mag)}',
    '.zzm-poiname{fill:var(--zzm-text);font:600 18px "Noto Sans SC",system-ui;paint-order:stroke;stroke:var(--zzm-halo);stroke-width:4px;stroke-linejoin:round}',
    '.zzm-time{fill:var(--zz-cyan);font:700 15px "Share Tech Mono",monospace;paint-order:stroke;stroke:var(--zzm-halo);stroke-width:4px}',
    '.zzm-note{fill:var(--zzm-note);font:14.5px "Share Tech Mono",monospace}',
    '.zzm-compass{stroke:var(--zz-cyan);fill:none}.zzm-compassN{fill:var(--zz-cyan);font:700 15px "Share Tech Mono",monospace}',
    '.zzm-scale{fill:var(--zzm-note);font:13px "Share Tech Mono",monospace}',
  ].join('');

  /* ---------------- SVG 渲染 ---------------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function ptsD(pts) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) d += ' L' + pts[i][0] + ' ' + pts[i][1];
    return d;
  }
  function poly(pts) { return pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }
  function centroid(pts) {
    var x = 0, y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }

  var POI = {
    si: { c: 'var(--zz-cyan)', shape: 'diamond', label: '景点' },
    fd: { c: 'var(--zz-mag)', shape: 'dot', label: '餐食' },
    ht: { c: 'var(--zz-mag)', shape: 'house', label: '住宿' },
    st: { c: 'var(--zzm-text)', shape: 'square', label: '车站' },
    pt: { c: 'var(--zz-cyan)', shape: 'tri', label: '码头' },
    mk: { c: 'var(--zzm-note)', shape: 'ring', label: '参照物' },
  };

  function poiShape(x, y, t) {
    var c = (POI[t] || POI.mk).c, s = (POI[t] || POI.mk).shape;
    if (s === 'diamond') return '<path d="M' + x + ' ' + (y - 10) + ' L' + (x + 10) + ' ' + y + ' L' + x + ' ' + (y + 10) + ' L' + (x - 10) + ' ' + y + ' Z" fill="' + c + '" filter="drop-shadow(0 0 5px ' + 'rgba(0,240,255,.55))"/>';
    if (s === 'dot') return '<circle cx="' + x + '" cy="' + y + '" r="8.5" fill="' + c + '" filter="drop-shadow(0 0 5px rgba(255,46,136,.55))"/><circle cx="' + x + '" cy="' + y + '" r="3.2" fill="var(--zzm-halo)"/>';
    if (s === 'house') return '<path d="M' + (x - 9) + ' ' + (y + 8) + ' V' + (y - 1) + ' L' + x + ' ' + (y - 10) + ' L' + (x + 9) + ' ' + (y - 1) + ' V' + (y + 8) + ' Z" fill="' + c + '"/>';
    if (s === 'square') return '<rect x="' + (x - 8) + '" y="' + (y - 8) + '" width="16" height="16" fill="var(--zzm-bg)" stroke="var(--zz-cyan)" stroke-width="3"/>';
    if (s === 'tri') return '<path d="M' + x + ' ' + (y - 10) + ' L' + (x + 10) + ' ' + (y + 8) + ' L' + (x - 10) + ' ' + (y + 8) + ' Z" fill="none" stroke="' + c + '" stroke-width="3"/>';
    return '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="none" stroke="' + c + '" stroke-width="3"/>';
  }

  function poiLabel(x, y, name, time, anc) {
    var tx = x + 17, ty = y + 6, anchor = 'start';
    if (anc === 'l') { tx = x - 17; anchor = 'end'; }
    else if (anc === 'b') { tx = x; ty = y + 31; anchor = 'middle'; }
    else if (anc === 't') { tx = x; ty = y - 20; anchor = 'middle'; }
    var out = '<text class="zzm-poiname" x="' + tx + '" y="' + ty + '" text-anchor="' + anchor + '">' + esc(name) + '</text>';
    if (time) out += '<text class="zzm-time" x="' + tx + '" y="' + (ty + 19) + '" text-anchor="' + anchor + '">' + esc(time) + '</text>';
    return out;
  }

  function renderMap(m) {
    var i, id = m.id, s = [];
    s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + m.W + ' ' + m.H + '" width="' + m.W + '" height="' + m.H + '">');
    s.push('<defs>',
      '<marker id="ah-walk" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="zzm-ah-w"/></marker>',
      '<marker id="ah-ride" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="zzm-ah-r"/></marker>',
      '<marker id="ah-sea" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="zzm-ah-w"/></marker>',
      '</defs>');
    s.push('<rect x="0" y="0" width="' + m.W + '" height="' + m.H + '" fill="var(--zzm-bg)"/>');
    /* 网格底纹 */
    for (i = 80; i < m.W; i += 80) s.push('<line x1="' + i + '" y1="0" x2="' + i + '" y2="' + m.H + '" stroke="var(--zzm-grid)" stroke-width="1"/>');
    for (i = 80; i < m.H; i += 80) s.push('<line x1="0" y1="' + i + '" x2="' + m.W + '" y2="' + i + '" stroke="var(--zzm-grid)" stroke-width="1"/>');

    (m.water || []).forEach(function (w, wi) {
      var c = centroid(w.pts);
      s.push('<polygon class="zzm-water" points="' + poly(w.pts) + '"/>');
      if (w.n) s.push('<text class="zzm-watername" font-size="16" x="' + c[0] + '" y="' + c[1] + '" text-anchor="middle">' + esc(w.n) + '</text>');
    });
    (m.park || []).forEach(function (p) {
      var c = centroid(p.pts);
      s.push('<polygon class="zzm-park" points="' + poly(p.pts) + '" opacity=".9"/>');
      if (p.n) s.push('<text class="zzm-parkname" font-size="16" x="' + c[0] + '" y="' + c[1] + '" text-anchor="middle">' + esc(p.n) + '</text>');
    });
    (m.roads || []).forEach(function (r, ri) {
      var w = r.w || 12, pid = id + '-rd' + ri;
      s.push('<path id="' + pid + '" d="' + ptsD(r.pts) + '" fill="none" stroke="none"/>');
      s.push('<path d="' + ptsD(r.pts) + '" class="zzm-roadc" stroke-width="' + (w + 5) + '"/>');
      s.push('<path d="' + ptsD(r.pts) + '" class="zzm-road" stroke-width="' + w + '"/>');
      if (r.n) s.push('<text class="zzm-roadname" dy="-6"><textPath href="#' + pid + '" startOffset="8%">' + esc(r.n) + '</textPath></text>');
    });
    (m.rail || []).forEach(function (r, ri) {
      var pid = id + '-rl' + ri;
      s.push('<path id="' + pid + '" d="' + ptsD(r.pts) + '" fill="none" stroke="none"/>');
      s.push('<path d="' + ptsD(r.pts) + '" class="zzm-rail"/>');
      if (r.n) s.push('<text class="zzm-railname" dy="-9"><textPath href="#' + pid + '" startOffset="6%">' + esc(r.n) + '</textPath></text>');
    });
    (m.route || []).forEach(function (r) {
      var k = r.k || 'walk';
      s.push('<path d="' + ptsD(r.pts) + '" class="zzm-rt ' + k + '" marker-mid="url(#ah-' + k + ')" marker-end="url(#ah-' + k + ')"/>');
    });
    (m.pois || []).forEach(function (p) {
      s.push(poiShape(p[0], p[1], p[2]));
      s.push(poiLabel(p[0], p[1], p[3], p[4], p[5]));
    });
    (m.notes || []).forEach(function (n) {
      var lines = String(n[2]).split('\n');
      s.push('<text class="zzm-note" x="' + n[0] + '" y="' + n[1] + '">');
      lines.forEach(function (ln, li) {
        s.push('<tspan x="' + n[0] + '" dy="' + (li ? 15 : 0) + '">' + esc(ln) + '</tspan>');
      });
      s.push('</text>');
    });
    /* 指北针 / 线路图标记 */
    if (m.flat) {
      s.push('<text class="zzm-scale" x="' + (m.W - 20) + '" y="34" text-anchor="end">〔线路示意图 · 非地理方位〕</text>');
    } else {
      var cx = m.W - 52, cy = 56;
      s.push('<circle class="zzm-compass" cx="' + cx + '" cy="' + cy + '" r="22" stroke-width="1.5" opacity=".8"/>');
      s.push('<path d="M' + cx + ' ' + (cy - 16) + ' L' + (cx + 6) + ' ' + (cy + 8) + ' L' + cx + ' ' + (cy + 2) + ' L' + (cx - 6) + ' ' + (cy + 8) + ' Z" fill="var(--zz-cyan)"/>');
      s.push('<text class="zzm-compassN" x="' + cx + '" y="' + (cy - 26) + '" text-anchor="middle">N</text>');
      s.push('<text class="zzm-scale" x="' + (cx + 22) + '" y="' + (cy + 42) + '" text-anchor="end">北为上 · 示意非等比</text>');
    }
    s.push('</svg>');
    return s.join('');
  }

  /* ---------------- 主题 ---------------- */
  function getTheme() {
    try { return localStorage.getItem(LSK_THEME) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; }
  }
  function applyTheme(mode) {
    var light = mode === 'light';
    document.documentElement.classList.toggle('zz-light', light);
    try { localStorage.setItem(LSK_THEME, mode); } catch (e) {}
    try { if (window.ZouzheBridge && window.ZouzheBridge.setTheme) window.ZouzheBridge.setTheme(mode); } catch (e) {}
    var tb = document.querySelector('.zz-tbtheme');
    if (tb) { tb.innerHTML = light ? ICON_MOON : ICON_SUN; tb.setAttribute('data-ic', mode); }
  }
  function tagAppHolder() {
    /* 给 App 最外层容器打标（浅色反色滤镜的作用对象），重渲染后自动补 */
    var root = null, divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var st = divs[i].getAttribute('style') || '';
      if (st.indexOf('520px') >= 0 && st.indexOf('100dvh') >= 0) { root = divs[i]; break; }
    }
    if (root) {
      var hold = root.parentElement && root.parentElement !== document.body ? root.parentElement : root;
      if (!hold.classList.contains('zz-apphold')) hold.classList.add('zz-apphold');
      return true;
    }
    return false;
  }

  var ICON_MAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14" stroke-dasharray="2 2.5"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';

  /* ---------------- 查看器 ---------------- */
  var ov = null, state = { day: 1, mi: 0, sc: 1, tx: 0, ty: 0, pushed: false };

  function mapsOf(day) { return MAPS.filter(function (m) { return m.day === day; }); }

  function currentAppDay() {
    try {
      var s = JSON.parse(localStorage.getItem(LSK_APP) || 'null');
      var d = s && s.day;
      if (d >= 1 && d <= 13) return d;
    } catch (e) {}
    return 1;
  }

  function buildOverlay() {
    ov = document.createElement('div');
    ov.className = 'zz-ov';
    ov.innerHTML =
      '<div class="zz-ovhead"><span class="zz-ovmark">MAP//</span>' +
      '<div class="zz-ovtitle"><span class="zz-t1"></span><small class="zz-t2"></small></div>' +
      '<button class="zz-x" aria-label="关闭">✕</button></div>' +
      '<div class="zz-days"></div>' +
      '<div class="zz-tabs"></div>' +
      '<div class="zz-canvas"><div class="zz-inner"></div>' +
      '<div class="zz-zoom"><button class="zz-zbtn zz-zi">＋</button><button class="zz-zbtn zz-zo">－</button><button class="zz-zbtn zz-zr">⟲</button></div></div>' +
      '<div class="zz-foot"><span class="zz-leg">步行<i></i>车/船<i class="r"></i>海路<i class="s"></i></span>' +
      '<span>双指缩放 · 拖动平移 · 双击放大</span></div>';
    document.body.appendChild(ov);

    var days = ov.querySelector('.zz-days');
    for (var d = 1; d <= 13; d++) {
      var b = document.createElement('button');
      b.className = 'zz-day';
      b.innerHTML = 'D' + d + '<span>' + DAYS[d - 1][0] + '</span>';
      (function (dd) { b.addEventListener('click', function () { setDay(dd, 0); }); })(d);
      days.appendChild(b);
    }
    ov.querySelector('.zz-x').addEventListener('click', close);
    ov.querySelector('.zz-zi').addEventListener('click', function () { zoomBy(1.35); });
    ov.querySelector('.zz-zo').addEventListener('click', function () { zoomBy(1 / 1.35); });
    ov.querySelector('.zz-zr').addEventListener('click', function () { fit(); });
    bindGestures();
    window.addEventListener('popstate', function () {
      if (window.__ZZ_NAV_CONSUMED) return; /* 本次返回已被票根浮层消费 */
      if (ov && ov.classList.contains('on')) { state.pushed = false; hide(); }
    });
  }

  function setDay(d, mi) {
    state.day = d; state.mi = mi || 0;
    var list = mapsOf(d), m = list[state.mi] || list[0];
    var chips = ov.querySelectorAll('.zz-day');
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', i === d - 1);
    var on = chips[d - 1];
    if (on && on.scrollIntoView) try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {}
    var tabs = ov.querySelector('.zz-tabs');
    tabs.innerHTML = ''; tabs.style.display = list.length > 1 ? 'flex' : 'none';
    list.forEach(function (mm, ti) {
      var b = document.createElement('button');
      b.className = 'zz-tab' + (ti === state.mi ? ' on' : '');
      b.textContent = (ti + 1) + ' · ' + mm.t;
      b.addEventListener('click', function () { setDay(d, ti); });
      tabs.appendChild(b);
    });
    if (!m) return;
    ov.querySelector('.zz-t1').textContent = 'D' + d + ' · ' + DAYS[d - 1][0] + ' ' + DAYS[d - 1][1] + ' — ' + m.t;
    ov.querySelector('.zz-t2').textContent = m.s + '（离线示意图 · 点右下角缩放）';
    ov.querySelector('.zz-inner').innerHTML = renderMap(m);
    state.m = m;
    fit();
  }

  function fit() {
    var cv = ov.querySelector('.zz-canvas'), m = state.m;
    if (!m) return;
    var cw = cv.clientWidth, ch = cv.clientHeight;
    var sc = Math.min(cw / m.W, ch / m.H);
    state.sc = sc;
    state.tx = (cw - m.W * sc) / 2;
    state.ty = (ch - m.H * sc) / 2;
    applyXf();
  }
  function applyXf() {
    ov.querySelector('.zz-inner').style.transform =
      'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.sc + ')';
  }
  function clampZoom(s) {
    var m = state.m, cv = ov.querySelector('.zz-canvas');
    var base = Math.min(cv.clientWidth / m.W, cv.clientHeight / m.H);
    return Math.max(base * 0.7, Math.min(base * 6, s));
  }
  function zoomAt(cx, cy, factor) {
    var ns = clampZoom(state.sc * factor);
    factor = ns / state.sc;
    state.tx = cx - (cx - state.tx) * factor;
    state.ty = cy - (cy - state.ty) * factor;
    state.sc = ns;
    applyXf();
  }
  function zoomBy(f) {
    var cv = ov.querySelector('.zz-canvas');
    zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, f);
  }

  function bindGestures() {
    var cv = ov.querySelector('.zz-canvas');
    var pan = null, pinch = null, lastTap = 0;
    function pt(t) { var r = cv.getBoundingClientRect(); return [t.clientX - r.left, t.clientY - r.top]; }
    cv.addEventListener('touchstart', function (e) {
      if (e.target.closest && e.target.closest('.zz-zoom')) return;
      if (e.touches.length === 1) {
        var p = pt(e.touches[0]);
        pan = { x: p[0], y: p[1], tx: state.tx, ty: state.ty };
        var now = Date.now();
        if (now - lastTap < 300) {
          var cvEl = ov.querySelector('.zz-canvas');
          var base = Math.min(cvEl.clientWidth / state.m.W, cvEl.clientHeight / state.m.H);
          if (state.sc > base * 1.5) fit(); else zoomAt(p[0], p[1], 2.2);
        }
        lastTap = now;
      } else if (e.touches.length === 2) {
        pan = null;
        var a = pt(e.touches[0]), b = pt(e.touches[1]);
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, sc: state.sc, tx: state.tx, ty: state.ty };
      }
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && pan) {
        var p = pt(e.touches[0]);
        state.tx = pan.tx + p[0] - pan.x; state.ty = pan.ty + p[1] - pan.y;
        applyXf();
      } else if (e.touches.length === 2 && pinch) {
        var a = pt(e.touches[0]), b = pt(e.touches[1]);
        var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        var f = clampZoom(pinch.sc * (d / pinch.d)) / pinch.sc;
        state.sc = pinch.sc * f;
        state.tx = pinch.cx - (pinch.cx - pinch.tx) * f;
        state.ty = pinch.cy - (pinch.cy - pinch.ty) * f;
        applyXf();
      }
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) { pan = null; pinch = null; }
      else if (e.touches.length === 1 && pinch) { var p = pt(e.touches[0]); pan = { x: p[0], y: p[1], tx: state.tx, ty: state.ty }; pinch = null; }
    });
    /* 桌面调试 */
    cv.addEventListener('wheel', function (e) {
      var r = cv.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.18 : 1 / 1.18);
      e.preventDefault();
    }, { passive: false });
    var mdown = null;
    cv.addEventListener('mousedown', function (e) { mdown = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty }; });
    window.addEventListener('mousemove', function (e) {
      if (mdown && ov.classList.contains('on')) { state.tx = mdown.tx + e.clientX - mdown.x; state.ty = mdown.ty + e.clientY - mdown.y; applyXf(); }
    });
    window.addEventListener('mouseup', function () { mdown = null; });
    cv.addEventListener('dblclick', function (e) {
      var r = cv.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, 2.0);
    });
  }

  function open(day, mi) {
    if (!ov) buildOverlay();
    ov.classList.add('on');
    try { history.pushState({ zz: 1 }, ''); state.pushed = true; } catch (e) { state.pushed = false; }
    setDay(day >= 1 && day <= 13 ? day : currentAppDay(), mi || 0);
  }
  function hide() { if (ov) ov.classList.remove('on'); }
  function close() {
    if (state.pushed) { state.pushed = false; try { history.back(); return; } catch (e) {} }
    hide();
  }

  /* ---------------- 行程页内嵌预览（与「精简行程」路线卡联动） ---------------- */
  var inlineBox = null, inlineState = { day: 0, mi: 0 };

  /* 路线卡站点标签 → 子图序号（多图日；点击站点即切到该场景的地图） */
  var STOP_MI = {
    2: { '特米尼': 0, '圣彼得': 0, '博物馆': 0, '圣天使堡': 1, '晚餐': 1 },
    3: { '圣依纳爵': 0, '万神殿': 0, '台阶': 1, '博尔盖塞': 1, '平丘': 1, '特莱维': 2 },
    4: { '真理之口': 0, '维托里亚诺': 0, '古罗马': 0, '斗兽场': 0, '特斯塔乔': 1 },
    5: { '特米尼': 0, '存箱': 0, '庞贝': 1, '取箱': 0, '索伦托': 2 },
    7: { '索伦托角': 0, '浴场': 0, '午餐': 1, '民宿': 1, '大海滩': 1 },
    8: { '索伦托': 0, '存箱': 0, 'Da Michele': 0, '取箱': 0, '佛罗伦萨': 1 },
    9: { '学院': 0, 'Mario': 0, '乌菲兹': 0, '米开朗基罗': 1, 'Il Latini': 1 },
    10: { '穹顶': 0, '新圣母站': 0, '威尼斯': 1, '酒馆': 1, '朱代卡': 1 },
    11: { '朱代卡': 0, '圣马可': 0, '大殿': 0, '里亚托': 0, '车站': 1, '米兰': 1 },
    12: { '大教堂': 0, '城堡': 0, '布雷拉': 0, '伴手礼': 0, '运河': 1 },
  };

  /* 捕获阶段监听路线卡点击：站点（圆点+站名+时刻容器）命中时拦截——
     只切换对应子图，不再弹出节点信息卡（capture 先于站点自身 handler） */
  function onRouteClick(e) {
    if (!inlineBox) return;
    if (e.target.closest && e.target.closest('.zz-inline')) return; /* 预览区自己的点击 */
    var el = e.target, m = null;
    for (var up = 0; el && el !== e.currentTarget && up < 5; up++) {
      var text = (el.textContent || '').replace(/\s+/g, '');
      if (text && text.length <= 16) {
        m = /^(.+?)(\d{1,2}:\d{2})$/.exec(text); /* 站名+时刻 → 是站点 */
        if (m) break;
      }
      el = el.parentElement;
    }
    if (!m) return;             /* 非站点区域：交给 App */
    e.stopPropagation();        /* 站点点击仅切图，不弹节点卡片 */
    var rules = STOP_MI[inlineState.day];
    if (!rules) return;         /* 单图日：无需切换 */
    var label = m[1], hit = null, hitLen = -1;
    for (var k in rules) {
      var kk = k.replace(/\s+/g, '');
      if (label.indexOf(kk) === 0 && kk.length > hitLen) { hit = k; hitLen = kk.length; }
    }
    if (hit != null && rules[hit] !== inlineState.mi) {
      inlineState.mi = rules[hit];
      renderInline(inlineState.day);
    }
  }

  function findRouteCard() {
    var divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      var t = (el.textContent || '').trim();
      if (t.length > 24) continue;
      var mm = /^ROUTE\s*\/\/\s*D(\d+)$/.exec(t);
      if (!mm) continue;
      var card = el;
      while (card && card !== document.body) {
        var st = card.getAttribute('style') || '';
        if (st.indexOf('rgba(0,240,255,.22)') >= 0 || st.indexOf('rgba(0, 240, 255, 0.22)') >= 0) break;
        card = card.parentElement;
      }
      if (!card || card === document.body) {
        card = el.parentElement && el.parentElement.parentElement; /* 标签→头行→卡片 兜底 */
      }
      if (card) return { day: +mm[1], card: card, head: el.parentElement };
    }
    return null;
  }

  function renderInline(day) {
    var list = mapsOf(day), m = list[inlineState.mi] || list[0];
    if (!m) { inlineBox.innerHTML = ''; return; }
    var hint = list.length > 1
      ? (inlineState.mi + 1) + '/' + list.length + ' · 点下方站点切图 · 点图全屏'
      : '点击全屏缩放';
    var h = '<div class="zz-inhead"><b>MAP// ' + esc(m.t) + '</b><span>' + hint + '</span></div>';
    h += '<div class="zz-inthumb">' + renderMap(m) + '<span class="zz-inzoom">⛶ 全屏</span></div>';
    inlineBox.innerHTML = h;
    if (inlineBox.parentElement) markStops(inlineBox.parentElement);
  }

  /* 高亮路线图上属于当前子图的站点（站点容器 = 圆点+站名+时刻，≥2个子元素）。
     单图日不标——不存在「看哪段」的歧义 */
  function markStops(card) {
    var rules = STOP_MI[inlineState.day];
    var divs = card.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.closest && el.closest('.zz-inline')) continue;
      if (el.childElementCount < 2) continue;
      var text = (el.textContent || '').replace(/\s+/g, '');
      var m = text.length <= 16 && /^(.+?)\d{1,2}:\d{2}$/.exec(text);
      if (!m) { if (el.classList) el.classList.remove('zz-onseg'); continue; }
      var on = false;
      if (rules) {
        var label = m[1], hit = null, hitLen = -1;
        for (var k in rules) {
          var kk = k.replace(/\s+/g, '');
          if (label.indexOf(kk) === 0 && kk.length > hitLen) { hit = k; hitLen = kk.length; }
        }
        on = hit != null && rules[hit] === inlineState.mi;
      }
      el.classList.toggle('zz-onseg', on);
    }
  }

  function ensureInline() {
    var r = findRouteCard();
    if (!r) {
      if (inlineBox && inlineBox.parentElement) inlineBox.parentElement.removeChild(inlineBox);
      return;
    }
    rewriteHint(r);
    markStops(r.card);
    var ok = inlineBox && inlineBox.isConnected &&
      inlineBox.parentElement === r.card &&
      inlineBox.previousElementSibling === r.head && inlineState.day === r.day;
    if (ok) return;
    if (inlineState.day !== r.day) inlineState = { day: r.day, mi: 0 };
    if (!inlineBox) {
      inlineBox = document.createElement('div');
      inlineBox.className = 'zz-inline';
      inlineBox.addEventListener('click', function (e) {
        e.stopPropagation();
        open(inlineState.day, inlineState.mi);
      });
    }
    renderInline(r.day);
    /* 同框内：地图在上（紧跟 ROUTE 头行），路线站点图在地图之下 */
    if (r.head && r.head.parentElement === r.card) {
      r.card.insertBefore(inlineBox, r.head.nextSibling);
    } else {
      r.card.insertBefore(inlineBox, r.card.firstChild);
    }
    if (!r.card.__zzMapBound) {
      r.card.addEventListener('click', onRouteClick, true);
      r.card.__zzMapBound = true;
    }
  }

  /* ---------------- 节点详情卡 · 厕所位置（B方案定稿：卡尾独立分区直展） ---------------- */
  function findSheet() {
    var divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var st = divs[i].getAttribute('style') || '';
      if (st.indexOf('10px 10px 0') >= 0 && st.indexOf('bottom') >= 0) return divs[i];
    }
    return null;
  }
  function sheetNode(sheet) {
    var dm = /D(\d+)\s*·/.exec(sheet.textContent || '');
    var title = '', inner = sheet.getElementsByTagName('div');
    for (var j = 0; j < inner.length; j++) {
      if (((inner[j].getAttribute('style') || '')).indexOf('17px') >= 0) {
        title = (inner[j].textContent || '').trim();
        break;
      }
    }
    return dm && title ? { day: +dm[1], title: title } : null;
  }

  function ensureWc() {
    var sheet = findSheet();
    if (!sheet) return;
    var nd = sheetNode(sheet);
    var old = sheet.querySelector('.zz-wcsec');
    if (!nd) { if (old) old.parentElement.removeChild(old); return; }
    var rules = (window.__ZZ_WC || {})[nd.day] || [], text = null;
    for (var r = 0; r < rules.length; r++) {
      var kws = rules[r][0], hit = false;
      for (var k = 0; k < kws.length; k++) if (nd.title.indexOf(kws[k]) >= 0) { hit = true; break; }
      if (hit) { text = rules[r][1]; break; }
    }
    var key = nd.day + '|' + nd.title;
    if (old && old.getAttribute('data-key') === key) return;
    if (old) old.parentElement.removeChild(old);
    if (text == null) return;
    var warn = text.indexOf('⚠️') >= 0;
    var sec = document.createElement('div');
    sec.className = 'zz-wcsec' + (warn ? ' warn' : '');
    sec.setAttribute('data-key', key);
    sec.innerHTML = '<div class="zz-wch">🚻 WC// 厕所位置</div>' +
      '<div class="zz-wcb">' + text.split('\n').map(esc).join('<br>') + '</div>';
    sheet.appendChild(sec); /* 卡尾：按钮与离线说明之后的独立分区，无归属歧义 */
  }

  /* ---------------- 票根模块（正式）：节点级上传 + 天级聚合 ----------------
     原图 Blob 存 IndexedDB（不压缩）；键=天+节点标题；离线持久。
     上传经 <input type="file"> 由壳层 onShowFileChooser 拉起相册/文件选择器 */
  var TKDB = {
    _db: null,
    open: function (cb) {
      if (TKDB._db) { cb(TKDB._db); return; }
      try {
        var rq = indexedDB.open('zouzhe_tickets_v1', 1);
        rq.onupgradeneeded = function () {
          var db = rq.result;
          if (!db.objectStoreNames.contains('stubs')) {
            db.createObjectStore('stubs', { keyPath: 'id', autoIncrement: true });
          }
        };
        rq.onsuccess = function () { TKDB._db = rq.result; cb(TKDB._db); };
        rq.onerror = function () { cb(null); };
      } catch (e) { cb(null); }
    },
    all: function (cb) {
      TKDB.open(function (db) {
        if (!db) { cb([]); return; }
        try {
          var out = [], cur = db.transaction('stubs').objectStore('stubs').openCursor();
          cur.onsuccess = function () {
            var c = cur.result;
            if (c) { out.push(c.value); c.continue(); } else cb(out);
          };
          cur.onerror = function () { cb([]); };
        } catch (e) { cb([]); }
      });
    },
    add: function (rec, cb) {
      TKDB.open(function (db) {
        if (!db) { cb(false); return; }
        try {
          var tx = db.transaction('stubs', 'readwrite');
          tx.objectStore('stubs').add(rec);
          tx.oncomplete = function () { cb(true); };
          tx.onerror = function () { cb(false); };
        } catch (e) { cb(false); }
      });
    },
    put: function (rec, cb) {
      TKDB.open(function (db) {
        if (!db) { cb(false); return; }
        try {
          var tx = db.transaction('stubs', 'readwrite');
          tx.objectStore('stubs').put(rec);
          tx.oncomplete = function () { cb(true); };
          tx.onerror = function () { cb(false); };
        } catch (e) { cb(false); }
      });
    },
    del: function (id, cb) {
      TKDB.open(function (db) {
        if (!db) { cb(false); return; }
        try {
          var tx = db.transaction('stubs', 'readwrite');
          tx.objectStore('stubs')['delete'](id);
          tx.oncomplete = function () { cb(true); };
          tx.onerror = function () { cb(false); };
        } catch (e) { cb(false); }
      });
    },
  };

  var tkList = [], tkUrls = {}, tkTUrls = {}, tkViewId = null;
  function tkFullUrl(rec) {
    if (!tkUrls[rec.id]) {
      try { tkUrls[rec.id] = URL.createObjectURL(rec.blob); } catch (e) { tkUrls[rec.id] = ''; }
    }
    return tkUrls[rec.id];
  }
  function tkThumbUrl(rec) {
    /* 网格只解码 320px 缩略图，避免原图解码阻塞主线程（卡顿/假死根因） */
    if (!tkTUrls[rec.id]) {
      try { tkTUrls[rec.id] = URL.createObjectURL(rec.thumb || rec.blob); } catch (e) { tkTUrls[rec.id] = ''; }
    }
    return tkTUrls[rec.id];
  }
  /* 生成缩略图：createImageBitmap 在 Chromium 中于工作线程解码+缩放，不阻塞 UI */
  function tkMakeThumb(blob, cb) {
    var done = false;
    function finish(b) { if (!done) { done = true; cb(b || null); } }
    try {
      if (window.createImageBitmap) {
        setTimeout(function () { finish(null); }, 10000);
        createImageBitmap(blob, { resizeWidth: 320, resizeQuality: 'medium' }).then(function (bmp) {
          try {
            var c = document.createElement('canvas');
            c.width = bmp.width; c.height = bmp.height;
            c.getContext('2d').drawImage(bmp, 0, 0);
            if (bmp.close) bmp.close();
            if (c.toBlob) c.toBlob(function (b) { finish(b); }, 'image/jpeg', 0.8);
            else finish(null);
          } catch (e) { finish(null); }
        })['catch'](function () { finish(null); });
        return;
      }
    } catch (e) {}
    finish(null);
  }
  var tkBackfilling = false;
  function tkBackfillThumbs() {
    /* 旧记录无缩略图：每轮只补一张，避免突发解码 */
    if (tkBackfilling) return;
    var rec = null;
    for (var i = 0; i < tkList.length; i++) if (!tkList[i].thumb) { rec = tkList[i]; break; }
    if (!rec) return;
    tkBackfilling = true;
    tkMakeThumb(rec.blob, function (tb) {
      if (!tb) { tkBackfilling = false; return; }
      rec.thumb = tb;
      TKDB.put(rec, function () {
        tkBackfilling = false;
        try { if (tkTUrls[rec.id]) { URL.revokeObjectURL(tkTUrls[rec.id]); delete tkTUrls[rec.id]; } } catch (e) {}
        tkRefresh();
      });
    });
  }
  function tkRefresh() {
    TKDB.all(function (list) {
      tkList = list;
      var s = document.querySelector('.zz-tksec');
      if (s) s.removeAttribute('data-key');
      var c = document.querySelector('.zz-tkcard');
      if (c) c.removeAttribute('data-key');
      ensureTickets();
      tkBackfillThumbs();
    });
  }

  function tkGridHtml(items, withCap) {
    var h = '<div class="zz-tkgrid">';
    items.forEach(function (it) {
      h += '<div class="zz-tkthumb" data-id="' + it.id + '"><img src="' + tkThumbUrl(it) + '" decoding="async" loading="lazy" alt="">' +
        (withCap ? '<span class="zz-tkcap">' + esc(it.node) + '</span>' : '') + '</div>';
    });
    h += '<div class="zz-tkadd"><span>＋</span>添加</div></div>';
    return h;
  }

  window.__ZZ_TK_REBUILDS = 0;
  var tkRb = { key: '', n: 0, t: 0 };
  function tkAllowRebuild(key) {
    var now = performance.now();
    if (key !== tkRb.key || now - tkRb.t > 5000) { tkRb.key = key; tkRb.n = 0; tkRb.t = now; }
    tkRb.n++;
    return tkRb.n <= 4; /* 同一 key 5 秒内最多重建 4 次，超出熔断等待下一周期 */
  }
  function ensureTickets() {
    /* 节点级：详情卡内「本节点票根」区（厕所位置之上） */
    var sheet = findSheet();
    if (sheet) {
      var nd = sheetNode(sheet);
      var oldSec = sheet.querySelector('.zz-tksec');
      if (!nd) {
        if (oldSec) oldSec.parentElement.removeChild(oldSec);
      } else {
        var mine = tkList.filter(function (r) { return r.day === nd.day && r.node === nd.title; });
        var key = nd.day + '|' + nd.title + '|' + mine.map(function (r) { return r.id; }).join(',');
        if (!oldSec || oldSec.getAttribute('data-key') !== key) {
          if (!tkAllowRebuild('n' + key)) return;
          window.__ZZ_TK_REBUILDS++;
          if (oldSec) oldSec.parentElement.removeChild(oldSec);
          var sec = document.createElement('div');
          sec.className = 'zz-tksec';
          sec.setAttribute('data-key', key);
          sec.setAttribute('data-day', nd.day);
          sec.setAttribute('data-node', nd.title);
          sec.innerHTML = '<div class="zz-wch">🎫 TICKET// 本节点票根 · ' + mine.length +
            ' 张</div>' + tkGridHtml(mine, false);
          var wcs = sheet.querySelector('.zz-wcsec');
          if (wcs) sheet.insertBefore(sec, wcs); else sheet.appendChild(sec);
        }
      }
    }
    /* 天级：行程页「本日票根」卡（住宿&饭店卡之后，聚合当天全部节点） */
    var rc = findRouteCard();
    var oldCard = document.querySelector('.zz-tkcard');
    if (!rc) { if (oldCard) oldCard.parentElement.removeChild(oldCard); return; }
    var mineD = tkList.filter(function (r) { return r.day === rc.day; });
    var keyD = rc.day + '|' + mineD.map(function (r) { return r.id; }).join(',');
    var anchor = null, divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var t = (divs[i].textContent || '').trim();
      if (t.indexOf('住宿 & 饭店') === 0 && t.length < 24) { anchor = divs[i]; break; }
    }
    if (!anchor) { if (oldCard) oldCard.parentElement.removeChild(oldCard); return; }
    var host = anchor;
    while (host && host !== document.body) {
      var st = host.getAttribute('style') || '';
      if (st.indexOf('rgba(0, 240, 255') >= 0 && st.indexOf('border') >= 0 && st.indexOf('margin') >= 0) break;
      host = host.parentElement;
    }
    if (!host || host === document.body) host = anchor.parentElement.parentElement;
    var ok = oldCard && oldCard.getAttribute('data-key') === keyD && oldCard.previousElementSibling === host;
    if (ok) return;
    if (!tkAllowRebuild('d' + keyD)) return;
    window.__ZZ_TK_REBUILDS++;
    if (oldCard) oldCard.parentElement.removeChild(oldCard);
    var dc = document.createElement('div');
    dc.className = 'zz-tkcard';
    dc.setAttribute('data-key', keyD);
    dc.setAttribute('data-day', rc.day);
    dc.innerHTML = '<b>🎫 TICKET// 本日票根<span>' + mineD.length +
      ' 张 · 长按删除</span></b>' + tkGridHtml(mineD, true);
    host.insertAdjacentElement('afterend', dc);
  }

  /* —— 上传：隐藏 file input（壳层 onShowFileChooser 拉起系统选择器），原图直存 —— */
  var tkPending = null, tkInput = null;
  function tkPick(day, node) {
    tkPending = { day: day, node: node };
    if (!tkInput) {
      tkInput = document.createElement('input');
      tkInput.type = 'file';
      tkInput.accept = 'image/*';
      tkInput.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
      tkInput.addEventListener('change', function () {
        var f = tkInput.files && tkInput.files[0];
        tkInput.value = '';
        if (!f || !tkPending) return;
        var pend = tkPending;
        zzToast('正在保存…');
        tkMakeThumb(f, function (tb) {
          TKDB.add({ day: pend.day, node: pend.node, blob: f, thumb: tb, name: f.name || '' },
            function (okAdd) {
              zzToast(okAdd ? '票根已保存（原图）' : '保存失败：存储空间不足或本机不支持离线图库');
              if (okAdd) tkRefresh();
            });
        });
      });
      document.body.appendChild(tkInput);
    }
    tkInput.click();
  }

  /* —— 天级添加：先选节点（取当天时间线全部节点标题） —— */
  function tkChooser(day) {
    tkOverlayClose('.zz-tkpick');
    var titles = [], divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if (el.closest && (el.closest('.zz-tkcard') || el.closest('.zz-inline') || el.closest('.zz-ov'))) continue;
      var st = el.getAttribute('style') || '';
      if (st.indexOf('500 14px') < 0) continue;
      var t = (el.textContent || '').trim();
      if (t && t.length <= 40 && titles.indexOf(t) < 0) titles.push(t);
    }
    var v = document.createElement('div');
    v.className = 'zz-tkpick';
    v.setAttribute('data-day', day);
    var h = '<div class="zz-tkview-scrim"></div><div class="zz-tkpick-card">' +
      '<b>选择票根所属节点</b><i>D' + day + ' · 保存后在该节点详情与本日票根中均可查看</i>' +
      '<div class="zz-tkpick-list">';
    titles.forEach(function (t) {
      h += '<button class="zz-tkpick-item" data-node="' + esc(t) + '">' + esc(t) + '</button>';
    });
    h += '</div><button class="zz-tkview-x zz-tkpick-x" style="width:100%">取消</button></div>';
    v.innerHTML = h;
    tkOverlayShow(v);
  }

  /* —— 删除：长按缩略图（600ms）→ 确认；全屏查看内删除按钮同确认 —— */
  function tkConfirm(id) {
    tkOverlayClose('.zz-tkcfm');
    var v = document.createElement('div');
    v.className = 'zz-tkcfm';
    v.innerHTML = '<div class="zz-tkview-scrim"></div><div class="zz-tkpick-card">' +
      '<b>删除这张票根？</b><i>删除后不可恢复</i>' +
      '<div class="zz-tkcfm-row">' +
      '<button class="zz-tkview-x zz-tkcfm-no">取消</button>' +
      '<button class="zz-tkview-del zz-tkcfm-yes" data-id="' + id + '">删除</button></div></div>';
    tkOverlayShow(v);
  }
  /* 浮层统一开合：入栈一条 history，Android 返回键可关闭（否则全屏浮层挡住
     整页、用户误以为「点不动」）；关闭时回收原图位图，避免渲染进程内存堆积 */
  var tkInPop = false, tkSelfBack = 0;
  window.__ZZ_NAV_CONSUMED = false;
  function tkOverlayShow(el) {
    el.__t0 = performance.now();
    document.body.appendChild(el);
    try { history.pushState({ zztk: 1 }, ''); el.__pushed = true; } catch (e) { el.__pushed = false; }
  }
  /* 长按弹出的确认框正好落在手指下方，抬手产生的 click 会打到它的蒙层上
     并立即关闭——开启后 400ms 内吞掉浮层上的点击，不执行任何动作 */
  function tkFresh(el) { return el && el.__t0 != null && performance.now() - el.__t0 < 400; }
  function tkOverlayHide(el) {
    if (!el || !el.parentElement) return;
    var pushed = el.__pushed;
    el.__pushed = false;
    if (el.classList && el.classList.contains('zz-tkview')) tkReleaseFull();
    el.parentElement.removeChild(el);
    if (pushed && !tkInPop) {
      tkSelfBack++;
      try { history.back(); } catch (e) { tkSelfBack--; }
    }
  }
  function tkOverlayClose(sel) { tkOverlayHide(document.querySelector(sel)); }
  function tkTopOverlay() {
    return document.querySelector('.zz-tkcfm') || document.querySelector('.zz-tkpick') ||
      document.querySelector('.zz-tkview');
  }
  function tkNavDone() { setTimeout(function () { window.__ZZ_NAV_CONSUMED = false; }, 0); }
  window.addEventListener('popstate', function () {
    /* 关闭浮层时我们自己调用的 history.back() 会回弹一次 popstate：
       吸收掉，否则会连带关闭它下面那层浮层 */
    if (tkSelfBack > 0) {
      tkSelfBack--;
      window.__ZZ_NAV_CONSUMED = true;
      tkNavDone();
      return;
    }
    var top = tkTopOverlay();
    if (!top) return;
    tkInPop = true;
    window.__ZZ_NAV_CONSUMED = true;   /* 让地图查看器的 popstate 处理跳过本次 */
    try { tkOverlayHide(top); } finally {
      tkInPop = false;
      tkNavDone();
    }
  });

  var lpT = null, lpFired = false;
  function lpStart(e) {
    var th = e.target && e.target.closest && e.target.closest('.zz-tkthumb');
    if (!th) return;
    lpFired = false;
    clearTimeout(lpT);
    lpT = setTimeout(function () { lpFired = true; tkConfirm(+th.getAttribute('data-id')); }, 600);
  }
  function lpCancel() { clearTimeout(lpT); }

  /* —— 全屏查看：原图 + 删除/关闭 + 下拉手势关闭 —— */
  function tkView(id) {
    var rec = null;
    for (var i = 0; i < tkList.length; i++) if (tkList[i].id === id) { rec = tkList[i]; break; }
    if (!rec) return;
    tkViewClose();
    tkViewId = id;
    var v = document.createElement('div');
    v.className = 'zz-tkview';
    v.innerHTML = '<div class="zz-tkview-scrim"></div><img src="' + tkFullUrl(rec) + '" decoding="async" alt="">' +
      '<div class="zz-tkview-cap">D' + rec.day + ' · ' + esc(rec.node) + '</div>' +
      '<div class="zz-tkview-hint">原图展示 · 下拉关闭 · 离线可用</div>' +
      '<div class="zz-tkview-row"><button class="zz-tkview-del">删除</button>' +
      '<button class="zz-tkview-x">关闭</button></div>';
    var y0 = null;
    v.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    v.addEventListener('touchmove', function (e) {
      if (y0 != null && e.touches[0].clientY - y0 > 90) { y0 = null; tkViewClose(); }
    }, { passive: true });
    tkOverlayShow(v);
  }
  /* 释放当前原图的 objectURL：手机原图解码后位图可达数十 MB，
     不及时回收会让 WebView 渲染进程内存持续攀升直至卡死 */
  function tkReleaseFull() {
    var id = tkViewId;
    tkViewId = null;
    if (id != null && tkUrls[id]) {
      try { URL.revokeObjectURL(tkUrls[id]); } catch (e) {}
      delete tkUrls[id];
    }
  }
  function tkViewClose() { tkOverlayClose('.zz-tkview'); }

  var toastT = null;
  function zzToast(msg) {
    var t = document.querySelector('.zz-toast');
    if (t) t.parentElement.removeChild(t);
    t = document.createElement('div');
    t.className = 'zz-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastT);
    toastT = setTimeout(function () { if (t.parentElement) t.parentElement.removeChild(t); }, 1700);
  }

  /* 隐藏头图上方的预出发日期提示条（旅行未开始 · 正在看 Dn 计划 · T-N DAYS），
     腾出首屏空间保证 ROUTE 卡整体可见 */
  function hideBanner() {
    var divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var t = (divs[i].textContent || '').trim();
      if (t.indexOf('旅行未开始') === 0 && t.length < 60) {
        if (divs[i].style.display !== 'none') divs[i].style.display = 'none';
        return;
      }
    }
  }

  /* App 自带的「节点可点 → 弹节点卡片」提示已不再成立，改写为切图提示 */
  function rewriteHint(r) {
    var divs = r.card.querySelectorAll('div');
    var multi = mapsOf(r.day).length > 1;
    for (var i = 0; i < divs.length; i++) {
      var t = (divs[i].textContent || '').trim();
      if (t.indexOf('节点可点') === 0 || t.indexOf('点击站点') === 0 || t.indexOf('每日地图') === 0) {
        var want = multi ? '点击站点 → 切换上方地图' : '每日地图见上方 · 点图可全屏';
        if (t !== want) divs[i].textContent = want;
        break;
      }
    }
  }

  /* ---------------- 挂载 ---------------- */
  /* 主题切换按钮固定在「走着」banner 顶栏最右（重渲染丢失由 sync 补挂） */
  function mountThemeBtn() {
    /* App 补丁式重渲染会克隆节点导致实例监听器丢失——点击走文档级委托
       （见 boot），这里只负责存在性与图标状态 */
    var ex = document.querySelector('.zz-tbtheme');
    if (ex) {
      if (ex.getAttribute('data-ic') !== getTheme()) {
        ex.innerHTML = getTheme() === 'light' ? ICON_MOON : ICON_SUN;
        ex.setAttribute('data-ic', getTheme());
      }
      return;
    }
    var mark = null, divs = document.getElementsByTagName('div');
    for (var i = 0; i < divs.length; i++) {
      var el = divs[i];
      if ((el.textContent || '').trim() === '走着' &&
          ((el.getAttribute('style') || '').indexOf('19px') >= 0)) { mark = el; break; }
    }
    if (!mark || !mark.parentElement) return;
    var bt = document.createElement('button');
    bt.className = 'zz-tbtheme';
    bt.setAttribute('aria-label', '深浅色切换');
    bt.setAttribute('data-ic', getTheme());
    bt.innerHTML = getTheme() === 'light' ? ICON_MOON : ICON_SUN;
    mark.parentElement.appendChild(bt);
  }

  function boot() {
    var st = document.createElement('style');
    st.id = 'zz-addon-style';
    st.textContent = CSS;
    document.head.appendChild(st);
    applyTheme(getTheme());
    /* 文档级捕获委托：App 克隆重建元素也不失效 */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('.zz-tbtheme')) {
        e.preventDefault(); e.stopPropagation();
        applyTheme(getTheme() === 'light' ? 'dark' : 'light');
        return;
      }
      var fresh = t.closest('.zz-tkcfm') || t.closest('.zz-tkpick') || t.closest('.zz-tkview');
      if (tkFresh(fresh)) { e.stopPropagation(); e.preventDefault(); return; }
      var th = t.closest('.zz-tkthumb');
      if (th) {
        e.stopPropagation();
        if (lpFired) { lpFired = false; return; } /* 长按已触发删除确认，抑制点击 */
        tkView(+th.getAttribute('data-id'));
        return;
      }
      var add = t.closest('.zz-tkadd');
      if (add) {
        e.stopPropagation();
        var sec = add.closest('.zz-tksec');
        if (sec) { tkPick(+sec.getAttribute('data-day'), sec.getAttribute('data-node')); return; }
        var card = add.closest('.zz-tkcard');
        if (card) tkChooser(+card.getAttribute('data-day'));
        return;
      }
      var pi = t.closest('.zz-tkpick-item');
      if (pi) {
        e.stopPropagation();
        var pk = pi.closest('.zz-tkpick');
        var day = pk ? +pk.getAttribute('data-day') : 0;
        var node = pi.getAttribute('data-node');
        tkOverlayClose('.zz-tkpick');
        if (day && node) tkPick(day, node);
        return;
      }
      if (t.closest('.zz-tkpick-x') || (t.closest('.zz-tkpick') && t.closest('.zz-tkview-scrim'))) {
        e.stopPropagation(); tkOverlayClose('.zz-tkpick'); return;
      }
      var yes = t.closest('.zz-tkcfm-yes');
      if (yes) {
        e.stopPropagation();
        var id = +yes.getAttribute('data-id');
        tkOverlayClose('.zz-tkcfm');
        TKDB.del(id, function (okDel) {
          zzToast(okDel ? '已删除' : '删除失败');
          if (okDel) {
            try { if (tkUrls[id]) URL.revokeObjectURL(tkUrls[id]); } catch (e2) {}
            try { if (tkTUrls[id]) URL.revokeObjectURL(tkTUrls[id]); } catch (e3) {}
            delete tkUrls[id]; delete tkTUrls[id];
            if (tkViewId === id) tkViewClose();
            tkRefresh();
          }
        });
        return;
      }
      if (t.closest('.zz-tkcfm-no') || (t.closest('.zz-tkcfm') && t.closest('.zz-tkview-scrim'))) {
        e.stopPropagation(); tkOverlayClose('.zz-tkcfm'); return;
      }
      if (t.closest('.zz-tkview-del')) { e.stopPropagation(); if (tkViewId != null) tkConfirm(tkViewId); return; }
      if (t.closest('.zz-tkview-x') || t.closest('.zz-tkview-scrim')) { e.stopPropagation(); tkViewClose(); return; }
    }, true);
    /* 长按缩略图（600ms）→ 删除确认 */
    document.addEventListener('touchstart', lpStart, { passive: true, capture: true });
    document.addEventListener('touchmove', lpCancel, { passive: true, capture: true });
    document.addEventListener('touchend', lpCancel, { passive: true, capture: true });
    document.addEventListener('mousedown', lpStart, true);
    document.addEventListener('mouseup', lpCancel, true);
    tkRefresh();
    /* App 解包/重渲染后自动补挂：MutationObserver 快速响应 + 周期兜底 */
    var moT = null, moBusy = false;
    function sync() {
      if (moBusy) return;
      moBusy = true;
      try {
        if (!document.getElementById('zz-addon-style')) document.head.appendChild(st);
        if (tagAppHolder()) {
          mountThemeBtn();
          hideBanner();
          ensureInline();
          ensureWc();
          ensureTickets();
          if (ov && !document.body.contains(ov)) document.body.appendChild(ov);
        }
      } finally { moBusy = false; }
    }
    try {
      new MutationObserver(function () {
        clearTimeout(moT); moT = setTimeout(sync, 200);
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    setInterval(sync, 1500);
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
