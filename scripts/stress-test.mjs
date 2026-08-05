/**
 * 压力测试脚本：
 *  ① /api/check 串行预热 ×2 → 50 并发 × 4 批 = 200 请求（同一 IP，预期大量 429 = 限流生效特性）
 *  ② 首页 GET 100 并发
 *  ③ 压测前后经 /api/health 记录服务进程内存，验证无异常飙升
 *  ④ 等 61 秒验证限流窗口恢复（再发 1 次应 200）
 * 用法：node scripts/stress-test.mjs
 * 产出：控制台数据表 + test-reports/stress-*.md
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const STRESS_IP = `10.30.${Math.floor(Math.random() * 250) + 1}.1`; // 每次运行随机，避免跨运行限流窗口残留
const USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function health() {
  const res = await fetch(`${BASE}/api/health`);
  return res.json();
}

async function checkOnce() {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': STRESS_IP },
      body: JSON.stringify({ address: USDT }),
    });
    const ms = performance.now() - t0;
    try { await res.body?.cancel(); } catch { /* noop */ }
    return { status: res.status, ms };
  } catch (e) {
    return { status: 0, ms: performance.now() - t0, error: e.message };
  }
}

async function main() {
  console.log(`\n=== 链哨 ChainSentinel 压力测试 @ ${new Date().toISOString()} ===\n`);

  // 压测前内存
  const before = await health();
  console.log(`压测前服务状态：uptime=${before.uptime}s rss=${before.memoryRssMb}MB`);

  // ── ① /api/check：预热 + 200 并发冲击 ─────────────────────────
  console.log('\n[1/4] /api/check 串行预热 ×2 …');
  for (let i = 0; i < 2; i++) {
    const w = await checkOnce();
    console.log(`  预热 ${i + 1}: HTTP ${w.status} ${Math.round(w.ms)}ms`);
  }

  console.log('[2/4] /api/check 50 并发 × 4 批 = 200 请求 …');
  const all = [];
  for (let batch = 0; batch < 4; batch++) {
    const t0 = performance.now();
    const rs = await Promise.all(Array.from({ length: 50 }, () => checkOnce()));
    all.push(...rs);
    const ok200 = rs.filter((r) => r.status === 200).length;
    const ok429 = rs.filter((r) => r.status === 429).length;
    console.log(`  批次 ${batch + 1}: ${Math.round(performance.now() - t0)}ms | 200×${ok200} 429×${ok429}`);
  }

  const s200 = all.filter((r) => r.status === 200);
  const s429 = all.filter((r) => r.status === 429);
  const sOther = all.filter((r) => r.status !== 200 && r.status !== 429);
  const lat200 = s200.map((r) => Math.round(r.ms)).sort((a, b) => a - b);
  const lat429 = s429.map((r) => Math.round(r.ms)).sort((a, b) => a - b);
  const checkStats = {
    total: all.length,
    inLimitSuccess: s200.length,
    rateLimited: s429.length,
    other: sOther.length,
    p50: percentile(lat200, 50),
    p95: percentile(lat200, 95),
    p50_429: percentile(lat429, 50),
  };

  // ── ② 首页 100 并发 ───────────────────────────────────────────
  console.log('[3/4] 首页 GET 100 并发 …');
  const t0 = performance.now();
  const homeRs = await Promise.all(
    Array.from({ length: 100 }, async () => {
      const t = performance.now();
      try {
        const res = await fetch(`${BASE}/`);
        await res.text();
        return { status: res.status, ms: performance.now() - t };
      } catch {
        return { status: 0, ms: performance.now() - t };
      }
    })
  );
  const homeTotal = Math.round(performance.now() - t0);
  const homeOk = homeRs.filter((r) => r.status === 200);
  const homeLat = homeOk.map((r) => Math.round(r.ms)).sort((a, b) => a - b);
  const homeStats = {
    total: homeRs.length,
    success: homeOk.length,
    successRate: ((homeOk.length / homeRs.length) * 100).toFixed(1),
    p50: percentile(homeLat, 50),
    p95: percentile(homeLat, 95),
    wallMs: homeTotal,
  };

  // 压测后内存
  const after = await health();
  console.log(`压测后服务状态：uptime=${after.uptime}s rss=${after.memoryRssMb}MB`);
  const memDelta = after.memoryRssMb - before.memoryRssMb;
  const memOk = memDelta < 200; // 200MB 以内视为正常波动

  // ── ④ 限流恢复验证（61 秒窗口） ────────────────────────────────
  console.log('[4/4] 等待 61 秒验证限流窗口恢复 …');
  await new Promise((r) => setTimeout(r, 61_000));
  const recover = await checkOnce();
  const recoverOk = recover.status === 200;

  // ── 数据表 ────────────────────────────────────────────────────
  console.log('\n========== 压测数据表 ==========');
  console.log('【/api/check 200 并发冲击（同一 IP，限流 10 次/分）】');
  console.log(`  总请求            : ${checkStats.total}`);
  console.log(`  限流内成功 (200)  : ${checkStats.inLimitSuccess}`);
  console.log(`  被限流 (429)      : ${checkStats.rateLimited}（限流生效特性，非缺陷）`);
  console.log(`  其他异常          : ${checkStats.other}${sOther.length ? ' → ' + JSON.stringify(sOther.slice(0, 3)) : ''}`);
  console.log(`  200 延迟 p50/p95  : ${checkStats.p50}ms / ${checkStats.p95}ms`);
  console.log(`  429 延迟 p50      : ${checkStats.p50_429}ms（拒绝成本极低）`);
  console.log('【首页 100 并发】');
  console.log(`  成功率            : ${homeStats.successRate}%（${homeStats.success}/${homeStats.total}）`);
  console.log(`  延迟 p50/p95      : ${homeStats.p50}ms / ${homeStats.p95}ms`);
  console.log(`  批次总耗时        : ${homeStats.wallMs}ms`);
  console.log('【稳定性】');
  console.log(`  服务内存          : ${before.memoryRssMb}MB → ${after.memoryRssMb}MB（Δ${memDelta >= 0 ? '+' : ''}${memDelta}MB）${memOk ? ' 无异常飙升' : ' ⚠️ 异常'}`);
  console.log(`  限流 61s 后恢复   : HTTP ${recover.status} ${recoverOk ? '✅ 恢复为 200' : '❌ 未恢复'}`);

  const allOk =
    checkStats.other === 0 &&
    checkStats.inLimitSuccess > 0 &&
    checkStats.rateLimited > 0 &&
    homeOk.length === homeRs.length &&
    memOk &&
    recoverOk;

  const dir = path.join(process.cwd(), 'test-reports');
  fs.mkdirSync(dir, { recursive: true });
  const md = [
    `# 压力测试报告 — ${new Date().toISOString()}`,
    '',
    `目标：${BASE}（本地生产模式 npm start）`,
    '',
    '## /api/check 50 并发 × 4 批（同一 IP，限流 10 次/分/IP）',
    '',
    '| 指标 | 数值 |',
    '|---|---|',
    `| 总请求 | ${checkStats.total} |`,
    `| 限流内成功 (200) | ${checkStats.inLimitSuccess} |`,
    `| 被限流 (429) | ${checkStats.rateLimited}（限流生效特性，非缺陷） |`,
    `| 其他异常 | ${checkStats.other} |`,
    `| 200 延迟 p50 | ${checkStats.p50}ms |`,
    `| 200 延迟 p95 | ${checkStats.p95}ms |`,
    `| 429 延迟 p50 | ${checkStats.p50_429}ms |`,
    '',
    '## 首页 GET 100 并发',
    '',
    '| 指标 | 数值 |',
    '|---|---|',
    `| 成功率 | ${homeStats.successRate}%（${homeStats.success}/${homeStats.total}） |`,
    `| p50 | ${homeStats.p50}ms |`,
    `| p95 | ${homeStats.p95}ms |`,
    `| 批次总耗时 | ${homeStats.wallMs}ms |`,
    '',
    '## 稳定性',
    '',
    '| 指标 | 数值 |',
    '|---|---|',
    `| 服务内存 前→后 | ${before.memoryRssMb}MB → ${after.memoryRssMb}MB（Δ${memDelta}MB） |`,
    `| 限流窗口 61s 后恢复 | HTTP ${recover.status} |`,
    '',
    `**总体结论：${allOk ? '✅ 通过' : '❌ 存在异常'}**`,
  ].join('\n');
  const file = path.join(dir, `stress-${Date.now()}.md`);
  fs.writeFileSync(file, md, 'utf8');
  console.log(`\n报告已保存：${file}`);
  console.log(`\n=== 压测总体：${allOk ? '✅ 通过' : '❌ 存在异常'} ===\n`);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error('压测脚本异常：', e.message);
  process.exit(1);
});
