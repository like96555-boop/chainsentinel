/**
 * Agent API 回归脚本：发现层 / 免费层 / 付费层 / 幂等 / MCP / 旧接口无回归
 * 用法：node scripts/agent-api-test.mjs
 * 付费层用例需要本地开发服务器以 AGENT_API_TEST=1 启动（合成 txId 仅在 NODE_ENV!=production 生效）。
 * 所有用例使用独立 X-Forwarded-For 隔离限流桶。
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TEST_MODE = process.env.AGENT_TOPUP_TEST === '1';
const results = [];
let ipSeq = 1;
const RUN = 100 + Math.floor(Math.random() * 100);
function ip() {
  ipSeq += 1;
  return `10.${RUN}.${Math.floor(ipSeq / 250) + 1}.${ipSeq % 250 + 1}`;
}
function ok(name, cond, detail = '') {
  results.push({ name, pass: Boolean(cond), detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' · ' + detail : ''}`);
}
async function call(path, opts = {}, withIp = true) {
  const headers = { ...(withIp ? { 'X-Forwarded-For': ip() } : {}), ...(opts.headers || {}) };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: res.status, json, text, headers: res.headers };
}
const post = (path, body, headers = {}) => call(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const RISKY = 'TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81'; // OFAC SDN，黑名单短路，不触发上游

async function main() {
  console.log(`\n=== ChainSentinel Agent API 回归  BASE=${BASE}  TOPUP_TEST=${TEST_MODE} ===\n`);

  // 1. 发现层：Agent 拿到根域名就能找到我们
  for (const p of ['/llms.txt', '/llms-full.txt', '/api/openapi.json', '/.well-known/agent-card.json', '/agent', '/robots.txt', '/sitemap.xml']) {
    const r = await call(p);
    ok(`发现文件 ${p} 可访问`, r.status === 200, `HTTP ${r.status}`);
  }
  const llms = await call('/llms.txt');
  ok('llms.txt 含 v1/check 与 /api/mcp', llms.text.includes('/api/v1/check') && llms.text.includes('/api/mcp'));
  const openapi = await call('/api/openapi.json');
  ok('OpenAPI 3.1 且声明 /api/v1/check', openapi.json?.openapi === '3.1.0' && Boolean(openapi.json?.paths?.['/api/v1/check']));
  const robots = await call('/robots.txt');
  ok('robots 放行 /llms.txt 与 /api/v1/', robots.text.includes('/llms.txt') && robots.text.includes('/api/v1/'));
  const manifest = await call('/api/v1/manifest');
  ok('manifest 含定价与错误码', manifest.json?.pricing?.pricePerCallUsd === 0.01 && Array.isArray(manifest.json?.errorCodes));
  ok('manifest 声明 coverage 语义与真实数据构成', manifest.json?.semantics?.greenIsNotClearance === true && manifest.json?.dataSources?.composition?.['ofac-sdn'] === 906);
  ok('llms.txt 明确 green 不是清白证明', llms.text.includes('NOT a clearance') && llms.text.includes('906 OFAC SDN'));
  ok('OpenAPI 声明 ScreeningCoverage 且响应必含 coverage', Boolean(openapi.json?.components?.schemas?.ScreeningCoverage) && openapi.json?.components?.schemas?.CheckResponse?.required?.includes('coverage'));

  // 2. 免费层：零配置直接可用
  const getDoc = await call('/api/v1/check');
  ok('GET /api/v1/check 返回用法', getDoc.status === 200 && typeof getDoc.json?.example?.body?.address === 'string');
  const free = await post('/api/v1/check', { address: RISKY });
  ok('免费层免鉴权调用成功', free.status === 200 && free.json?.meta?.tier === 'free' && free.json?.meta?.billedUsd === 0);
  ok('判定结果正确（OFAC red）', free.json?.level === 'red' && free.json?.blacklist?.source === 'ofac-sdn');
  ok('响应带幂等/限流头', Boolean(free.headers.get('x-request-id')) && free.headers.get('x-ratelimit-remaining') !== null);

  // 2.1 coverage 语义：Agent 必须能区分「命中名单」与「我们对这个地址没有情报」
  const cov = free.json?.coverage;
  ok('命中响应判定依据为名单命中且 noData=false', cov?.verdictBasis === 'sanctions-list-hit' && cov?.noData === false);
  ok('命中响应建议 block 且声明未查询上游', cov?.recommendedAction === 'block' && cov?.upstreamQueried === false);
  ok('coverage 明确 green 不是清白证明', cov?.greenIsNotClearance === true && typeof cov?.interpretation === 'string');
  ok('coverage 列出未覆盖范围与已执行检查', Array.isArray(cov?.notCovered) && cov.notCovered.length >= 4 && Array.isArray(cov?.checksPerformed));

  const clean = await post('/api/v1/check', { address: 'TNPeeaaFB7K9cmo4uQpcU32zGK8G1NYnou' });
  const ccov = clean.json?.coverage;
  ok('未命中响应明确 noData=true', clean.status === 200 && ccov?.noData === true && ['chain-activity-heuristics', 'degraded-upstream'].includes(ccov?.verdictBasis));
  ok('未命中不会给出 block 建议', ccov?.recommendedAction === 'escalate' || ccov?.recommendedAction === 'proceed-with-caution');
  ok('未命中响应列出链上检查项', Array.isArray(ccov?.checksPerformed) && ccov.checksPerformed.some((x) => String(x).includes('onchain-activity')));
  ok('coverage.degraded 与 upstreamReachable 一致', ccov?.degraded === (clean.json?.upstreamReachable === false));

  const bad1 = await post('/api/v1/check', { address: '' });
  ok('空地址 → INVALID_ADDRESS 400', bad1.status === 400 && bad1.json?.error?.code === 'INVALID_ADDRESS' && Boolean(bad1.json?.error?.hint));
  const bad2 = await post('/api/v1/check', { address: 'not-an-address' });
  ok('非法格式 → UNSUPPORTED_ADDRESS_FORMAT', bad2.status === 400 && bad2.json?.error?.code === 'UNSUPPORTED_ADDRESS_FORMAT');
  const bad3 = await call('/api/v1/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  ok('坏 JSON → INVALID_JSON', bad3.status === 400 && bad3.json?.error?.code === 'INVALID_JSON');
  const opt = await call('/api/v1/check', { method: 'OPTIONS' });
  ok('CORS 预检可用', opt.status === 204 && opt.headers.get('access-control-allow-origin') === '*');

  // 3. MCP：一个 URL 就能列出并调用工具
  const init = await post('/api/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize' });
  ok('MCP initialize', init.json?.result?.protocolVersion === '2025-06-18' && Boolean(init.json?.result?.instructions));
  const list = await post('/api/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const toolNames = (list.json?.result?.tools || []).map((t) => t.name);
  ok('MCP tools/list 三个工具', ['check_address', 'get_balance', 'topup_info'].every((n) => toolNames.includes(n)), toolNames.join(','));
  const mcpCall = await post('/api/mcp', { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'check_address', arguments: { address: RISKY } } });
  const inner = JSON.parse(mcpCall.json?.result?.content?.[0]?.text || '{}');
  ok('MCP check_address 免费层可用', mcpCall.json?.result?.isError === false && inner.level === 'red');
  ok('MCP check_address 同样返回 coverage 语义', inner.coverage?.verdictBasis === 'sanctions-list-hit' && inner.coverage?.recommendedAction === 'block');
  ok('MCP 工具描述声明 green 不是清白证明', JSON.stringify(list.json?.result?.tools || []).includes('green is NOT a clearance') || JSON.stringify(list.json?.result?.tools || []).includes('NOT a clearance'));
  const mcpTopup = await post('/api/mcp', { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'topup_info', arguments: {} } });
  ok('MCP topup_info 返回支付指引', JSON.stringify(mcpTopup.json?.result || {}).includes('minTopupUsdt'));
  const unknown = await post('/api/mcp', { jsonrpc: '2.0', id: 5, method: 'nope' });
  ok('MCP 未知方法 → -32601', unknown.json?.error?.code === -32601);

  // 4. 付费层（仅本地开发测试模式）
  if (TEST_MODE) {
    // 4.1 一次性报价与冒领防护
    const quote = await post('/api/v1/quote', {});
    const quoteId = quote.json?.quoteId;
    const amount = quote.json?.amountUsdt;
    ok('一次性报价返回唯一 6 位小数金额', quote.status === 200 && typeof quoteId === 'string' && typeof amount === 'number' && amount >= 1 && amount < 2);
    const noQuote = await post('/api/v1/topup', { txId: 'test_' + amount + '_noquote' });
    ok('缺少 quoteId → QUOTE_REQUIRED（防冒领）', noQuote.status === 400 && noQuote.json?.error?.code === 'QUOTE_REQUIRED');
    const wrongAmount = await post('/api/v1/topup', { txId: `test_${amount + 0.0001}_wrong`, quoteId });
    ok('金额不符 → AMOUNT_MISMATCH', wrongAmount.status === 400 && wrongAmount.json?.error?.code === 'AMOUNT_MISMATCH');

    const txId = `test_${amount}_${Date.now().toString(36)}_agenttest`;
    const topup = await post('/api/v1/topup', { txId, quoteId });
    const cred = topup.json?.credential;
    ok('充值 → 返回 cs_agent_ 凭证', topup.status === 200 && typeof cred === 'string' && cred.startsWith('cs_agent_'));
    ok('充值余额与报价金额一致', topup.json?.balanceUsd === amount && topup.json?.estimatedCalls === Math.floor(amount / 0.01));
    const replay = await post('/api/v1/topup', { txId, quoteId });
    ok('同一 txId 重放不重复入账', replay.json?.alreadyClaimed === true && replay.json?.credential === cred && replay.json?.balanceUsd === amount);
    const stolen = await post('/api/v1/topup', { txId, quoteId: (await post('/api/v1/quote', {})).json?.quoteId });
    ok('同一 txId 无法被别的报价冒领', stolen.status === 400 && ['QUOTE_REUSED', 'QUOTE_TX_MISMATCH'].includes(stolen.json?.error?.code));

    const auth = { Authorization: `Bearer ${cred}` };
    const bal0 = await call('/api/v1/balance', { headers: auth });
    ok('余额查询', bal0.status === 200 && bal0.json?.balanceUsd === amount);

    const rid = 'req_idempotent_' + Date.now();
    const p1 = await post('/api/v1/check', { address: RISKY }, { ...auth, 'X-Request-Id': rid });
    const p2 = await post('/api/v1/check', { address: RISKY }, { ...auth, 'X-Request-Id': rid });
    const bal1 = await call('/api/v1/balance', { headers: auth });
    ok('付费调用成功并计费', p1.status === 200 && p1.json?.meta?.tier === 'prepaid' && p1.json?.meta?.billedUsd === 0.01);
    ok('X-Request-Id 幂等（重复不扣费）', p2.json?.meta?.billedUsd === 0 && Math.abs(bal1.json?.balanceUsd - (amount - 0.01)) < 1e-8);
    ok('付费响应带余额头', p1.headers.get('x-agent-balance-usd') !== null);

    const invalid = await post('/api/v1/check', { address: RISKY }, { Authorization: 'Bearer cs_agent_deadbeef' });
    ok('无效凭证 → INVALID_TOKEN 401', invalid.status === 401 && invalid.json?.error?.code === 'INVALID_TOKEN');

    // 耗尽余额 → 402 且带完整支付指引（100 次 × 0.01，黑名单短路不触发上游）
    let last = null;
    for (let i = 0; i < 220; i += 1) {
      last = await post('/api/v1/check', { address: RISKY }, auth);
      if (last.status === 402) break;
    }
    ok('余额耗尽 → 402 PAYMENT_REQUIRED', last?.status === 402 && last?.json?.error?.code === 'PAYMENT_REQUIRED');
    ok('402 附带可执行支付指引', Array.isArray(last?.json?.payment?.steps) && last.json.payment.steps.length >= 3 && Array.isArray(last?.json?.topupHowTo));
  } else {
    console.log('SKIP  付费层用例（需 AGENT_API_TEST=1 启动 dev server，并设置 AGENT_TOPUP_TEST=1）');
  }

  // 5. 旧接口无回归
  const legacy = await post('/api/check', { address: RISKY });
  ok('旧 /api/check 行为不变', legacy.status === 200 && legacy.json?.level === 'red' && legacy.json?.blacklist?.source === 'ofac-sdn');
  ok('旧接口同样带 coverage（判定引擎不漂移）', legacy.json?.coverage?.verdictBasis === 'sanctions-list-hit' && legacy.json?.coverage?.greenIsNotClearance === true);
  const health = await call('/api/health');
  ok('health 正常', health.status === 200);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} 通过 ===`);
  if (failed.length) {
    console.log('失败用例：', failed.map((f) => f.name).join(' | '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('测试脚本异常：', e);
  process.exit(1);
});
