/**
 * SEO / Agent 发现层契约测试
 *
 * 验证「Agent 从根域名出发能不能找到我们、找到的内容是不是准确」：
 *   - 发现文件端点存在、MIME 正确、JSON 可解析
 *   - 站内可达性：首页 / 英文首页能爬到 /agent 与机器入口
 *   - 结构化数据：canonical / hreflang / JSON-LD / FAQPage
 *   - robots 与 sitemap 一致，且明确放行 AI 爬虫
 *   - 文档措辞诚实：不夸大黑名单覆盖、不谎称官方 x402
 *
 * 用法：node scripts/seo-discovery-test.mjs
 *      BASE_URL=https://chainsentinel.hk node scripts/seo-discovery-test.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CANONICAL = 'https://chainsentinel.hk';
const results = [];

function ok(name, cond, detail = '') {
  results.push({ name, pass: Boolean(cond), detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' · ' + detail : ''}`);
}

async function call(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: res.status, text, json, type: res.headers.get('content-type') || '' };
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.parse(m[1].trim()); } catch { return null; } })
    .filter(Boolean);
}

// 曾经出现过的夸大措辞，出现在任何面向 Agent 的公开文件里都算回归
const OVERCLAIMS = [
  '900+ curated', 'curated blacklist labels', 'laundering/scam funds',
  'Detect dirty-money', 'money-laundering & scam fund detection',
  'dirty-money addresses', 'scam and laundering-linked funds',
];

(async () => {
  console.log(`SEO / discovery contract test → ${BASE}\n`);

  // 1. 发现文件端点
  const endpoints = [
    ['/llms.txt', 'text/plain'],
    ['/llms-full.txt', 'text/plain'],
    ['/robots.txt', 'text/plain'],
    ['/sitemap.xml', 'application/xml'],
    ['/api/openapi.json', 'application/json'],
    ['/.well-known/agent-card.json', 'application/json'],
    ['/api/v1/manifest', 'application/json'],
  ];
  const pages = {};
  for (const [path, mime] of endpoints) {
    const r = await call(path);
    pages[path] = r;
    ok(`发现端点 ${path} → 200 / ${mime}`, r.status === 200 && r.type.includes(mime), `${r.status} ${r.type}`);
  }
  const llms = pages['/llms.txt'].text;
  const llmsFull = pages['/llms-full.txt'].text;
  const openapi = pages['/api/openapi.json'].json;
  const card = pages['/.well-known/agent-card.json'].json;
  const manifest = pages['/api/v1/manifest'].json;
  const robots = pages['/robots.txt'].text;
  const sitemap = pages['/sitemap.xml'].text;

  ok('OpenAPI 是合法 3.1 规范且声明 coverage', Boolean(openapi?.openapi?.startsWith('3.')) && Boolean(openapi?.components?.schemas?.ScreeningCoverage), openapi?.openapi || 'invalid');
  ok('agent card 是合法 JSON', Boolean(card?.name || card?.protocolVersion || card?.skills), Object.keys(card || {}).slice(0, 4).join(','));
  ok('manifest 含语义与数据源', Boolean(manifest?.semantics) && Boolean(manifest?.dataSources) && manifest?.pricing?.pricePerCallUsd === 0.01);

  // 2. 站内可达性：爬虫从首页必须能走到 Agent 页与机器入口
  for (const [path, agentHref] of [['/', '/agent'], ['/en', '/en/agent']]) {
    const r = await call(path);
    ok(`${path} 首页链到 ${agentHref}`, r.status === 200 && r.text.includes(`href="${agentHref}"`), r.status.toString());
    ok(`${path} 首页含 llms.txt 内链`, r.text.includes('href="/llms.txt"'));
    ok(`${path} <head> 声明 llms.txt alternate`, r.text.includes('rel="alternate"') && r.text.includes('/llms.txt'));
  }
  ok('/agent 页互相链到英文版', (await call('/agent')).text.includes('href="/en/agent"'));

  // 3. Agent 落地页：HTML 元信息与结构化数据
  for (const [path, canonical] of [['/agent', '/agent'], ['/en/agent', '/en/agent']]) {
    const r = await call(path);
    ok(`${path} → 200`, r.status === 200, r.status.toString());
    ok(`${path} canonical 正确`, r.text.includes(`rel="canonical" href="${CANONICAL}${canonical}"`) || r.text.includes(`rel="canonical"href="${CANONICAL}${canonical}"`));
    const blocks = jsonLdBlocks(r.text);
    ok(`${path} JSON-LD 全部可解析`, blocks.length > 0, `${blocks.length} blocks`);
    ok(`${path} 链到 llms.txt / OpenAPI / agent card`, ['/llms.txt', '/api/openapi.json', '/.well-known/agent-card.json'].every((h) => r.text.includes(`href="${h}"`)));
  }
  const enAgent = await call('/en/agent');
  // Next.js 输出 hrefLang（驼峰），HTML 属性名大小写不敏感，用 /i 匹配
  ok('/en/agent 有 hreflang 中英互指', /hreflang="en"/i.test(enAgent.text) && /hreflang="zh-CN"/i.test(enAgent.text) && /hreflang="x-default"/i.test(enAgent.text));
  const enBlocks = jsonLdBlocks(enAgent.text);
  const faq = enBlocks.find((b) => b['@type'] === 'FAQPage');
  ok('/en/agent FAQPage 结构化数据（≥5 问）', Boolean(faq?.mainEntity?.length >= 5), `${faq?.mainEntity?.length || 0} questions`);
  ok('/en/agent 明确 green 非清白证明', enAgent.text.includes('green is NOT a clearance'));
  ok('/en/agent 明确非官方 x402', /NOT official x402/i.test(enAgent.text));

  // 4. robots / sitemap 一致性
  ok('robots 放行 llms.txt / agent / v1 API', ['/llms.txt', '/agent', '/en/agent', '/api/v1/'].every((p) => robots.includes(p)));
  ok('robots 显式欢迎 AI 爬虫', ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'OAI-SearchBot'].every((u) => robots.includes(u)));
  ok('robots 仍禁止后台与敏感 API', robots.includes('/admin/') && robots.includes('/api/admin/'));
  ok('robots 不再误禁已在 sitemap 的 /dashboard', !robots.includes('Disallow: /dashboard'));
  ok('sitemap 收录 /agent 与 /en/agent', sitemap.includes(`${CANONICAL}/agent`) && sitemap.includes(`${CANONICAL}/en/agent`));
  ok('sitemap 声明地址', sitemap.includes(`${CANONICAL}/sitemap.xml`) || robots.includes('Sitemap:'));

  // 5. 文档诚实性与机器可执行性
  ok('llms.txt 含免注册 quick start', llms.includes('POST https://chainsentinel.hk/api/v1/check') && llms.includes('no signup'));
  ok('llms.txt 写明真实数据构成 906 + 2', llms.includes('906 OFAC SDN') && llms.includes('2 public records'));
  ok('llms.txt 明确 green 非清白', llms.includes('green') && /NOT a clearance/i.test(llms));
  ok('llms.txt 明确非官方 x402', /not.*official x402/i.test(llms));
  ok('llms.txt 含域名消歧（避免与同名项目混淆）', llms.includes('Canonical domain') && llms.includes('not affiliated'));
  ok('llms.txt 指向英文落地页与 MCP 桥', llms.includes('/en/agent') && llms.includes('stdio-bridge.mjs'));
  ok('llms-full.txt 含完整流程与工具清单', llmsFull.includes('tools/list') && llmsFull.includes('/api/v1/quote'));
  for (const [name, text] of [['llms.txt', llms], ['llms-full.txt', llmsFull], ['openapi.json', JSON.stringify(openapi)], ['agent-card.json', JSON.stringify(card)]]) {
    const hit = OVERCLAIMS.find((w) => text.toLowerCase().includes(w.toLowerCase()));
    ok(`${name} 无夸大措辞`, !hit, hit || '');
  }

  // 6. 真实调用链路（发现文档里的示例必须真的能跑）
  const live = await fetch(`${BASE}/api/v1/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.99.77.6' },
    body: JSON.stringify({ address: 'TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81' }),
  });
  const liveBody = await live.json().catch(() => ({}));
  ok('文档示例地址真实可用且带 coverage', live.status === 200 && liveBody.level === 'red' && Boolean(liveBody.coverage?.recommendedAction), `${live.status} ${liveBody.level}`);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED:');
    for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error('SEO test crashed:', e);
  process.exit(1);
});
