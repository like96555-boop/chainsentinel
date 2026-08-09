// 链哨 · 外部威胁情报同步引擎（可插拔数据源）
// 用法：node scripts/intel-sync.mjs [sourceName]
// 源适配器：tronscan（需 env TRONSCAN_API_KEY，免费注册：tronscan.org → API 申请）
// 同步结果写入 data/blacklist.json，来源统一标注 external-intel
// 合规：仅接入许可明确的源；地址/标签为事实数据，仍需按各源条款使用
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLACKLIST_PATH = path.join(__dirname, '..', 'data', 'blacklist.json');

function readBlacklist() {
  try {
    if (fs.existsSync(BLACKLIST_PATH)) {
      const raw = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.items)) return raw.items;
    }
  } catch { /* ignore */ }
  return [];
}

function writeBlacklist(items) {
  const tmp = BLACKLIST_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ items, updatedAt: Date.now() }, null, 2), 'utf8');
  fs.renameSync(tmp, BLACKLIST_PATH);
}

// ── 源适配器注册表 ──────────────────────────────
const SOURCES = {
  tronscan: {
    name: 'TRONSCAN 官方标签',
    needsKey: true,
    // TRONSCAN API：https://apilist.tronscanapi.com/api/token_blacklist 或账户标签接口
    // 需 free API key（请求头 TRON-PRO-API-KEY），接口形态以注册后实测为准
    async fetch(key) {
      const res = await fetch('https://apilist.tronscanapi.com/api/accountv2?address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', {
        headers: { 'User-Agent': 'chainsentinel-intel/1.0', 'TRON-PRO-API-KEY': key },
      });
      if (res.status === 401) throw new Error('TRONSCAN API key 无效或未授权');
      if (!res.ok) throw new Error(`TRONSCAN HTTP ${res.status}`);
      const j = await res.json();
      // 单地址标签探测（生产版：遍历标签云接口批量拉取风险地址）
      const tags = (j.addressTag || []).map((t) => String(t));
      return tags.length ? [{ address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', chain: 'tron', label: `TRONSCAN 标签: ${tags.join('/')}`, type: 'phishing', notes: '来自 TRONSCAN 官方标签（情报源自动同步）' }] : [];
    },
  },
};

async function run() {
  const want = process.argv[2] || 'tronscan';
  const src = SOURCES[want];
  if (!src) { console.error(`未知数据源: ${want}（可用: ${Object.keys(SOURCES).join(', ')}）`); process.exit(1); }

  console.log(`▶ 数据源: ${src.name}`);
  if (src.needsKey && !process.env.TRONSCAN_API_KEY) {
    console.log('⚠️ 未配置 TRONSCAN_API_KEY（免费注册：tronscan.org → API → 申请 Key）');
    console.log('   配置方式：设置环境变量后重跑，或加进 .env');
    process.exit(2);
  }

  try {
    const rows = await src.fetch(process.env.TRONSCAN_API_KEY);
    if (!rows.length) { console.log('✓ 同步完成：本次无新增风险地址'); return; }
    const items = readBlacklist();
    const existing = new Set(items.map((b) => b.address));
    let added = 0;
    for (const r of rows) {
      if (existing.has(r.address)) continue;
      items.push({ id: `intel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ...r, source: 'external-intel', level: 'red' });
      existing.add(r.address);
      added++;
    }
    if (added) writeBlacklist(items);
    console.log(`✓ 同步完成：新增 ${added} 条（黑名单现有 ${items.length} 条），来源=external-intel`);
  } catch (e) {
    console.error(`❌ 同步失败: ${e.message}`);
    process.exit(1);
  }
}

run();
