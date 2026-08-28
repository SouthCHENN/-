/* ============================================================
 * 照着走 · 行程文本解析器
 * 输入：小红书笔记文案（或任意粘贴的行程文本）
 * 输出：按天分组的有序地点列表
 *
 * 设计前提：解析器只负责「拿到 80%」，剩下 20% 由 UI 让用户增删改排序。
 * 宁可多召回（标低 conf 让用户删），也不要漏掉真地点。
 * 纯函数、无依赖，node 与浏览器共用。
 * ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZZParse = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SEP = '\u0001';   // 链接符哨兵：必须在剥 emoji 前占位，否则箭头会被当表情吃掉
  var RE_CJK = /[\u4e00-\u9fa5]/;

  /* 表情 / 变体选择符 / 零宽。注意：箭头（U+2190-21FF、U+27A1、U+2B00 段）
     与这些区间重叠，故 preprocess 先把链接符换成哨兵再走这里。 */
  var RE_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200B}-\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2900}-\u{297F}\u{3030}\u{303D}\u{3297}\u{3299}\u{00A9}\u{00AE}]/gu;

  function squeeze(s) { return s.replace(/[\s\u3000]+/g, ' ').trim(); }
  /* emoji 替换成空格而非删除：『深圳湾公园🌊骑行超舒服』里的 emoji 是
     「名称|点评」的分界信号，直接删会把两段粘成一个词。 */
  function clean(s) { return squeeze(String(s == null ? '' : s).replace(RE_EMOJI, ' ')); }

  var CIRCLED = '\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468\u2469\u246A\u246B\u246C\u246D\u246E\u246F\u2470\u2471\u2472\u2473';
  /* 归一化：全角数字→半角、圈号/keycap→「N.」、链接符→哨兵，最后剥表情。顺序不可调换。 */
  function preprocess(s) {
    return squeeze(String(s == null ? '' : s)
      .replace(/[\uFF10-\uFF19]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\u2460-\u2473]/g, function (c) { return String(CIRCLED.indexOf(c) + 1) + '.'; })
      .replace(/(\d)\uFE0F?\u20E3/g, '$1.')
      .replace(/\s*(?:\u2192|\u27A1|\u21D2|\u27F6|=>|->|\u2014{1,3}|\u300B|>{1,2}|\uFF1E|\u3001)\s*/g, SEP)
      .replace(RE_EMOJI, ' '));
  }

  var CN_NUM = { '\u96f6': 0, '\u4e00': 1, '\u4e8c': 2, '\u4e24': 2, '\u4e09': 3, '\u56db': 4, '\u4e94': 5, '\u516d': 6, '\u4e03': 7, '\u516b': 8, '\u4e5d': 9, '\u5341': 10 };
  function cnToInt(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (s.length === 1) return CN_NUM[s];
    var m = /^(.)?\u5341(.)?$/.exec(s);           // 十一 / 二十 / 二十三
    if (!m) return null;
    var tens = m[1] ? CN_NUM[m[1]] : 1, ones = m[2] ? CN_NUM[m[2]] : 0;
    return (tens == null || ones == null) ? null : tens * 10 + ones;
  }

  /* ---------- 行分类 ---------- */

  var RE_DAY = [
    /^(?:day|d)\s*[-#]?\s*(\d{1,2})(?:\s*[-~\u81f3\u5230]\s*\d{1,2})?/i,
    /^\u7b2c\s*([\u96f6\u4e00\u4e8c\u4e24\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\d]{1,3})\s*\u5929/,
    /^(\d{1,2})\s*\u5929\s*[:\uff1a]/,
  ];

  function matchDay(line) {
    var whole = preprocess(line).replace(/^[#*\-\u00b7\u2022\s]+/, '');
    var head = whole.split(SEP)[0];
    for (var i = 0; i < RE_DAY.length; i++) {
      var m = RE_DAY[i].exec(head);
      if (!m) continue;
      var n = cnToInt(m[1]);
      if (n == null || n < 1 || n > 60) continue;
      var rest = whole.slice(m[0].length).replace(new RegExp('^[\\s:\\uff1a,\\uff0c.\\u3002' + SEP + ']+'), '');
      return { day: n, label: 'Day' + n, rest: rest };
    }
    return null;
  }

  /* 整行级噪声：标题、话术、说明段落。命中即整行丢弃。 */
  var LINE_NOISE = [
    /^(?:tips?|note|ps|p\.s\.?)\b/i,
    /^(?:\u6ce8\u610f|\u63d0\u9192|\u5efa\u8bae|\u53cb\u60c5\u63d0\u793a|\u6e29\u99a8\u63d0\u793a|\u907f\u96f7|\u8e29\u96f7|\u5212\u91cd\u70b9)\s*[:\uff1a]?/,
    /^(?:\u4f4f\u5bbf|\u4ea4\u901a|\u7f8e\u98df|\u82b1\u8d39|\u82b1\u9500|\u8d39\u7528|\u9884\u7b97|\u95e8\u7968|\u7968\u4ef7|\u884c\u524d|\u51c6\u5907|\u7a7f\u642d|\u62cd\u7167|\u673a\u4f4d|\u4eba\u5747)\s*[:\uff1a]/,
    /(?:\u653b\u7565|\u4fdd\u59c6\u7ea7|\u7801\u4f4f|\u6536\u85cf|\u5173\u6ce8\u6211|\u70b9\u8d5e|\u8bc4\u8bba\u533a|\u59d0\u59b9\u4eec|\u5b9d\u5b50\u4eec|\u96c6\u7f8e\u4eec|\u5bb6\u4eba\u4eec|\u5165\u80a1\u4e0d\u4e8f|\u7edd\u7edd\u5b50|\u8c01\u61c2\u554a|\u771f\u7684\u4f1a\u8c22|\u4e0d\u770b\u540e\u6094)/,
    /(?:\u8def\u7ebf|\u653b\u7565|\u6e38\u8bb0|\u6e05\u5355|\u5b89\u6392|\u5408\u96c6|\u6307\u5357|\u7b14\u8bb0)\s*$/,
    /\d\s*\u5929\s*\d\s*\u591c/,
    /^#/,
    /^[^\u4e00-\u9fa5a-zA-Z]*$/,
  ];
  function isLineNoise(t) {
    for (var i = 0; i < LINE_NOISE.length; i++) if (LINE_NOISE[i].test(t)) return true;
    return false;
  }

  /* 名字级拒收：清洗后剩下的东西根本不是地点 */
  var NAME_REJECT = [
    /^(?:\u4eba\u5747|\u95e8\u7968|\u82b1\u8d39|\u9884\u7b97|\u8d39\u7528|\u8f66\u7a0b|\u5730\u5740|\u7535\u8bdd|\u8425\u4e1a|\u5f00\u653e|\u5efa\u8bae|\u6ce8\u610f|\u63d0\u793a|\u4ea4\u901a|\u4f4f\u5bbf|\u7f8e\u98df|\u65f6\u95f4|\u5168\u7a0b|\u5927\u7ea6|\u5927\u6982)/,
    /^\d+(?:\.\d+)?(?:\u5143|\u5757|km|\u516c\u91cc|\u7c73|\u5206\u949f|\u5c0f\u65f6|\u4eba)?$/i,
    /^(?:\u5de6\u53f3|\u8d77\u6b65|\u51fa\u53d1|\u7ed3\u675f|\u8fd4\u7a0b|\u56de\u7a0b|\u81ea\u7531\u6d3b\u52a8|\u968f\u610f|\u5f85\u5b9a)$/,
  ];
  function isNameReject(n) {
    if (!n || n.length < 2) return true;
    if (!RE_CJK.test(n) && !/[a-zA-Z]{3}/.test(n)) return true;
    for (var i = 0; i < NAME_REJECT.length; i++) if (NAME_REJECT[i].test(n)) return true;
    return false;
  }

  /* ---------- 地点名清洗 ---------- */

  var T = '(?:\\d{1,2}\\s*[:\\uff1a]\\s*\\d{2}|\\d{1,2}\\s*\\u70b9(?:\\u534a|\\s*\\d{1,2}\\s*\\u5206)?)';
  var PERIOD = '(?:\\u4e0a\\u5348|\\u4e0b\\u5348|\\u4e2d\\u5348|\\u65e9\\u4e0a|\\u65e9\\u6668|\\u6e05\\u6668|\\u508d\\u665a|\\u665a\\u4e0a|\\u591c\\u91cc|\\u5348\\u540e)';
  var RE_LEAD_TIME = new RegExp('^(?:' + PERIOD + '\\s*)?' + T + '(?:\\s*[-~\\u2014\\u2013\\u81f3\\u5230]\\s*' + T + ')?[\\s,\\uff0c:\\uff1a.\\u3002]*');
  var RE_LEAD_PERIOD = new RegExp('^' + PERIOD + '\\s*[:\\uff1a,\\uff0c]?\\s*');
  /* 序号 / 项目符号。冒号不入此集，否则会把「09:00」啃成「00」 */
  var RE_LEAD_BULLET = /^(?:\d{1,2}\s*[.\u3001)\uff09]|[-\u2013\u00b7\u2022*\u25aa\u2023\u25cf\u25cb\u25e6\u25b6\u25ba\u25b8]|>+)\s*/;

  var RE_ADV = /^(?:\u5148|\u518d|\u7136\u540e|\u63a5\u7740|\u4e4b\u540e|\u6700\u540e|\u987a\u4fbf|\u63a5\u4e0b\u6765|\u7d27\u63a5\u7740)\s*/;
  /* 多字动词：无条件剥。单字动词：必须带 了/过/的/一下，否则「游乐园」「玩具城」会被啃掉 */
  var RE_VERB_MULTI = /^(?:\u524d\u5f80|\u62b5\u8fbe|\u51fa\u53d1\u53bb|\u76f4\u5954|\u6253\u5361|\u6e38\u89c8|\u53c2\u89c2|\u8def\u8fc7|\u9014\u7ecf|\u8fd4\u56de|\u5165\u4f4f|\u901b\u901b|\u54c1\u5c1d)\s*(?:\u4e86|\u8fc7|\u7684|\u4e00\u4e0b)?\s*/;
  var RE_VERB_SOLO = /^(?:\u53bb|\u5230|\u901b|\u6e38|\u73a9|\u5403|\u56de|\u4f4f|\u770b)\s*(?:\u4e86|\u8fc7|\u7684|\u4e00\u4e0b)\s*/;

  var HYPE_ADV = '(?:\\u8d85|\\u5de8|\\u8d3c|\\u7279|\\u7279\\u522b|\\u975e\\u5e38|\\u6781|\\u597d|\\u5f88|\\u771f\\u7684\\u5f88|\\u7edd|\\u65e0\\u654c)?';
  var HYPE_ADJ = '(?:\\u597d\\u62cd|\\u597d\\u770b|\\u597d\\u5403|\\u597d\\u73a9|\\u51fa\\u7247|\\u7edd\\u7f8e|\\u7edd\\u4e86|\\u7f8e|\\u9999|\\u6cbb\\u6108|\\u677e\\u5f1b|\\u5b89\\u9759|\\u5c0f\\u4f17|\\u51b7\\u95e8|\\u4eba\\u5c11|\\u5fc5\\u53bb|\\u5fc5\\u6253\\u5361|\\u5fc5\\u5403|\\u4e0d\\u8e29\\u96f7|\\u5b9d\\u85cf|\\u9690\\u85cf|\\u795e\\u4ed9|\\u9876\\u7ea7|\\u5929\\u82b1\\u677f|\\u7f51\\u7ea2|\\u65b0\\u664b|\\u8d85\\u706b|\\u7206\\u706b|\\u4eba\\u6c14|\\u738b\\u70b8)';
  var RE_HYPE = new RegExp('^(?:' + HYPE_ADV + '\\s*' + HYPE_ADJ + '\\s*(?:\\u7684|\\u6b3e|\\u7ea7)?\\s*)+');

  var RE_TAIL_HYPE = /(?:\u771f\u7684|\u771f|\u8d85|\u5de8|\u8d3c|\u7b80\u76f4)?\s*(?:\u7edd\u4e86|\u7edd\u7edd\u5b50|\u7edd|\u7f8e\u7ffb|\u597d\u770b|\u597d\u73a9|\u597d\u5403|\u8d85\u9999|\u6cbb\u6108|\u51fa\u7247|\u65e0\u654c|yyds)$/i;
  var RE_TAIL_ACT = /(?:\u6253\u5361|\u901b\u8857|\u62cd\u7167|\u62cd\u7247|\u51fa\u7247|\u6563\u6b65|\u9061\u5f2f|\u770b\u65e5\u843d|\u770b\u65e5\u51fa|\u770b\u591c\u666f|\u770b\u661f\u661f|\u559d[\u4e00-\u9fa5]{1,3}\u8336|\u559d\u5496\u5561|\u5403\u996d|\u5403\u65e9\u8336)$/;
  var RE_TAIL_GENERIC = /(?:\u4e00\u65e5\u6e38|\u534a\u65e5\u6e38|\u4e24\u65e5\u6e38|\u4e09\u65e5\u6e38|\u4e4b\u65c5|\u6e38\u73a9|\u884c\u7a0b|\u8def\u7ebf)$/;

  var RE_TAIL_SPLIT = /[,\uff0c\u3002;\uff1b!\uff01?\uff1f~\uff5e|\uff5c]/;
  var RE_PAREN = /[\uff08(\u3010\[]([^\uff09)\u3011\]]{0,40})[\uff09)\u3011\]]/g;

  /** 一段文本 → { name, note, hyped }。输入应已 preprocess 过且不含哨兵。 */
  function cleanName(seg) {
    var t = clean(seg), notes = [], i, before;

    t = squeeze(t.replace(RE_PAREN, function (_, inner) {
      var v = clean(inner); if (v) notes.push(v); return ' ';
    }));

    // 行首噪声分层剥离：时刻可能出现在序号之后，循环到不动点
    for (i = 0; i < 5; i++) {
      before = t;
      t = squeeze(t.replace(RE_LEAD_BULLET, '').replace(RE_LEAD_TIME, '')
                   .replace(RE_LEAD_PERIOD, '').replace(RE_ADV, ''));
      if (t === before) break;
    }
    for (i = 0; i < 3; i++) {
      before = t;
      t = squeeze(t.replace(RE_VERB_MULTI, '').replace(RE_VERB_SOLO, ''));
      if (t === before) break;
    }

    var parts = t.split(RE_TAIL_SPLIT).map(clean).filter(Boolean);
    if (parts.length) { t = parts[0]; notes = notes.concat(parts.slice(1)); }

    // 中文地名不含空格：首个空格之后是说明（「深圳湾公园 骑行超舒服」）
    var sp = t.indexOf(' ');
    if (sp > 0 && RE_CJK.test(t.slice(0, sp))) { notes.push(clean(t.slice(sp + 1))); t = t.slice(0, sp); }

    var hyped = false;
    var afterHype = squeeze(t.replace(RE_HYPE, ''));
    if (afterHype !== t && afterHype.length >= 2) { hyped = true; t = afterHype; }
    t = squeeze(t.replace(RE_VERB_MULTI, '').replace(RE_VERB_SOLO, ''));

    // 尾部：吹捧 → 动作 → 泛化词；各自只在剩余 >=2 字时才剥
    [RE_TAIL_HYPE, RE_TAIL_ACT, RE_TAIL_GENERIC, RE_TAIL_GENERIC].forEach(function (re) {
      var v = squeeze(t.replace(re, ''));
      if (v !== t && v.length >= 2) t = v;
    });

    t = squeeze(t.replace(/^[\s\-\u2013\u00b7\u2022,\uff0c:\uff1a]+/, '')
                 .replace(/[\s\-\u2013\u00b7\u2022,\uff0c:\uff1a]+$/, ''));
    return { name: t, note: notes.filter(Boolean).join(' \u00b7 '), hyped: hyped };
  }

  /* ---------- 置信度 ---------- */

  var RE_POI_TAIL = /(?:\u516c\u56ed|\u5e7f\u573a|\u535a\u7269\u9986|\u7f8e\u672f\u9986|\u5c55\u89c8\u9986|\u7eaa\u5ff5\u9986|\u5bfa|\u5e99|\u89c2|\u5854|\u697c|\u9601|\u5bab|\u56ed|\u6e56|\u5c71|\u5cf0|\u5c9b|\u6ee9|\u6d77\u6ee9|\u6e7e|\u53e4\u57ce|\u53e4\u9547|\u8001\u8857|\u5927\u9053|\u7801\u5934|\u8f66\u7ad9|\u673a\u573a|\u5927\u6865|\u4e66\u5e97|\u5496\u5561|\u5496\u5561\u9986|\u9910\u5385|\u996d\u5e97|\u9152\u697c|\u98df\u5802|\u5e02\u573a|\u591c\u5e02|\u5546\u573a|\u4e2d\u5fc3|\u5927\u53a6|\u57fa\u5730|\u666f\u533a|\u98ce\u666f\u533a|\u6b65\u884c\u8857|\u8425\u5730|\u6e29\u6cc9|\u7011\u5e03|\u5ce1\u8c37|\u8349\u539f|\u6559\u5802|\u5927\u5b66|\u5b66\u9662|\u6751|\u9547|\u8def|\u8857|\u5df7|\u91cc|\u82d1|\u9986|\u57ce)$/;

  function score(name, ctx) {
    if (!name) return 0;
    var s = 0.5, len = name.length;
    if (len >= 2 && len <= 12) s += 0.15;
    if (len > 15) s -= 0.3;
    if (RE_POI_TAIL.test(name)) s += 0.25;
    if (!RE_CJK.test(name)) s -= 0.15;
    // 结构性信号（列点/时刻/箭头）合并计一次，避免叠加到满分
    var struct = 0;
    if (ctx.numbered) struct = Math.max(struct, 0.2);
    if (ctx.timed) struct = Math.max(struct, 0.2);
    if (ctx.chained) struct = Math.max(struct, 0.15);
    s += struct;
    if (ctx.hyped) s += 0.05;
    return Math.max(0, Math.min(1, s));
  }

  /* ---------- 主流程 ---------- */

  function parse(text) {
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var days = [], cur = null, cityLines = [];

    function ensureDay() {
      if (!cur) { cur = { label: '\u884c\u7a0b', stops: [] }; days.push(cur); }
      return cur;
    }

    function handle(t, raw) {
      if (!t) return;
      var numbered = RE_LEAD_BULLET.test(t);
      var timed = RE_LEAD_TIME.test(t) || RE_LEAD_PERIOD.test(t);
      var segs = t.split(SEP).map(squeeze).filter(Boolean);
      var chained = segs.length > 1;
      // 串联行每段都得够短，否则多半是句子里恰好有破折号/顿号
      if (chained && segs.some(function (x) { return x.length > 20; })) {
        segs = [t.split(SEP).join(' ')]; chained = false;
      }
      for (var i = 0; i < segs.length; i++) {
        var c = cleanName(segs[i]);
        if (isNameReject(c.name)) continue;
        var conf = score(c.name, { numbered: numbered, timed: timed, chained: chained, hyped: c.hyped });
        if (conf <= 0) continue;
        ensureDay().stops.push({
          raw: squeeze(String(raw)), name: c.name, note: c.note,
          conf: Math.round(conf * 100) / 100,
        });
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], t = preprocess(raw);
      if (!t) continue;
      var d = matchDay(raw);
      if (d) {
        cur = { label: d.label, stops: [] };
        days.push(cur);
        if (d.rest && !isLineNoise(d.rest.split(SEP).join(' '))) { cityLines.push(d.rest); handle(d.rest, raw); }
        continue;
      }
      if (isLineNoise(t.split(SEP).join(' '))) continue;
      handle(t, raw);
    }

    days = days.filter(function (x) { return x.stops.length; });
    var flat = [];
    days.forEach(function (d) {
      d.stops.forEach(function (s) { flat.push({ day: d.label, name: s.name, note: s.note, conf: s.conf, raw: s.raw }); });
    });
    return { days: days, stops: flat, hints: { cityLines: cityLines } };
  }

  return { parse: parse, cleanName: cleanName, matchDay: matchDay, preprocess: preprocess };
});
