/* ============================================================
 * 路书 · 最小转发代理（Cloudflare Workers）
 *
 * 用途：浏览器直连大模型 / 地图的服务端 API 通常被 CORS 拦（它们不发
 * Access-Control-Allow-Origin）。把这个 Worker 部署好，在页面「设置 → 代理」
 * 里填它的地址，所有外部请求就会经它转发并补上 CORS 头。
 *
 * 部署：
 *   1. dash.cloudflare.com → Workers → Create → 粘贴本文件 → Deploy
 *   2. 把分配到的 https://xxx.workers.dev 填进页面的代理地址
 *
 * ⚠️ 安全：默认只放行下面 ALLOW 里的域名，避免被人拿去当开放代理。
 *    你的 API Key 会经过这个 Worker（在请求头里转发，不落盘、不打日志），
 *    但它毕竟是公网地址——建议加上 ALLOW_ORIGIN 限制来源，或改用 Workers 的
 *    环境变量把 Key 放在服务端、页面完全不碰 Key。
 * ============================================================ */

const ALLOW = [
  'dashscope.aliyuncs.com',        // 通义千问 / 阿里百炼
  'ark.cn-beijing.volces.com',     // 豆包 / 火山方舟
  'api.anthropic.com',             // Claude
  'api.map.baidu.com',             // 百度地图 Web 服务
  'restapi.amap.com',              // 高德 Web 服务
];

// 收紧来源：换成你自己放页面的地址，例如 'https://yourname.github.io'。'*' 表示不限制。
const ALLOW_ORIGIN = '*';

function cors(extra) {
  return Object.assign({
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  }, extra || {});
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });

    const target = new URL(request.url).searchParams.get('url');
    if (!target) {
      return new Response('缺少 ?url= 参数', { status: 400, headers: cors() });
    }

    let u;
    try { u = new URL(target); }
    catch { return new Response('url 不是合法地址', { status: 400, headers: cors() }); }

    if (u.protocol !== 'https:') {
      return new Response('只转发 https', { status: 400, headers: cors() });
    }
    // 精确匹配或子域匹配，避免 evil-dashscope.aliyuncs.com.attacker.com 这类绕过
    const ok = ALLOW.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
    if (!ok) {
      return new Response('目标域名不在白名单内: ' + u.hostname, { status: 403, headers: cors() });
    }

    // 透传除 Host/Origin/Referer 外的请求头（Authorization、x-api-key 等要保留）
    const headers = new Headers();
    for (const [k, v] of request.headers) {
      const lk = k.toLowerCase();
      if (lk === 'host' || lk === 'origin' || lk === 'referer' ||
          lk.startsWith('cf-') || lk.startsWith('sec-')) continue;
      headers.set(k, v);
    }

    let resp;
    try {
      resp = await fetch(u.toString(), {
        method: request.method,
        headers,
        body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : await request.arrayBuffer(),
      });
    } catch (e) {
      return new Response('转发失败: ' + e.message, { status: 502, headers: cors() });
    }

    return new Response(resp.body, {
      status: resp.status,
      headers: cors({ 'Content-Type': resp.headers.get('Content-Type') || 'application/json' }),
    });
  },
};
