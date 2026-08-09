// 税表审计 · 核算引擎对照测试（手算预期值）
// 数据设计：BTC 两笔买入（42000/68000）+ 卖出 + 支付；ETH 质押收入 + 卖出；USDT 买入
// 预期值由 FIFO/LIFO/HIFO 手算得出（见注释）
const BASE = process.env.BASE || 'http://localhost:3000';

const CSV = `date,symbol,type,qty,priceUsd,counterparty
2024-01-05,BTC,buy,0.5,42000,binance
2024-03-10,BTC,buy,0.5,68000,okx
2024-06-15,BTC,sell,0.4,61000,binance
2024-09-01,ETH,income,1.2,2400,ledger-staking
2024-11-20,ETH,sell,1.2,3100,okx
2025-02-14,BTC,spend,0.2,96000,1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
2025-04-01,USDT,buy,500,1,binance
BADLINE,XXX,sell,abc,zzz,none`;

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = Math.abs(got - want) < 0.01;
  console.log(`${ok ? '✅' : '❌'} ${name} — 实际=${got} 期望=${want}`);
  ok ? pass++ : fail++;
};
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
  cond ? pass++ : fail++;
};

(async () => {
  const res = await fetch(`${BASE}/api/tax/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.97.1.1' },
    body: JSON.stringify({ csv: CSV }),
  });
  const j = await res.json();
  ok('接口 HTTP 200', res.status === 200, `HTTP ${res.status}`);
  ok('解析 8 行（含 1 无效行）', j.rows === 8, `rows=${j.rows}`);
  ok('返回三种成本法', j.results?.length === 3, `methods=${j.results?.map((r) => r.method).join('/')}`);
  ok('无效行进入 errors', j.results[0]?.errors?.length >= 1, `errors=${j.results[0]?.errors?.join(';')}`);

  const fifo = j.results.find((r) => r.method === 'fifo');
  const lifo = j.results.find((r) => r.method === 'lifo');
  const hifo = j.results.find((r) => r.method === 'hifo');

  // FIFO：BTC 卖出 0.4@61000 成本 0.4×42000=16800 → +7600；
  //       支付 0.2@96000 成本 0.1×42000+0.1×68000=11000 → +8200；ETH +840
  eq('FIFO 已实现盈亏总额', fifo.totals.realizedPnl, 7600 + 8200 + 840);
  eq('FIFO 收入总额（质押/空投）', fifo.totals.income, 2880);
  eq('FIFO 2024 年已实现', fifo.byYear.find((y) => y.year === 2024).realizedPnl, 7600 + 840);
  eq('FIFO 2024 年收入', fifo.byYear.find((y) => y.year === 2024).income, 2880);
  eq('FIFO 2025 年已实现', fifo.byYear.find((y) => y.year === 2025).realizedPnl, 8200);
  const btcFifo = fifo.symbols.find((s) => s.symbol === 'BTC');
  eq('FIFO BTC 剩余持仓（0.5+0.5-0.4-0.2=0.4）', btcFifo.remainingQty, 0.4);
  eq('FIFO BTC 剩余成本基准（0.4×68000=27200）', btcFifo.remainingCost, 27200);

  // LIFO：卖出 0.4 取 B lot（成本 0.4×68000=27200）→ -2800；支付取 B 0.1+A 0.1 → +8200；ETH +840
  eq('LIFO 已实现盈亏总额', lifo.totals.realizedPnl, -2800 + 8200 + 840);
  const btcLifo = lifo.symbols.find((s) => s.symbol === 'BTC');
  eq('LIFO BTC 剩余成本基准（0.4×42000=16800）', btcLifo.remainingCost, 16800);

  // HIFO：最高成本先出 → 与 LIFO 同口径结果一致（本数据集）
  eq('HIFO 已实现盈亏总额', hifo.totals.realizedPnl, -2800 + 8200 + 840);

  // 审计联动：spend 对手方命中黑名单种子
  ok('审计关注标记（黑名单对手方）', fifo.auditFlagCount >= 1 && fifo.details.some((d) => d.auditFlag && d.counterparty === '1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX'), `flag=${fifo.auditFlagCount}`);

  // 非法输入
  const bad = await fetch(`${BASE}/api/tax/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.97.1.2' },
    body: JSON.stringify({ csv: 'not-a-csv' }),
  });
  ok('非法 CSV 返回 400', bad.status === 400, `HTTP ${bad.status}`);
  const empty = await fetch(`${BASE}/api/tax/compute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.97.1.3' },
    body: JSON.stringify({}),
  });
  ok('空请求返回 400', empty.status === 400, `HTTP ${empty.status}`);

  console.log(`\n===== 税表审计测试: ${pass}/${pass + fail} 通过 =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
