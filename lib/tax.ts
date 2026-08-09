// 链哨税表审计 · 核算引擎
// 香港口径：FIFO / LIFO / HIFO 三种成本基准（对应 DIPN 59 对数码资产"财产"对待下
// 的处置盈亏核算口径；具体口径选择由持牌税务师按客户情况定，本引擎提供三种结果供对比）
// 事件类型：
//   buy   买入 → 建立成本基准 lot
//   income 质押/空投/挖矿收入 → 按取得日公允市值(FMV)计入成本基准（DIPN 59：视为收入）
//   sell  卖出/转让 → 匹配 lot 计算已实现盈亏（处置）
//   spend 支付/花费 → 视同处置（DIPN 59：支付即处置，产生盈亏）
// 合规边界：本引擎只输出"计算过程与结果数据"，不构成税务意见。

export type TxType = 'buy' | 'sell' | 'income' | 'spend';

export interface TxRow {
  date: string;        // YYYY-MM-DD
  symbol: string;      // 币种（BTC/ETH/USDT…）
  type: TxType;
  qty: number;         // 数量（正数）
  priceUsd: number;    // 单价 USD（income 为取得日 FMV）
  counterparty?: string; // 对手方地址/交易所（可选，用于审计联动）
}

export type CostMethod = 'fifo' | 'lifo' | 'hifo';

interface Lot {
  qty: number;
  unitCost: number;
  date: string;
}

export interface DisposalDetail {
  date: string;
  symbol: string;
  type: 'sell' | 'spend';
  qty: number;
  proceeds: number;
  cost: number;
  pnl: number;
  counterparty?: string;
  auditFlag?: boolean;
}

export interface SymbolResult {
  symbol: string;
  realizedPnl: number;
  income: number;
  remainingQty: number;
  remainingCost: number;
  disposalCount: number;
}

export interface TaxResult {
  method: CostMethod;
  symbols: SymbolResult[];
  details: DisposalDetail[];
  byYear: { year: number; realizedPnl: number; income: number }[];
  totals: { realizedPnl: number; income: number };
  auditFlagCount: number;
  rowsProcessed: number;
  errors: string[];
}

/** 解析 CSV 文本（表头：date,symbol,type,qty,priceUsd[,counterparty]） */
export function parseCsv(text: string): TxRow[] {
  const rows: TxRow[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  lines.forEach((line, i) => {
    if (i === 0 && /date/i.test(line)) return; // 跳过表头
    const cols = line.split(',').map((c) => c.trim());
    if (cols.length < 5) return;
    const [date, symbol, type, qtyStr, priceStr, counterparty] = cols;
    const qty = Number(qtyStr);
    const price = Number(priceStr);
    if (!date || !symbol || !['buy', 'sell', 'income', 'spend'].includes(type) || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
      rows.push({ date, symbol, type: type as TxType, qty: NaN, priceUsd: NaN, counterparty });
      return;
    }
    rows.push({ date, symbol, type: type as TxType, qty, priceUsd: price, counterparty });
  });
  return rows;
}

/** 单币种 lot 池匹配（成本法内核） */
function matchLots(symbol: string, txs: TxRow[], method: CostMethod): { details: DisposalDetail[]; lots: Lot[]; income: number } {
  const lots: Lot[] = [];
  const details: DisposalDetail[] = [];
  let income = 0;

  for (const tx of txs) {
    if (tx.type === 'buy') {
      lots.push({ qty: tx.qty, unitCost: tx.priceUsd, date: tx.date });
    } else if (tx.type === 'income') {
      income += tx.qty * tx.priceUsd;
      lots.push({ qty: tx.qty, unitCost: tx.priceUsd, date: tx.date });
    } else {
      // sell / spend：按成本法取 lot
      let remaining = tx.qty;
      let cost = 0;
      const usable = lots.filter((l) => l.qty > 1e-9);
      const ordered = [...usable].sort((a, b) => {
        if (method === 'fifo') return a.date.localeCompare(b.date);
        if (method === 'lifo') return b.date.localeCompare(a.date);
        return b.unitCost - a.unitCost || a.date.localeCompare(b.date); // hifo：成本高者先出
      });
      for (const lot of ordered) {
        if (remaining <= 1e-9) break;
        const take = Math.min(lot.qty, remaining);
        cost += take * lot.unitCost;
        lot.qty -= take;
        remaining -= take;
      }
      if (remaining > 1e-9) {
        // 空头（缺 lot）：按处置价格计成本（保守处理并标记）
        cost += remaining * tx.priceUsd;
        details.push({ date: tx.date, symbol, type: tx.type, qty: remaining, proceeds: remaining * tx.priceUsd, cost: remaining * tx.priceUsd, pnl: 0, counterparty: tx.counterparty, auditFlag: false });
      }
      const qty = tx.qty - Math.max(0, remaining);
      if (qty > 1e-9) {
        details.push({
          date: tx.date,
          symbol,
          type: tx.type,
          qty,
          proceeds: qty * tx.priceUsd,
          cost,
          pnl: qty * tx.priceUsd - cost,
          counterparty: tx.counterparty,
        });
      }
      lots.length = 0; // 已按顺序消耗，重建剩余
      for (const l of ordered) if (l.qty > 1e-9) lots.push(l);
    }
  }
  return { details, lots: lots.filter((l) => l.qty > 1e-9), income };
}

/** 主入口：三成本法全量核算 */
export function computeTax(rows: TxRow[], blacklist: string[] = []): TaxResult[] {
  const results: TaxResult[] = [];
  for (const method of ['fifo', 'lifo', 'hifo'] as CostMethod[]) {
    const symbolsMap = new Map<string, TxRow[]>();
    const errors: string[] = [];
    for (const r of rows) {
      if (!Number.isFinite(r.qty) || !Number.isFinite(r.priceUsd)) {
        errors.push(`行数据无效（${r.date} ${r.symbol} ${r.type}）`);
        continue;
      }
      if (!symbolsMap.has(r.symbol)) symbolsMap.set(r.symbol, []);
      symbolsMap.get(r.symbol)!.push(r);
    }
    const symbols: SymbolResult[] = [];
    const details: DisposalDetail[] = [];
    let auditFlagCount = 0;
    for (const [symbol, txs] of symbolsMap) {
      txs.sort((a, b) => a.date.localeCompare(b.date));
      const { details: d, lots, income } = matchLots(symbol, txs, method);
      // 审计联动：对手方命中黑名单 → 标记
      for (const dd of d) {
        if (dd.counterparty && blacklist.includes(dd.counterparty)) {
          dd.auditFlag = true;
          auditFlagCount++;
        }
      }
      const realized = d.reduce((s, x) => s + x.pnl, 0);
      details.push(...d);
      symbols.push({
        symbol,
        realizedPnl: realized,
        income,
        remainingQty: lots.reduce((s, l) => s + l.qty, 0),
        remainingCost: lots.reduce((s, l) => s + l.qty * l.unitCost, 0),
        disposalCount: d.length,
      });
    }
    details.sort((a, b) => a.date.localeCompare(b.date));
    const byYearMap = new Map<number, { realizedPnl: number; income: number }>();
    for (const dd of details) {
      const y = Number(dd.date.slice(0, 4));
      if (!byYearMap.has(y)) byYearMap.set(y, { realizedPnl: 0, income: 0 });
      const e = byYearMap.get(y)!;
      e.realizedPnl += dd.pnl;
    }
    for (const [symbol, txs] of symbolsMap) {
      for (const tx of txs) {
        if (tx.type === 'income') {
          const y = Number(tx.date.slice(0, 4));
          if (!byYearMap.has(y)) byYearMap.set(y, { realizedPnl: 0, income: 0 });
          byYearMap.get(y)!.income += tx.qty * tx.priceUsd;
        }
      }
    }
    results.push({
      method,
      symbols,
      details,
      byYear: [...byYearMap.entries()].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, ...v })),
      totals: { realizedPnl: details.reduce((s, x) => s + x.pnl, 0), income: symbols.reduce((s, x) => s + x.income, 0) },
      auditFlagCount,
      rowsProcessed: rows.length,
      errors,
    });
  }
  return results;
}

/** 导出 CSV（明细底稿，供会计师） */
export function toCsv(results: TaxResult[]): string {
  const lines: string[] = ['成本法,日期,币种,类型,数量,处置收入USD,成本USD,盈亏USD,对手方,审计关注'];
  for (const r of results) {
    for (const d of r.details) {
      lines.push(
        [r.method, d.date, d.symbol, d.type === 'spend' ? '支付' : '卖出', d.qty.toFixed(8), d.proceeds.toFixed(2), d.cost.toFixed(2), d.pnl.toFixed(2), d.counterparty || '', d.auditFlag ? '⚠️是' : ''].join(',')
      );
    }
  }
  return lines.join('\n');
}

/** 生成样例 CSV（引导用户格式） */
export function sampleCsv(): string {
  return [
    'date,symbol,type,qty,priceUsd,counterparty',
    '2024-01-05,BTC,buy,0.5,42000,binance',
    '2024-03-10,BTC,buy,0.5,68000,okx',
    '2024-06-15,BTC,sell,0.4,61000,binance',
    '2024-09-01,ETH,income,1.2,2400,ledger-staking',
    '2024-11-20,ETH,sell,1.2,3100,okx',
    '2025-02-14,BTC,spend,0.2,96000,TB3jHk9QvXcZx1sDq3VpLbYtWmNfKdR2aU',
    '2025-04-01,USDT,buy,500,1,binance',
  ].join('\n');
}
