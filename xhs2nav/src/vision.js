/* ============================================================
 * 路书 · 截图识别层（可配置多模态模型）
 *
 * 两种协议方言：
 *   openai    —— 千问(百炼 compatible-mode)、豆包(火山方舟)、以及任何 OpenAI 兼容端点
 *   anthropic —— Claude Messages API
 *
 * ⚠️ 下列 endpoint / 模型名来自公开检索，本机无法访问 help.aliyun.com 与
 *    www.volcengine.com 一手核对（出口代理封禁），故全部做成 UI 可编辑。
 *    豆包尤其注意：model 字段填的常是控制台的接入点 ID（ep-xxxxx）而非模型名。
 * ============================================================ */
(function (root, factory) {
  var api = factory(
    typeof require === 'function' ? require('./net.js') : root.ZZNet
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZZVision = api;
})(typeof self !== 'undefined' ? self : this, function (Net) {
  'use strict';

  var PRESETS = {
    qwen: {
      label: '通义千问 VL（阿里百炼）',
      dialect: 'openai',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-vl-max',
      note: '控制台在 bailian.console.aliyun.com 拿 API-KEY。模型名可换 qwen-vl-plus / qwen3-vl-plus。',
      verified: false,
    },
    doubao: {
      label: '豆包 视觉（火山方舟）',
      dialect: 'openai',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      model: '',
      note: 'model 多半要填方舟控制台的「接入点 ID」（ep- 开头），不是模型名。留空会报错，请先去控制台创建接入点。',
      verified: false,
    },
    claude: {
      label: 'Claude（Anthropic）',
      dialect: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-opus-5',
      note: '请求体格式已按官方 vision 文档核对。国内网络通常需要代理。',
      verified: true,
    },
    custom: {
      label: '自定义（OpenAI 兼容）',
      dialect: 'openai',
      endpoint: '',
      model: '',
      note: '任何 OpenAI 兼容的多模态端点都可以填这里。',
      verified: false,
    },
  };

  var SYSTEM = [
    '你是行程信息抽取器。用户给你的是小红书旅游笔记的截图。',
    '你的唯一任务：把图里出现的【实际要去的地点】按行程顺序抽出来。',
    '',
    '规则：',
    '1. 只要地点，不要交通方式、门票价格、人均消费、营业时间、攻略话术、话题标签。',
    '2. 去掉修饰语，保留可被地图搜到的规范名称。',
    '   「超好拍的深圳湾公园」→「深圳湾公园」；「网红喜茶(万象城店)」→「喜茶 万象城店」。',
    '3. 保持原文顺序。如果图里分了 Day1/Day2 或第一天/第二天，按天分组；没分天就放一组。',
    '4. 能判断出城市就填 city（用于地图消歧），判断不出留空字符串。',
    '5. 拿不准是不是地点的，仍然收进来，但把 confidence 标低。宁可多给，用户会删。',
    '6. 截图里如果混进了评论区，评论里的地点是别人补充的推荐，不属于原行程序列，不要收。',
    '7. 不要编造图里没有的地点。不要输出经纬度——你猜的坐标一定是错的。',
    '',
    '只输出 JSON，不要任何解释文字、不要 markdown 代码围栏：',
    '{"city":"深圳","days":[{"label":"Day1","stops":[{"name":"深圳湾公园","note":"看日落","confidence":0.9}]}]}',
  ].join('\n');

  var USER_TEXT = '请抽取这些截图里的行程地点，按上述规则输出 JSON。';

  /** 从模型返回里挖出 JSON：容忍 ```json 围栏、前后废话。 */
  function looseJson(text) {
    if (!text) throw Net.ZZError('parse', '模型没有返回内容');
    var t = String(text).trim();
    var fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
    if (fence) t = fence[1].trim();
    try { return JSON.parse(t); } catch (e) { /* 继续 */ }
    var s = t.indexOf('{'), e2 = t.lastIndexOf('}');
    if (s >= 0 && e2 > s) {
      try { return JSON.parse(t.slice(s, e2 + 1)); } catch (e) { /* 继续 */ }
    }
    throw Net.ZZError('parse', '模型返回的不是 JSON', t.slice(0, 600));
  }

  function buildOpenAI(images, cfg) {
    var content = images.map(function (im) {
      return { type: 'image_url', image_url: { url: 'data:' + im.mediaType + ';base64,' + im.base64 } };
    });
    content.push({ type: 'text', text: USER_TEXT });
    return {
      url: cfg.endpoint,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: content },
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
      pick: function (j) {
        var c = j && j.choices && j.choices[0];
        var m = c && c.message;
        if (!m) throw Net.ZZError('parse', '返回结构不符合 OpenAI 兼容格式', JSON.stringify(j).slice(0, 600));
        // 部分实现把内容拆成数组块
        if (typeof m.content === 'string') return m.content;
        if (Array.isArray(m.content)) {
          return m.content.map(function (b) { return b && (b.text || b.content) || ''; }).join('');
        }
        throw Net.ZZError('parse', '无法从返回中取出文本', JSON.stringify(m).slice(0, 600));
      },
    };
  }

  /* Claude Messages API：图片块在文字块之前（官方 vision 文档建议 image-then-text）。 */
  function buildAnthropic(images, cfg) {
    var content = images.map(function (im) {
      return { type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.base64 } };
    });
    content.push({ type: 'text', text: USER_TEXT });
    return {
      url: cfg.endpoint,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        // 浏览器直连必需，否则 SDK/网关会拒绝来自页面的请求
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: 'user', content: content }],
      }),
      pick: function (j) {
        if (j && j.stop_reason === 'refusal') throw Net.ZZError('parse', '模型拒绝了这次请求');
        var blocks = (j && j.content) || [];
        var txt = blocks.filter(function (b) { return b.type === 'text'; })
                        .map(function (b) { return b.text; }).join('');
        if (!txt) throw Net.ZZError('parse', '返回里没有文本块', JSON.stringify(j).slice(0, 600));
        return txt;
      },
    };
  }

  /**
   * @param {Array}  images  [{base64, mediaType}]，来自 ZZNet.downscale
   * @param {Object} cfg     { dialect, endpoint, model, apiKey, proxy }
   * @returns {Promise<{city:string, days:[{label,stops:[{name,note,conf}]}]}>}
   */
  async function extract(images, cfg) {
    if (!images || !images.length) throw Net.ZZError('config', '没有选择图片');
    if (!cfg.endpoint) throw Net.ZZError('config', '没有填 endpoint');
    if (!cfg.apiKey) throw Net.ZZError('config', '没有填 API Key');
    if (!cfg.model) throw Net.ZZError('config', '没有填模型名/接入点 ID');

    var req = cfg.dialect === 'anthropic' ? buildAnthropic(images, cfg) : buildOpenAI(images, cfg);
    var json = await Net.request(req.url, {
      method: 'POST', headers: req.headers, body: req.body,
      proxy: cfg.proxy, timeoutMs: 120000,
    });
    var parsed = looseJson(req.pick(json));

    var days = (parsed.days || []).map(function (d, i) {
      return {
        label: String(d.label || ('Day' + (i + 1))),
        stops: (d.stops || []).map(function (s) {
          return {
            name: String(s.name || '').trim(),
            note: String(s.note || '').trim(),
            conf: typeof s.confidence === 'number' ? Math.max(0, Math.min(1, s.confidence)) : 0.8,
          };
        }).filter(function (s) { return s.name; }),
      };
    }).filter(function (d) { return d.stops.length; });

    return { city: String(parsed.city || '').trim(), days: days };
  }

  /** 最小验证调用：只发一句话验 key/endpoint/模型三件事，花费可忽略。
   *  返回模型回的文本；失败时抛 ZZError（CORS/401/模型名错等原样透出）。 */
  async function ping(cfg) {
    if (!cfg.endpoint) throw Net.ZZError('config', '没有填 endpoint');
    if (!cfg.apiKey) throw Net.ZZError('config', '没有填 API Key');
    if (!cfg.model) throw Net.ZZError('config', '没有填模型名/接入点 ID');
    var req;
    if (cfg.dialect === 'anthropic') {
      req = {
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: cfg.model, max_tokens: 8,
          messages: [{ role: 'user', content: '回复OK两个字' }] }),
        pick: function (j) {
          return ((j.content || []).filter(function (b) { return b.type === 'text'; })[0] || {}).text || '(空)';
        },
      };
    } else {
      req = {
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({ model: cfg.model, max_tokens: 8,
          messages: [{ role: 'user', content: '回复OK两个字' }] }),
        pick: function (j) {
          var m = j.choices && j.choices[0] && j.choices[0].message;
          if (!m) throw Net.ZZError('parse', '返回结构不符合 OpenAI 兼容格式', JSON.stringify(j).slice(0, 300));
          return typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        },
      };
    }
    var j = await Net.request(cfg.endpoint, {
      method: 'POST', headers: req.headers, body: req.body, proxy: cfg.proxy, timeoutMs: 30000,
    });
    return String(req.pick(j)).slice(0, 40);
  }

  return { extract: extract, ping: ping, PRESETS: PRESETS, _looseJson: looseJson, SYSTEM: SYSTEM };
});
