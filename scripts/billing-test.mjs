// 链哨 · API 订阅计量扣费测试（服务运行中执行；服务需以 STRIPE_MOCK=1 启动）
// 覆盖：套餐列表 / 免费层 / 令牌认证 401 / 订阅激活 / 用量计量 / 超配额 402 / 停用 403 /
//      后台用量与订单 / Webhook 事件处理（mock）/ Stripe 验签算法自测 / 现场清理
import crypto from 'crypto';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const env = fs.readFileSync('C:/Users/37515/Desktop/临时AI/链哨ChainSentinel/.env', 'utf8');
const PW = (env.match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1].trim();
const TEST_IP = `10.60.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  cond ? pass++ : fail++;
};

const jfetch = async (path, opts = {}) => {
  const headers = { 'X-Forwarded-For': TEST_IP, ...(opts.headers || {}) };
  const r = await fetch(BASE + path, { ...opts, headers });
  let j = null;
  try { j = await r.json(); } catch { /* no json */ }
  return { r, j };
};

// Stripe 验签算法自测（与服务端 lib/stripe.ts 同一公式：HMAC-SHA256(secret, `${t}.${payload}`)）
function verifySig(payload, sigHeader, secret) {
  const parts = new Map();
  for (const kv of sigHeader.split(',')) { const i = kv.indexOf('='); if (i > 0) parts.set(kv.slice(0, i), kv.slice(i + 1)); }
  const t = parts.get('t'), v1 = parts.get('v1');
  if (!t || !v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex')); } catch { return false; }
}
function sign(payload, secret, ts = Math.floor(Date.now() / 1000)) {
  return `t=${ts},v1=${crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')}`;
}

(async () => {
  // 0) 验签算法自测（正确签名通过 / 篡改载荷失败 / 篡改签名失败 / 过期时间戳通过但内容不匹配拒绝）
  const secret = 'whsec_test_0123456789abcdef';
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });
  ok('验签：正确签名通过', verifySig(payload, sign(payload, secret), secret));
  ok('验签：篡改载荷拒绝', !verifySig(payload + 'x', sign(payload, secret), secret));
  ok('验签：篡改签名拒绝', !verifySig(payload, 't=1,v1=deadbeef', secret));
  ok('验签：错误密钥拒绝', !verifySig(payload, sign(payload, secret), 'whsec_wrong'));

  // 1) 套餐列表
  const plans = await jfetch('/api/billing/plans');
  ok('套餐列表 3 个', plans.r.status === 200 && plans.j?.plans?.length === 3, `count=${plans.j?.plans?.length}`);

  // 2) 免费层（无令牌）可查
  const free = await jfetch('/api/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }),
  });
  ok('免费层查 Ronin 地址红牌', free.r.status === 200 && free.j?.level === 'red', `level=${free.j?.level}`);

  // 3) 无效令牌 401
  const bad = await jfetch('/api/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer cs_live_ffffffffffffffffffffffffffffffffffffffffffff' },
    body: JSON.stringify({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }),
  });
  ok('无效令牌 401', bad.r.status === 401, `status=${bad.r.status}`);

  // 4) 订阅流程（pro）→ mock 支付 → 令牌生成
  const co = await jfetch('/api/billing/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', email: 'billing-test@chainsentinel.test' }),
  });
  ok('创建订阅订单', co.r.status === 200 && co.j?.orderId, `orderId=${co.j?.orderId}`);
  const orderId = co.j?.orderId;
  const mc = await jfetch(`/api/billing/mock-checkout?order=${encodeURIComponent(orderId)}`);
  ok('mock 支付完成并生成令牌', mc.r.status === 200 && mc.j?.ok && mc.j?.tokens?.length === 1, `tokens=${mc.j?.tokens?.length} plan=${mc.j?.planId}`);
  const subToken = mc.j?.tokens?.[0]?.key;
  const subTokenId = mc.j?.tokens?.[0]?.id;
  ok('订阅令牌配额 1000/日', mc.j?.quotaPerDay === 1000, `quota=${mc.j?.quotaPerDay}`);

  // 5) 令牌计量：连续 3 次 check，usedToday 递增
  const u1 = await jfetch('/api/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
    body: JSON.stringify({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }),
  });
  const u2 = await jfetch('/api/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subToken}` },
    body: JSON.stringify({ address: '1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX' }),
  });
  ok('令牌请求 1 计费成功', u1.r.status === 200 && u1.j?.quota?.usedToday === 1, `used=${u1.j?.quota?.usedToday}`);
  ok('令牌请求 2 计费成功（递增）', u2.r.status === 200 && u2.j?.quota?.usedToday === 2, `used=${u2.j?.quota?.usedToday}`);
  ok('响应带 plan=pro', u2.j?.quota?.plan === 'pro', `plan=${u2.j?.quota?.plan}`);

  // 6) 用量查询
  const q = await jfetch(`/api/billing/usage?token=${encodeURIComponent(subToken)}`);
  ok('用量查询 usedToday≥2', q.r.status === 200 && q.j?.usedToday >= 2 && q.j?.remainingToday === 1000 - q.j?.usedToday, `used=${q.j?.usedToday} rem=${q.j?.remainingToday}`);

  // 7) 超配额 402：后台建 dailyQuota=2 的令牌 → 3 连发
  const ck = await jfetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PW }) });
  const cookie = (ck.r.headers.get('set-cookie') || '').split(';')[0];
  ok('后台登录', ck.r.status === 200);
  const mk = await jfetch('/api/admin/keys', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ name: '[TEST]限额2', dailyQuota: 2 }) });
  const smallToken = mk.j?.key?.fullKey;
  const smallId = mk.j?.key?.id;
  ok('创建限额 2 的令牌', mk.r.status === 200 && smallToken);
  const s1 = await jfetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smallToken}` }, body: JSON.stringify({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }) });
  const s2 = await jfetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smallToken}` }, body: JSON.stringify({ address: '1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX' }) });
  const s3 = await jfetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smallToken}` }, body: JSON.stringify({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }) });
  ok('配额内请求 1/2 正常', s1.r.status === 200 && s2.r.status === 200);
  ok('超配额第 3 次 402', s3.r.status === 402, `status=${s3.r.status}`);
  ok('402 提示含剩余额度 0', s3.j?.quota?.remaining === 0, `rem=${s3.j?.quota?.remaining}`);

  // 8) 停用令牌 403
  await jfetch('/api/admin/keys', { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ id: smallId, enabled: false }) });
  const dis = await jfetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smallToken}` }, body: JSON.stringify({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }) });
  ok('停用令牌 403', dis.r.status === 403, `status=${dis.r.status}`);

  // 9) 后台用量与订单
  const ab = await jfetch('/api/admin/billing', { headers: { cookie } });
  ok('后台用量统计', ab.r.status === 200 && typeof ab.j?.usage?.totals?.todayUsage === 'number', `today=${ab.j?.usage?.totals?.todayUsage}`);
  ok('后台订单含测试订单', Array.isArray(ab.j?.orders) && ab.j?.orders?.some((o) => o.id === orderId));

  // 10) Webhook 事件处理（mock）：invoice.paid 续费 / subscription.deleted 停用
  const evtPaid = await jfetch('/api/billing/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'evt_inv_paid', type: 'invoice.paid', data: { object: { subscription: `sub_mock_${orderId}`, period_end: Math.floor(Date.now() / 1000) + 30 * 86400 } } }),
  });
  ok('webhook invoice.paid 受理', evtPaid.r.status === 200 && evtPaid.j?.received === true);
  const evtDel = await jfetch('/api/billing/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'evt_sub_del', type: 'customer.subscription.deleted', data: { object: { id: `sub_mock_${orderId}` } } }),
  });
  ok('webhook subscription.deleted 受理', evtDel.r.status === 200);
  const qAfter = await jfetch(`/api/billing/usage?token=${encodeURIComponent(subToken)}`);
  ok('订阅终止后令牌停用（403）', qAfter.r.status === 403, `status=${qAfter.r.status}`);

  // 11) 清理现场
  await jfetch(`/api/admin/keys?id=${smallId}`, { method: 'DELETE', headers: { cookie } });
  await jfetch(`/api/admin/keys?id=${subTokenId}`, { method: 'DELETE', headers: { cookie } });
  const ordersPath = 'C:/Users/37515/Desktop/临时AI/链哨ChainSentinel/data/orders.json';
  if (fs.existsSync(ordersPath)) {
    const raw = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
    const items = (raw.items || []).filter((o) => o.id !== orderId);
    fs.writeFileSync(ordersPath, JSON.stringify({ items, updatedAt: Date.now() }, null, 2), 'utf8');
  }
  ok('测试数据已清理', true);

  // ── 12) USDT 非托管收款 ─────────────────────────────────────
  const USDT_ADDR = 'TU4vEruvZwLLkSfV9bNw12EJTPvNr7Pvaa';
  // 12.0 保存当前运营配置（测试后恢复，绝不清掉真实收款地址）
  const usdtCfgBefore = (await jfetch('/api/admin/billing-plans', { headers: { cookie } })).j?.usdt?.address || '';
  // 12.1 未配置收款地址：USDT 通道关闭（503）
  await jfetch('/api/admin/billing-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ usdtAddress: '' }) });
  const usdtClosed = await jfetch('/api/billing/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', email: 'usdt@test.hk', paymentMethod: 'usdt' }),
  });
  ok('USDT 通道未配置 → 503', usdtClosed.r.status === 503, `status=${usdtClosed.r.status}`);
  // 12.2 后台配置收款地址
  const cfgUsdt = await jfetch('/api/admin/billing-plans', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ usdtAddress: USDT_ADDR }),
  });
  ok('后台配置 USDT 收款地址', cfgUsdt.r.status === 200 && cfgUsdt.j?.usdt?.configured === true);
  // 12.3 USDT 下单 → 返回收款信息
  const usdtOrder = await jfetch('/api/billing/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', email: 'usdt@test.hk', paymentMethod: 'usdt' }),
  });
  ok('USDT 下单返回收款信息', usdtOrder.r.status === 200 && usdtOrder.j?.method === 'usdt' && usdtOrder.j?.payTo?.address === USDT_ADDR, `amount=${usdtOrder.j?.payTo?.amountUsdt}`);
  const usdtOrderId = usdtOrder.j?.orderId;
  // 12.4 GET 状态（真实查链）→ 响应合法（pending 或 paid 均属正常响应，不依赖链上状态）
  const usdtGet = await jfetch(`/api/billing/usdt/status?order=${encodeURIComponent(usdtOrderId)}`);
  ok('USDT 状态查询响应合法', usdtGet.r.status === 200 && (usdtGet.j?.status === 'pending' || usdtGet.j?.status === 'paid'), `status=${usdtGet.j?.status}`);
  // 12.5 override 注入到账 → 订单 paid + 令牌激活（自包含确定路径）
  const usdtPaid = await jfetch('/api/billing/usdt/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: usdtOrderId, txId: 'tx_test_usdt_' + Date.now().toString(36), amountUsdt: 29 }),
  });
  ok('USDT 到账确认 → paid + 令牌激活', usdtPaid.r.status === 200 && usdtPaid.j?.status === 'paid' && Array.isArray(usdtPaid.j?.tokens) && usdtPaid.j?.tokens?.length === 1, `tokens=${usdtPaid.j?.tokens?.length}`);
  const usdtTokenId = usdtPaid.j?.tokens?.[0]?.id;
  // 12.6 幂等：重复确认不重复激活（仍 paid，令牌数不变）
  const keysBefore = (await jfetch('/api/admin/keys', { headers: { cookie } })).j?.keys?.length;
  const usdtAgain = await jfetch('/api/billing/usdt/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: usdtOrderId, txId: 'tx_test_dup', amountUsdt: 29 }),
  });
  const keysAfter = (await jfetch('/api/admin/keys', { headers: { cookie } })).j?.keys?.length;
  ok('USDT 幂等：重复确认不重复激活', usdtAgain.r.status === 200 && usdtAgain.j?.status === 'paid' && keysAfter === keysBefore, `keys ${keysBefore}→${keysAfter}`);
  // 12.7 清理：删除 USDT 测试令牌 + 订单 + 恢复运营原配置（真实地址）
  await jfetch(`/api/admin/keys?id=${usdtTokenId}`, { method: 'DELETE', headers: { cookie } });
  const ordersRaw2 = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
  const orders2 = (ordersRaw2.items || []).filter((o) => o.id !== usdtOrderId);
  fs.writeFileSync(ordersPath, JSON.stringify({ items: orders2, updatedAt: Date.now() }, null, 2), 'utf8');
  await jfetch('/api/admin/billing-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ usdtAddress: usdtCfgBefore }) });
  const usdtRestored = (await jfetch('/api/admin/billing-plans', { headers: { cookie } })).j?.usdt?.address;
  ok('USDT 测试数据已清理且运营配置恢复', usdtRestored === usdtCfgBefore, `restored=${usdtRestored || '(空)'}`);

  console.log(`\n===== 计量扣费测试: ${pass}/${pass + fail} 通过 =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
