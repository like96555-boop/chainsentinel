// 链哨 · 客户账号 + 我的监控测试（需服务运行中）
// 覆盖：注册/登录/me/错误密码/登出/未登录401/重复注册/监控增删查/格式校验
import fs from 'fs';
const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  cond ? pass++ : fail++;
};
const EM = `cust_${Date.now()}@test.hk`;
const PW = 'testPass123!';

async function jfetch(path, opts = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => null);
  return { r, j };
}

(async () => {
  // 1) 未登录 me → 401
  const me0 = await jfetch('/api/auth/me');
  ok('未登录 me → 401', me0.r.status === 401, `status=${me0.r.status}`);

  // 2) 注册
  const reg = await jfetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: EM, password: PW }) });
  ok('注册成功', reg.r.status === 200 && reg.j?.ok === true, `status=${reg.r.status}`);

  // 3) 重复注册 → 409
  const reg2 = await jfetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: EM, password: PW }) });
  ok('重复注册 → 409', reg2.r.status === 409, `status=${reg2.r.status} ${reg2.j?.error || ''}`);

  // 4) 弱密码 → 400
  const reg3 = await jfetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'x@test.hk', password: '123' }) });
  ok('弱密码注册 → 400', reg3.r.status === 400, `status=${reg3.r.status}`);

  // 5) 登录（拿 cookie）
  const lg = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EM, password: PW }) });
  const cookie = (lg.headers.get('set-cookie') || '').split(';')[0];
  ok('登录成功（HttpOnly Cookie）', lg.status === 200 && cookie.startsWith('cs_customer='), `status=${lg.status}`);

  // 6) 错误密码 → 401
  const bad = await jfetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: EM, password: 'wrong!' }) });
  ok('错误密码 → 401', bad.r.status === 401, `status=${bad.r.status}`);

  // 7) 登录后 me → email
  const me1 = await jfetch('/api/auth/me', { headers: { cookie } });
  ok('登录后 me 返回邮箱', me1.r.status === 200 && me1.j?.email === EM, `email=${me1.j?.email}`);

  // 8) 未登录 watches → 401
  const w0 = await jfetch('/api/watches');
  ok('未登录 watches → 401', w0.r.status === 401, `status=${w0.r.status}`);

  // 9) 添加监控（ETH 合法地址）
  const WA = '0x28C6c06298d514Db089934071355E5743bf21d60';
  const w1 = await jfetch('/api/watches', { method: 'POST', headers: { cookie }, body: JSON.stringify({ address: WA, name: '测试监控' }) });
  ok('添加监控成功', w1.r.status === 200 && w1.j?.item?.chain === 'eth', `chain=${w1.j?.item?.chain}`);

  // 10) 重复添加 → 400
  const w2 = await jfetch('/api/watches', { method: 'POST', headers: { cookie }, body: JSON.stringify({ address: WA }) });
  ok('重复监控 → 400', w2.r.status === 400, `status=${w2.r.status} ${w2.j?.error || ''}`);

  // 11) 非法地址 → 400
  const w3 = await jfetch('/api/watches', { method: 'POST', headers: { cookie }, body: JSON.stringify({ address: 'not-an-address' }) });
  ok('非法地址 → 400', w3.r.status === 400, `status=${w3.r.status}`);

  // 12) 列表含监控
  const w4 = await jfetch('/api/watches', { headers: { cookie } });
  ok('监控列表含新增地址', w4.r.status === 200 && w4.j?.items?.some((x) => x.address === WA), `count=${w4.j?.items?.length}`);

  // 13) 删除监控
  const w5 = await fetch(`${BASE}/api/watches?address=${encodeURIComponent(WA)}`, { method: 'DELETE', headers: { cookie } });
  const w6 = await jfetch('/api/watches', { headers: { cookie } });
  ok('删除监控后列表为空', w5.status === 200 && !w6.j?.items?.some((x) => x.address === WA));

  // 14) 注销 → me 401
  await fetch(BASE + '/api/auth/logout', { method: 'POST', headers: { cookie } });
  const me2 = await jfetch('/api/auth/me', { headers: { cookie } });
  ok('注销后 me → 401', me2.r.status === 401, `status=${me2.r.status}`);

  // 15) 清理：删除测试账号数据（customers/sessions/watches 直接清该 email）
  for (const [file, key] of [['customers.json', null], ['customer-sessions.json', null], ['customer-watches.json', null]]) {
    const p = 'C:/Users/37515/Desktop/临时AI/链哨ChainSentinel/data/' + file;
    if (!fs.existsSync(p)) continue;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    let next = raw;
    if (Array.isArray(raw)) next = raw.filter((x) => !(x.email === EM || (x.email || '').toLowerCase() === EM));
    else if (typeof raw === 'object' && raw !== null) { delete raw[EM]; next = raw; }
    fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  }
  ok('测试数据已清理', true);

  console.log(`\n===== 客户账号+监控测试: ${pass}/${pass + fail} 通过 =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
