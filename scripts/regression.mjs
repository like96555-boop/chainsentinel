/**
 * 功能回归脚本：多链三地址 / 黑名单 red / 非法 400 / health / chat 流式 / admin 掩码 / 限流边界
 * 用法：node scripts/regression.mjs
 * 说明：各测试组使用不同 X-Forwarded-For 隔离限流桶，互不影响。
 * 安全：从 .env 读取的密钥绝不打印。
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];

function loadEnv() {
  const env = {};
  const p = path.join(process.cwd(), '.env');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return env;
}
const ENV = loadEnv();

let ipSeq = 1;
const RUN_BASE = 10 + Math.floor(Math.random() * 200); // 每次运行随机网段，避免跨运行限流窗口残留
function groupIp() {
  return `10.${RUN_BASE}.${Math.floor(ipSeq / 250) + 1}.${(ipSeq++ % 250) + 1}`;
}

async function post(apiPath, body, ip) {
  const t0 = performance.now();
  const res = await fetch(BASE + apiPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify(body),
  });
  const ms = Math.round(performance.now() - t0);
  const json = await res.json().catch(() => null);
  return { status: res.status, json, ms };
}

function report(name, ok, evidence) {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name} — ${evidence}`);
}

async function main() {
  console.log(`\n=== 链哨 ChainSentinel 功能回归 @ ${new Date().toISOString()} ===\n`);

  // ── 1. 多链三地址 ──────────────────────────────────────────────
  const cases = [
    {
      name: 'BTC 中本聪创世地址',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      chain: 'btc',
      evidence: 'https://blockstream.info/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    },
    {
      name: 'ETH vitalik.eth 公开地址',
      address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      chain: 'eth',
      evidence: 'https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    },
    {
      name: 'TRON USDT 合约',
      address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      chain: 'tron',
      evidence: 'https://tronscan.org/#/address/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    },
  ];
  for (const c of cases) {
    const r = await post('/api/check', { address: c.address }, groupIp());
    const j = r.json || {};
    const ok =
      r.status === 200 &&
      j.chain === c.chain &&
      Array.isArray(j.evidenceLinks) &&
      j.evidenceLinks.includes(c.evidence);
    report(
      `多链 ${c.name}`,
      ok,
      `HTTP ${r.status} (${r.ms}ms) chain=${j.chain} level=${j.level} score=${j.score} upstream=${j.upstreamReachable} evidence=${j.evidenceLinks?.[0] || '无'}`
    );
  }

  // ── 2. 黑名单 red 短路 ────────────────────────────────────────
  {
    const r = await post('/api/check', { address: 'TDemoPhishSink11111111111111111111' }, groupIp());
    const j = r.json || {};
    report(
      '黑名单命中 → red/5',
      r.status === 200 && j.level === 'red' && j.score === 5 && j.chain === 'tron',
      `HTTP ${r.status} level=${j.level} score=${j.score} chain=${j.chain} label=${j.blacklist?.label}`
    );
  }

  // ── 3. 非法地址 400 ───────────────────────────────────────────
  const invalid = [
    ['非法 TRON', 'T123abc'],
    ['非法 ETH', '0xZZZ123'],
    ['非法 BTC', 'bc1xx'],
    ['乱码字符串', 'hello-world-not-an-address'],
  ];
  for (const [label, addr] of invalid) {
    const r = await post('/api/check', { address: addr }, groupIp());
    const hint = r.json?.error || '';
    report(
      `非法地址 ${label} → 400`,
      r.status === 400 && hint.includes('TRON') && hint.includes('BTC') && hint.includes('ETH'),
      `HTTP ${r.status} 提示=${hint.slice(0, 40)}…`
    );
  }

  // ── 4. /api/health ────────────────────────────────────────────
  {
    const res = await fetch(`${BASE}/api/health`);
    const j = await res.json();
    report(
      'GET /api/health → 200',
      res.status === 200 && j.status === 'ok' && JSON.stringify(j.chains) === '["tron","btc","eth"]' && typeof j.uptime === 'number',
      `HTTP ${res.status} version=${j.version} uptime=${j.uptime}s chains=${j.chains} rss=${j.memoryRssMb}MB`
    );
  }

  // ── 5. /api/chat 流式 ─────────────────────────────────────────
  {
    const t0 = performance.now();
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': groupIp() },
      body: JSON.stringify({ message: '专业版多少钱？包含哪些功能？' }),
    });
    let text = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let firstByteMs = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstByteMs === null) firstByteMs = Math.round(performance.now() - t0);
      text += decoder.decode(value, { stream: true });
    }
    const totalMs = Math.round(performance.now() - t0);
    const hasCjk = /[一-鿿]/.test(text);
    report(
      'chat 流式输出完整中文回答',
      res.status === 200 && text.length > 20 && hasCjk,
      `HTTP ${res.status} 首字节=${firstByteMs}ms 总耗时=${totalMs}ms 长度=${text.length}字 摘要=${text.slice(0, 50).replace(/\n/g, ' ')}…`
    );
  }

  // ── 6. admin 登录 + 掩码 ──────────────────────────────────────
  {
    const login = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ENV.ADMIN_PASSWORD || '' }),
    });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const s = await fetch(`${BASE}/api/admin/secrets`, { headers: { Cookie: cookie } });
    const body = await s.text();
    const rawKey = ENV.KIMI_API_KEY || '';
    const leaksRaw = rawKey.length > 8 && body.includes(rawKey);
    report(
      'admin 登录 + secrets 掩码（无明文泄露）',
      login.status === 200 && s.status === 200 && !leaksRaw && body.includes('****'),
      `login=${login.status} secrets=${s.status} 含掩码****=${body.includes('****')} 明文泄露=${leaksRaw}`
    );
  }

  // ── 7. /api/check 限流边界（专用 IP，11 次串行） ───────────────
  {
    const ip = groupIp();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const r = await post('/api/check', { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }, ip);
      statuses.push(r.status);
    }
    report(
      'check 限流：第 11 次 429',
      statuses.slice(0, 10).every((s) => s === 200) && statuses[10] === 429,
      `状态序列=${statuses.join(',')}`
    );
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=== 回归结果：${pass}/${results.length} 通过 ===\n`);
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('回归脚本异常：', e.message);
  process.exit(1);
});
