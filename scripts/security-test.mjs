/**
 * 安全测试脚本：越权矩阵 / 注入与畸形输入 / XSS / 响应头 / 限流边界
 * 用法：node scripts/security-test.mjs
 * 产出：控制台 ✅/❌ 报告 + test-reports/security-*.md
 * 安全：从 .env 读取的口令/密钥绝不打印。
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
const RUN_BASE = 20 + Math.floor(Math.random() * 200); // 每次运行随机网段，避免跨运行限流窗口残留
function groupIp() {
  return `10.${RUN_BASE}.${Math.floor(ipSeq / 250) + 1}.${(ipSeq++ % 250) + 1}`;
}

function report(group, name, ok, evidence) {
  results.push({ group, name, ok, evidence });
  console.log(`${ok ? '✅' : '❌'} [${group}] ${name} — ${evidence}`);
}

async function post(apiPath, body, { ip, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (ip) headers['X-Forwarded-For'] = ip;
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(BASE + apiPath, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null), headers: res.headers };
}

async function main() {
  console.log(`\n=== 链哨 ChainSentinel 安全测试 @ ${new Date().toISOString()} ===\n`);

  // ── ① 越权矩阵 ────────────────────────────────────────────────
  {
    const g = '越权矩阵';
    const r1 = await fetch(`${BASE}/api/admin/secrets`);
    report(g, '未登录 GET /api/admin/secrets → 401', r1.status === 401, `HTTP ${r1.status}`);

    const r2 = await fetch(`${BASE}/api/admin/secrets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ KIMI_BASE_URL: 'https://x.example.com' }),
    });
    report(g, '未登录 PUT /api/admin/secrets → 401', r2.status === 401, `HTTP ${r2.status}`);

    const r3 = await fetch(`${BASE}/api/admin/status`);
    report(g, '未登录 GET /api/admin/status → 401', r3.status === 401, `HTTP ${r3.status}`);

    const r4 = await post('/api/admin/login', { password: 'wrong-password-12345' });
    report(g, '错误密码登录 → 401', r4.status === 401, `HTTP ${r4.status}`);

    // 篡改 cookie：先正常登录拿真 cookie，改最后 4 个字符再访问
    const login = await post('/api/admin/login', { password: ENV.ADMIN_PASSWORD || '' });
    const raw = (login.headers.get('set-cookie') || '').split(';')[0];
    const eq = raw.indexOf('=');
    const val = raw.slice(eq + 1);
    const tamperedTail = val.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA';
    const tampered = `${raw.slice(0, eq + 1)}${val.slice(0, -4)}${tamperedTail}`;
    const r5 = await fetch(`${BASE}/api/admin/secrets`, { headers: { Cookie: tampered } });
    report(g, '篡改 cookie（末 4 位）→ 401', r5.status === 401, `HTTP ${r5.status}（真 cookie 登录=${login.status}，篡改后被拒）`);

    // 对照组：真 cookie 可访问（证明 401 来自篡改而非服务故障）
    const r6 = await fetch(`${BASE}/api/admin/secrets`, { headers: { Cookie: raw } });
    report(g, '对照：真 cookie GET secrets → 200', r6.status === 200, `HTTP ${r6.status}`);
  }

  // ── ② 注入与畸形输入 ──────────────────────────────────────────
  {
    const g = '注入/畸形输入';
    const ip = groupIp();
    const payloads = [
      ['null body', null],
      ['超长字符串(10万字符)', { address: 'A'.repeat(100_000) }],
      ['Unicode 控制字符', { address: 'T' }],
      ['对象注入 {$gt:""}', { address: { $gt: '' } }],
      ['数组注入', { address: ['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'] }],
    ];
    for (const [label, body] of payloads) {
      const r = await post('/api/check', body, { ip });
      report(g, `/api/check ${label} → 400 不 500`, r.status === 400, `HTTP ${r.status} error=${String(r.json?.error || '').slice(0, 30)}`);
    }

    // XSS payload 经 /api/lead 落盘后，首页不得原样输出
    const xss = '<script>alert(1)</script>';
    const lead = await post('/api/lead', {
      name: xss,
      contact: 'xss-test@example.com',
      company: xss,
      interest: 'other',
      message: xss,
    }, { ip: groupIp() });
    const home = await fetch(`${BASE}/`);
    const html = await home.text();
    const leaked = html.includes(xss);
    report(
      g,
      'XSS payload 落盘后首页不原样渲染',
      lead.status === 200 && !leaked,
      `lead 提交=${lead.status} 首页含原始 payload=${leaked}（React 转义 + CSP script-src 双重防护）`
    );
  }

  // ── ③ 安全响应头 ──────────────────────────────────────────────
  {
    const g = '安全响应头';
    const home = await fetch(`${BASE}/`);
    const api = await post('/api/check', { address: 'bad' }, { ip: groupIp() });
    const need = ['x-content-type-options', 'x-frame-options', 'content-security-policy'];
    for (const h of need) {
      const inHome = home.headers.get(h);
      const inApi = api.headers.get(h);
      report(g, `${h}（首页 + API）`, Boolean(inHome && inApi), `首页=${inHome || '缺失'} | API=${inApi || '缺失'}`);
    }
  }

  // ── ④ /api/chat 限流边界 ─────────────────────────────────────
  {
    const g = '限流边界';
    const ip = groupIp();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      // 只取状态码立即取消响应体，避免等待 Kimi 流式全量输出
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({ message: `限流探测 ${i + 1}` }),
      });
      statuses.push(res.status);
      try { await res.body?.cancel(); } catch { /* noop */ }
    }
    report(
      g,
      '/api/chat 连发 11 次，第 11 次 429',
      statuses.slice(0, 10).every((s) => s === 200) && statuses[10] === 429,
      `状态序列=${statuses.join(',')}`
    );
  }

  // ── 汇总 + 落盘报告 ───────────────────────────────────────────
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=== 安全测试结果：${pass}/${results.length} 通过 ===\n`);

  const dir = path.join(process.cwd(), 'test-reports');
  fs.mkdirSync(dir, { recursive: true });
  const md = [
    `# 安全测试报告 — ${new Date().toISOString()}`,
    '',
    `目标：${BASE}（本地生产模式 npm start）`,
    '',
    '| 分组 | 测试项 | 结果 | 证据 |',
    '|---|---|---|---|',
    ...results.map((r) => `| ${r.group} | ${r.name} | ${r.ok ? '✅ 通过' : '❌ 失败'} | ${r.evidence} |`),
    '',
    `**总计：${pass}/${results.length} 通过**`,
  ].join('\n');
  const file = path.join(dir, `security-${Date.now()}.md`);
  fs.writeFileSync(file, md, 'utf8');
  console.log(`报告已保存：${file}`);

  process.exit(pass === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('安全测试脚本异常：', e.message);
  process.exit(1);
});
