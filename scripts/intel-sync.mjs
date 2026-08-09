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
const TRONGRID = 'https://api.trongrid.io';
const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

async function tgGet(path, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(TRONGRID + path, { signal: AbortSignal.timeout(12000) });
      if (r.status === 429) { await new Promise((s) => setTimeout(s, 2000 * (i + 1))); continue; }
      return await r.json();
    } catch (e) { if (i === retries - 1) throw e; await new Promise((s) => setTimeout(s, 1500)); }
  }
  return null;
}

const SOURCES = {
  // 链上启发式（无 key，免费）：从 USDT 合约真实转账流提取高频参与地址
  // 风控纪律：仅作「特征观察」进警示榜（writeTo: alerts），不进黑名单红牌——
  // 高频参与是中性特征，不能构成风险定性；红牌只由已确认事件（public-record / 官方情报）支撑
  'heuristic-tron': {
    name: '链上启发式（TRON USDT 高频特征）',
    needsKey: false,
    writeTo: 'alerts',
    async fetch() {
      const buckets = [];
      for (const order of ['block_timestamp,desc', 'value,desc']) {
        const j = await tgGet(`/v1/accounts/${USDT}/transactions/trc20?limit=50&order_by=${order}&only_confirmed=true`);
        if (j && j.data) buckets.push(...j.data.map((t) => ({ to: t.to, from: t.from, value: t.value })));
      }
      const agg = new Map();
      for (const t of buckets) {
        for (const addr of [t.to, t.from]) {
          if (!addr || addr === USDT) continue;
          const e = agg.get(addr) || { address: addr, tx: 0 };
          e.tx++;
          agg.set(addr, e);
        }
      }
      const rows = [...agg.values()]
        .filter((e) => e.tx >= 4) // 高频参与（单日多笔）
        .sort((a, b) => b.tx - a.tx)
        .slice(0, 10)
        .map((e) => ({
          address: e.address,
          chain: 'tron',
          type: 'laundering',
          firstSeen: new Date().toISOString(),
          txCount: e.tx,
          notes: `特征观察（${e.tx} 笔 USDT 参与，抽样自合约近期转账流，TronGrid 可复核）。非官方定性，仅为风险提示。`,
          source: 'onchain-heuristic',
        }));
      return rows;
    },
  },
  tronscan: {
    name: 'TRONSCAN 官方标签',
    needsKey: true,
    writeTo: 'blacklist',
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
  // OFAC SDN 制裁名单（美国政府官方公开数据，Public Domain，零申请）
  // 数据形态：vile/ofac-sdn-list 每日同步 OFAC 官方名单并发布 JSON（GitHub Release，原始数据仍为 OFAC 官方）
  // 下载走 GitHub 官方 Release 通道（大陆网络可达）；香港 ECS 部署后亦可直连 OFAC 官方服务
  ofac: {
    name: 'OFAC SDN 制裁名单（美国财政部）',
    needsKey: false,
    writeTo: 'blacklist',
    async fetch() {
      // 1) 最新 release（网络抖动重试 2 次）
      let rel = null;
      for (let i = 0; i < 3 && !rel; i++) {
        try {
          const relRes = await fetch('https://api.github.com/repos/vile/ofac-sdn-list/releases/latest', {
            headers: { 'User-Agent': 'chainsentinel-intel/1.0' },
            signal: AbortSignal.timeout(20000),
          });
          if (relRes.ok) rel = await relRes.json();
          else if (relRes.status === 403) throw new Error('GitHub API 限流（403），请稍后再试');
          else if (i < 2) await new Promise((s) => setTimeout(s, 3000));
          else throw new Error(`GitHub release 查询失败 HTTP ${relRes.status}`);
        } catch (e) {
          if (i >= 2) throw e;
          await new Promise((s) => setTimeout(s, 3000));
        }
      }
      const asset = (rel.assets || []).find((a) => a.name === 'sdn.json');
      if (!asset) throw new Error('未找到 sdn.json 资产');
      // 2) 下载（网络抖动重试 2 次；全失败则用本地缓存兜底——缓存为上次成功同步的官方数据）
      let j = null;
      let usingCache = false;
      for (let i = 0; i < 3 && !j; i++) {
        try {
          const dl = await fetch(asset.browser_download_url, {
            headers: { 'User-Agent': 'chainsentinel-intel/1.0' },
            signal: AbortSignal.timeout(60000),
            redirect: 'follow',
          });
          if (!dl.ok) throw new Error(`OFAC 数据下载失败 HTTP ${dl.status}`);
          j = await dl.json();
        } catch (e) {
          if (i < 2) await new Promise((s) => setTimeout(s, 3000));
          else {
            // 兜底：读本地缓存（上次成功同步的官方数据）
            const cachePath = path.join(__dirname, '..', 'data', 'ofac-sdn-cache.json');
            if (fs.existsSync(cachePath)) {
              try {
                j = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                usingCache = true;
                console.log(`  ⚠️ 网络下载失败，使用本地缓存（${cachePath}）`);
              } catch {
                throw e; // 缓存损坏则抛出原始错误
              }
            } else {
              throw e;
            }
          }
        }
      }
      // 下载成功后更新缓存（下次网络抖动可兜底）
      if (!usingCache && j) {
        try {
          fs.writeFileSync(path.join(__dirname, '..', 'data', 'ofac-sdn-cache.json'), JSON.stringify(j), 'utf8');
        } catch { /* 缓存写入失败不影响主流程 */ }
      }
      const arr = Array.isArray(j) ? j : (j.addresses || j.entries || []);
      // 3) 类型 → 链映射（TRX/XBT/ETH 直接支持；USDT 按地址格式归链）
      const TYPE_TO_CHAIN = { 'Digital Currency Address - TRX': 'tron', 'Digital Currency Address - XBT': 'btc', 'Digital Currency Address - ETH': 'eth' };
      const rows = [];
      for (const it of arr) {
        const addr = String(it.address || '').trim();
        const type = String(it.type || '');
        if (!addr) continue;
        let chain = TYPE_TO_CHAIN[type];
        if (!chain && type.includes('USDT')) chain = addr.startsWith('T') ? 'tron' : (addr.startsWith('0x') ? 'eth' : null);
        if (!chain) continue; // 仅保留链哨支持的三链
        rows.push({
          address: addr,
          chain,
          label: `OFAC SDN 制裁（${type.replace('Digital Currency Address - ', '')}）`,
          type: 'laundering',
          notes: `美国财政部 OFAC SDN 制裁名单官方地址（来源：ofac.treasury.gov，vile/ofac-sdn-list 镜像同步 ${rel.tag_name}）。制裁实体资产冻结，跨境往来须审慎。`,
          source: 'ofac-sdn',
        });
      }
      return rows;
    },
  },
};

async function run() {
  const want = process.argv[2] || 'heuristic-tron';
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
    if (!rows.length) { console.log('✓ 同步完成：本次无新增条目'); return; }
    const writeTo = src.writeTo || 'blacklist';

    if (writeTo === 'alerts') {
      // 观察条目 → data/alerts.json（纯数组格式，按 address 去重）
      const ALERTS_PATH = path.join(__dirname, '..', 'data', 'alerts.json');
      let items = [];
      try {
        if (fs.existsSync(ALERTS_PATH)) {
          const raw = JSON.parse(fs.readFileSync(ALERTS_PATH, 'utf8'));
          items = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : []);
        }
      } catch { items = []; }
      const existing = new Set(items.map((b) => b.address));
      let added = 0;
      for (const r of rows) {
        if (existing.has(r.address)) continue;
        items.push(r);
        existing.add(r.address);
        added++;
      }
      if (added) {
        const tmp = ALERTS_PATH + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
        fs.renameSync(tmp, ALERTS_PATH);
      }
      console.log(`✓ 同步完成：新增 ${added} 条特征观察（警示榜现有 ${items.length} 条，来源=onchain-heuristic）`);
      return;
    }

    // 已确认情报 → data/blacklist.json
    const items = readBlacklist();
    const existing = new Set(items.map((b) => b.address));
    let added = 0;
    for (const r of rows) {
      if (existing.has(r.address)) continue;
      // 来源标注优先保留适配器自带的（如 ofac-sdn），缺省才用 external-intel
      items.push({ id: `intel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ...r, source: r.source || 'external-intel', level: 'red' });
      existing.add(r.address);
      added++;
    }
    if (added) writeBlacklist(items);
    console.log(`✓ 同步完成：新增 ${added} 条（黑名单现有 ${items.length} 条），来源=${rows[0]?.source || 'external-intel'}`);
  } catch (e) {
    console.error(`❌ 同步失败: ${e.message}`);
    process.exit(1);
  }
}

run();
