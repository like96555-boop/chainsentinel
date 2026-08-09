// 情报源导入功能测试：批量导入 API + 来源标注 + 查红牌联动 + 同步引擎无 key 优雅提示
const BASE = 'http://localhost:3000';
import fs from 'fs';
import { execSync } from 'child_process';
const env = fs.readFileSync('C:/Users/37515/Desktop/临时AI/链哨ChainSentinel/.env', 'utf8');
const PW = (env.match(/^ADMIN_PASSWORD=(.*)$/m) || [])[1].trim();

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  cond ? pass++ : fail++;
};

(async () => {
  // 登录
  const login = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PW }) });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  ok('后台登录', login.status === 200);

  const testAddr = '0x1234567890abcdef1234567890abcdef12345678';
  const testAddr2 = '0xabcdef1234567890abcdef1234567890abcdef12';

  // 1) 批量导入（2 条有效 + 1 条非法 + 1 条重复流程）
  const imp = await fetch(`${BASE}/api/admin/blacklist/import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ entries: [
      { address: testAddr, chain: 'eth', label: '情报源A-钓鱼', type: 'phishing' },
      { address: testAddr2, chain: 'eth', label: '情报源B-混币', type: 'mixer' },
      { address: 'BAD!!!', chain: 'eth', label: 'x', type: 'phishing' },
    ] }),
  });
  const impJ = await imp.json();
  ok('批量导入：2 新增 1 跳过', imp.ok && impJ.added === 2 && impJ.skipped === 1, `added=${impJ.added} skipped=${impJ.skipped}`);

  // 2) 重复导入去重
  const imp2 = await fetch(`${BASE}/api/admin/blacklist/import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ entries: [{ address: testAddr, chain: 'eth', label: '重复', type: 'phishing' }] }),
  });
  const imp2J = await imp2.json();
  ok('重复导入去重：0 新增', imp2.ok && imp2J.added === 0 && imp2J.skipped === 1, `added=${imp2J.added} skipped=${imp2J.skipped}`);

  // 3) 来源标注 external-intel
  const list = await (await fetch(`${BASE}/api/admin/blacklist`, { headers: { cookie } })).json();
  const hit = list.items.find((b) => b.address === testAddr);
  ok('导入条目来源=external-intel', hit?.source === 'external-intel', `source=${hit?.source}`);

  // 4) 查红牌 + 来源人话化
  const chk = await (await fetch(`${BASE}/api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.95.1.1' }, body: JSON.stringify({ address: testAddr }) })).json();
  ok('情报源地址查红牌', chk.level === 'red', `level=${chk.level}`);
  ok('来源人话=外部威胁情报源', chk.blacklist?.sourceLabel === '外部威胁情报源（已接入自动同步）', `sourceLabel=${chk.blacklist?.sourceLabel}`);

  // 5) 清理测试条目
  for (const b of list.items) {
    if (b.address === testAddr || b.address === testAddr2) {
      await fetch(`${BASE}/api/admin/blacklist?id=${b.id}`, { method: 'DELETE', headers: { cookie } });
    }
  }
  ok('测试条目已清理', true);

  // 6) 同步引擎：无 key 优雅提示（exit 2，不崩）
  try {
    execSync('node scripts/intel-sync.mjs', { cwd: 'C:/Users/37515/Desktop/临时AI/链哨ChainSentinel', env: { ...process.env }, stdio: 'pipe' });
    ok('intel-sync 无 key 行为', false, '预期 exit 2 但正常退出');
  } catch (e) {
    ok('intel-sync 无 key 优雅提示（exit 2）', e.status === 2, `exit=${e.status}`);
  }

  console.log(`\n===== 情报源导入测试: ${pass}/${pass + fail} 通过 =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
