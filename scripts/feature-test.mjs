/**
 * 新功能全链路功能测试（警示榜 + 聪明钱 + admin CRUD）
 * 用法：node scripts/feature-test.mjs
 * 说明：从 .env 读取 ADMIN_PASSWORD，绝不打印任何密钥明文。
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
function groupIp() {
  return `10.88.${Math.floor(ipSeq / 250) + 1}.${(ipSeq++ % 250) + 1}`;
}

function report(name, ok, evidence) {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name} — ${evidence}`);
}

async function get(apiPath, ip) {
  const t0 = performance.now();
  const res = await fetch(BASE + apiPath, { headers: ip ? { 'X-Forwarded-For': ip } : {} });
  const ms = Math.round(performance.now() - t0);
  return { status: res.status, json: await res.json().catch(() => null), ms };
}

async function post(apiPath, body, { ip, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (ip) headers['X-Forwarded-For'] = ip;
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(BASE + apiPath, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null), headers: res.headers };
}

async function main() {
  console.log(`\n=== 新功能全链路功能测试 @ ${new Date().toISOString()} ===\n`);

  // ── ① /api/alerts 默认 ─────────────────────────────────────────
  {
    const r = await get('/api/alerts?chain=all&page=1&pageSize=10', groupIp());
    const j = r.json || {};
    const ok = r.status === 200 && j.total === 11 && j.items?.length === 10 &&
      j.items.every((i) => i.address && i.maskedAddress && i.evidenceUrl && i.typeLabel && i.chain);
    report(
      'GET /api/alerts 默认（total=11, items=10, 字段齐全）',
      ok,
      `HTTP ${r.status} (${r.ms}ms) total=${j.total} items=${j.items?.length} 首条=${j.items?.[0]?.address} type=${j.items?.[0]?.type} mask=${j.items?.[0]?.maskedAddress}`
    );
  }

  // ── ② 按链筛选 ─────────────────────────────────────────────────
  {
    const r = await get('/api/alerts?chain=tron&pageSize=50', groupIp());
    const j = r.json || {};
    const ok = r.status === 200 && j.total === 7 && j.items.every((i) => i.chain === 'tron');
    report(
      'GET /api/alerts?chain=tron（total=7）',
      ok,
      `HTTP ${r.status} total=${j.total} 全为TRON=${j.items?.every((i) => i.chain === 'tron')}`
    );
  }
  {
    const r = await get('/api/alerts?chain=btc&pageSize=50', groupIp());
    report('GET /api/alerts?chain=btc（total=2）', r.status === 200 && r.json?.total === 2, `HTTP ${r.status} total=${r.json?.total}`);
    const r2 = await get('/api/alerts?chain=eth&pageSize=50', groupIp());
    report('GET /api/alerts?chain=eth（total=2）', r2.status === 200 && r2.json?.total === 2, `HTTP ${r2.status} total=${r2.json?.total}`);
  }

  // ── ③ 按类型筛选 ───────────────────────────────────────────────
  {
    const r = await get('/api/alerts?type=phishing&pageSize=50', groupIp());
    const j = r.json || {};
    const ok = r.status === 200 && j.total === 3 && j.items.every((i) => i.type === 'phishing');
    report(
      'GET /api/alerts?type=phishing（total=3）',
      ok,
      `HTTP ${r.status} total=${j.total} 全为phishing=${j.items?.every((i) => i.type === 'phishing')}`
    );
  }
  {
    const r = await get('/api/alerts?chain=tron&type=mixer&pageSize=50', groupIp());
    report(
      'GET /api/alerts?chain=tron&type=mixer（组合筛选 total=2：种子1+黑名单1）',
      r.status === 200 && r.json?.total === 2,
      `HTTP ${r.status} total=${r.json?.total}`
    );
  }

  // ── ④ 分页一致性 ───────────────────────────────────────────────
  {
    const p1 = await get('/api/alerts?page=1&pageSize=5', groupIp());
    const p2 = await get('/api/alerts?page=2&pageSize=5', groupIp());
    const p3 = await get('/api/alerts?page=3&pageSize=5', groupIp());
    const ids = new Set([...p1.json.items, ...p2.json.items, ...p3.json.items].map((i) => i.address));
    const ok =
      p1.status === 200 && p2.status === 200 && p3.status === 200 &&
      p1.json.total === 11 && p2.json.total === 11 && p3.json.total === 11 &&
      p1.json.items.length === 5 && p2.json.items.length === 5 && p3.json.items.length === 1 &&
      ids.size === 11;
    report(
      '分页一致性（5/5/1 无重复无遗漏 total 恒为 11）',
      ok,
      `p1=${p1.json.items.length} p2=${p2.json.items.length} p3=${p3.json.items.length} 去重后=${ids.size}`
    );
  }

  // ── ⑤ /api/smart-money/list 真实链上数据 ──────────────────────
  {
    const r = await get('/api/smart-money/list', groupIp());
    const j = r.json || {};
    const items = j.items || [];
    const vitalik = items.find((i) => i.address === '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    const genesis = items.find((i) => i.address === '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    const usdt = items.find((i) => i.address === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    const ok = r.status === 200 && items.length === 5 && vitalik && genesis && usdt &&
      vitalik.balanceValue !== null && vitalik.balanceValue > 0 && !vitalik.degraded &&
      genesis.balanceValue !== null && !genesis.degraded && genesis.txCount !== null;
    report(
      'list 三种子真实链上数据（Vitalik 余额>0 必须成立）',
      ok,
      `HTTP ${r.status} (${r.ms}ms) cached=${j.cached} items=${items.length} | ` +
        `Vitalik balance=${vitalik?.balance} txCount=${vitalik?.txCount} degraded=${vitalik?.degraded} | ` +
        `Genesis balance=${genesis?.balance} txCount=${genesis?.txCount} degraded=${genesis?.degraded} | ` +
        `USDT 合约 balance=${usdt?.balance} events=${usdt?.eventsCount} degraded=${usdt?.degraded}`
    );
  }

  // ── ⑥ events：ETH 降级快照 ─────────────────────────────────────
  {
    const r = await get(
      `/api/smart-money/events?address=${encodeURIComponent('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')}&chain=eth`,
      groupIp()
    );
    const j = r.json || {};
    const ok = r.status === 200 && j.degraded && j.degraded.message.includes('降级') && j.degraded.snapshot?.balanceEth > 0;
    report(
      'events ETH → 明确降级消息 + 余额/交易数快照（如实标注）',
      ok,
      `HTTP ${r.status} degraded=${!!j.degraded} 消息=${j.degraded?.message?.slice(0, 40)}… snapshot余额=${j.degraded?.snapshot?.balanceEth?.toFixed(4)} ETH txCount=${j.degraded?.snapshot?.txCount}`
    );
  }

  // ── ⑦ events：BTC 真实时间线 ───────────────────────────────────
  {
    const r = await get(
      `/api/smart-money/events?address=${encodeURIComponent('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')}&chain=btc`,
      groupIp()
    );
    const j = r.json || {};
    const ok = r.status === 200 && Array.isArray(j.events) && j.events.length > 0 &&
      j.events.every((e) => e.direction && e.amountText && e.txShort && e.evidenceUrl);
    report(
      'events BTC 创世地址 → 真实时间线（方向/金额/对手方/链接齐全）',
      ok,
      `HTTP ${r.status} events=${j.events?.length} 首条=${j.events?.[0]?.direction} ${j.events?.[0]?.amountText} 对手=${j.events?.[0]?.counterpartyMasked}`
    );
  }

  // ── ⑧ events：非法参数 400 ─────────────────────────────────────
  {
    const bad1 = await get('/api/smart-money/events?address=&chain=eth', groupIp());
    const bad2 = await get('/api/smart-money/events?address=abc&chain=solana', groupIp());
    const bad3 = await get('/api/smart-money/events?address[$gt]=x&chain=eth', groupIp());
    report(
      'events 非法参数（空地址/错误链/对象注入）→ 400',
      bad1.status === 400 && bad2.status === 400 && bad3.status === 400,
      `空地址=${bad1.status} 错误链=${bad2.status} 对象注入=${bad3.status}`
    );
  }

  // ── ⑨ admin CRUD 未登录 401 ────────────────────────────────────
  {
    const p = await post('/api/admin/smart-money', { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', chain: 'tron', name: 'x' }, { ip: groupIp() });
    const put = await fetch(`${BASE}/api/admin/smart-money`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': groupIp() },
      body: JSON.stringify({ address: 'abc', name: 'x' }),
    });
    const del = await fetch(`${BASE}/api/admin/smart-money?address=abc`, {
      method: 'DELETE',
      headers: { 'X-Forwarded-For': groupIp() },
    });
    report(
      '未登录 CRUD（POST/PUT/DELETE）→ 401',
      p.status === 401 && put.status === 401 && del.status === 401,
      `POST=${p.status} PUT=${put.status} DELETE=${del.status}`
    );
  }

  // ── ⑩ admin CRUD 全链路（登录→新增→列表→停用→启用→编辑→删除） ──
  {
    const login = await post('/api/admin/login', { password: ENV.ADMIN_PASSWORD || '' }, { ip: groupIp() });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const H = { Cookie: cookie, 'Content-Type': 'application/json', 'X-Forwarded-For': groupIp() };

    // 新增（ETH 测试地址）
    const addAddr = '0x1111111111111111111111111111111111111111';
    const add = await fetch(`${BASE}/api/admin/smart-money`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ address: addAddr, chain: 'eth', name: '功能测试·临时', enabled: true }),
    });
    const addJson = await add.json();
    const inList = addJson.items?.some((i) => i.address === addAddr);

    // 重复新增 → 409
    const dup = await fetch(`${BASE}/api/admin/smart-money`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ address: addAddr, chain: 'eth', name: '重复', enabled: true }),
    });

    // 停用
    const dis = await fetch(`${BASE}/api/admin/smart-money`, {
      method: 'PUT', headers: H,
      body: JSON.stringify({ address: addAddr, enabled: false }),
    });
    const disJson = await dis.json();
    const disabled = disJson.items?.find((i) => i.address === addAddr)?.enabled === false;

    // 编辑名称 + 启用
    const edit = await fetch(`${BASE}/api/admin/smart-money`, {
      method: 'PUT', headers: H,
      body: JSON.stringify({ address: addAddr, name: '功能测试·已改名', enabled: true }),
    });
    const editJson = await edit.json();
    const renamed = editJson.items?.find((i) => i.address === addAddr)?.name === '功能测试·已改名';

    // 链不匹配 → 400
    const mismatch = await fetch(`${BASE}/api/admin/smart-money`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ address: addAddr, chain: 'tron', name: '错链', enabled: true }),
    });

    // 删除
    const del = await fetch(`${BASE}/api/admin/smart-money?address=${addAddr}`, { method: 'DELETE', headers: H });
    const delJson = await del.json();
    const gone = !delJson.items?.some((i) => i.address === addAddr);

    // 删除后确认 smartmoney.json 已还原为 5 条
    const after = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'smartmoney.json'), 'utf8'));

    const ok = login.status === 200 && add.status === 200 && inList && dup.status === 409 &&
      dis.status === 200 && disabled && edit.status === 200 && renamed &&
      mismatch.status === 400 && del.status === 200 && gone && after.length === 5;

    report(
      'admin CRUD 全链路（登录→新增→409去重→停用→改名→错链400→删除→文件还原5条）',
      ok,
      `login=${login.status} add=${add.status} 列表中=${inList} 重复=${dup.status} 停用=${disabled} 改名=${renamed} 错链=${mismatch.status} 删除=${gone} 文件条数=${after.length}`
    );
  }

  // ── ⑪ /api/alerts 非法参数 400 ─────────────────────────────────
  {
    const bad1 = await get('/api/alerts?chain=sol', groupIp());
    const bad2 = await get('/api/alerts?type=hack', groupIp());
    const bad3 = await get('/api/alerts?pageSize=999', groupIp());
    const bad4 = await get('/api/alerts?page=0', groupIp());
    const bad5 = await get('/api/alerts?chain[$gt]=x', groupIp());
    const bad6 = await get('/api/alerts?chain=' + encodeURIComponent('<script>alert(1)</script>'), groupIp());
    report(
      'alerts 非法参数（错链/错类型/超长pageSize/page=0/对象注入/XSS）→ 400 不 500',
      bad1.status === 400 && bad2.status === 400 && bad3.status === 400 && bad4.status === 400 && bad5.status === 400 && bad6.status === 400,
      `错链=${bad1.status} 错类型=${bad2.status} pageSize999=${bad3.status} page0=${bad4.status} 对象注入=${bad5.status} XSS=${bad6.status}`
    );
  }

  // ── ⑫ 限流：alerts 21 次 → 第 21 次 429 ────────────────────────
  {
    const ip = groupIp();
    const statuses = [];
    for (let i = 0; i < 21; i++) {
      const r = await get('/api/alerts?pageSize=1', ip);
      statuses.push(r.status);
    }
    report(
      'alerts 限流 20/分：前20=200，第21次=429',
      statuses.slice(0, 20).every((s) => s === 200) && statuses[20] === 429,
      `前20=${statuses.slice(0, 20).join(',')} 第21=${statuses[20]}`
    );
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=== 功能测试结果：${pass}/${results.length} 通过 ===\n`);
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error('功能测试脚本异常：', e.message);
  process.exit(1);
});
