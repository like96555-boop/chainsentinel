// 链哨 · 专业税务核算报告构建（参考香港会计师/税务师报告惯例，可直接作草稿交专业人士）
// 覆盖：报告编号/期间/编制声明/执行摘要/方法依据/审计联动发现/明细底稿/签署栏
import { readBlacklist } from './blacklist';
import type { TaxResult, DisposalDetail } from './tax';

export interface ReportMeta {
  clientName: string;
  preparedBy?: string; // 编制人（默认 ChainSentinel）
}

export interface TaxReport {
  reportId: string;
  reportTitle: string;
  preparedDate: string;
  period: { from: string; to: string };
  clientName: string;
  preparedBy: string;
  basis: string[];
  summary: {
    method: string;
    methodZh: string;
    disposalCount: number;
    realizedPnl: number;
    income: number;
    auditFlagCount: number;
  }[];
  auditFindings: {
    date: string;
    symbol: string;
    typeZh: string;
    qty: number;
    proceeds: number;
    cost: number;
    pnl: number;
    counterparty: string;
    label: string;
    source: string;
  }[];
  byYear: { year: number; realizedPnl: number; income: number }[];
  detailsByMethod: { method: string; details: DisposalDetail[] }[];
  disclaimer: string;
  certification: string[];
}

/** 生成报告编号：CS-TX-YYYYMMDD-XXXX */
function genReportId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CS-TX-${ymd}-${rand}`;
}

const METHOD_ZH: Record<string, string> = { fifo: '先进先出法（FIFO）', lifo: '后进先出法（LIFO）', hifo: '高成本先出法（HIFO）' };

export function buildTaxReport(results: TaxResult[], meta: ReportMeta): TaxReport {
  const allDates = results.flatMap((r) => r.details.map((d) => d.date)).filter(Boolean).sort();
  const period = {
    from: allDates[0] || '',
    to: allDates[allDates.length - 1] || '',
  };

  // 审计联动发现：FIFO 口径下命中黑名单的对手方明细（含标签与来源）
  const blacklist = readBlacklist();
  const blMap = new Map(blacklist.map((b) => [b.address, b]));
  const fifo = results.find((r) => r.method === 'fifo');
  const auditFindings: TaxReport['auditFindings'] = [];
  if (fifo) {
    for (const d of fifo.details) {
      if (d.auditFlag && d.counterparty) {
        const hit = blMap.get(d.counterparty);
        auditFindings.push({
          date: d.date,
          symbol: d.symbol,
          typeZh: d.type === 'spend' ? '支付（视同处置）' : '卖出/转让',
          qty: d.qty,
          proceeds: d.proceeds,
          cost: d.cost,
          pnl: d.pnl,
          counterparty: d.counterparty,
          label: hit?.label || '风险标签',
          source: hit?.source || '未知',
        });
      }
    }
  }

  return {
    reportId: genReportId(),
    reportTitle: '虚拟资产税务核算报告（处置收益测算）',
    preparedDate: new Date().toISOString().slice(0, 10),
    period,
    clientName: meta.clientName || '未填写（请补全客户名称）',
    preparedBy: meta.preparedBy || 'ChainSentinel Limited（自动核算）',
    basis: [
      '本报告依据《税务条例》第 112 章及税务局 DIPN 59（数码资产）对虚拟资产按"财产"对待的处置收益核算口径编制。',
      '成本基准分别按先进先出法（FIFO）、后进先出法（LIFO）、高成本先出法（HIFO）测算，供持牌税务师结合客户实际情况选定适用口径。',
      '质押/空投/挖矿等收入按取得当日公允市值（FMV）计入成本基准，并单独列示收入金额。',
      '本报告仅提供计算过程与结果数据，不构成税务意见；最终申报口径以持牌税务师意见为准。',
    ],
    summary: results.map((r) => ({
      method: r.method,
      methodZh: METHOD_ZH[r.method] || r.method,
      disposalCount: r.details.length,
      realizedPnl: r.totals.realizedPnl,
      income: r.totals.income,
      auditFlagCount: r.auditFlagCount,
    })),
    auditFindings,
    byYear: results.find((r) => r.method === 'fifo')?.byYear || [],
    detailsByMethod: results.map((r) => ({ method: r.method, details: r.details })),
    disclaimer:
      '核算结果仅为计算数据，不构成税务意见、法律意见或投资建议；重大事项请咨询持牌税务师及律师。数据来源为用户提供的交易流水及公开链上数据，未经验证的用户数据可能影响结果准确性。',
    certification: [
      '编制人：________________（ChainSentinel 自动核算）',
      '复核人：________________（持牌会计师/税务师签署）',
      '签署日期：____________',
    ],
  };
}
