'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AdminTab } from './AdminNav';
import { buildTodos, fmtNum, fmtTime, getJson, type Status, type Todo } from './adminData';
import { Badge, Button, Card, Empty, ErrorNote, Kpi, PageHeader, Td, Th } from './ui';

interface UsageKey {
  id: string;
  name: string;
  enabled: boolean;
  dailyQuota: number;
  usedToday: number;
  totalUsage: number;
  lastUsedAt: number;
}
interface BillingResp {
  usage: {
    keys: UsageKey[];
    totals: { totalUsage: number; todayUsage: number };
    trend: Array<{ date: string; count: number }>;
  };
  orders: unknown[];
}
interface StatsResp {
  watchedAddresses: number;
  blockedTransactions: number;
  riskLabels: number;
}
interface AuditResp {
  logs: Array<{ ts: number; time: string; action: string; detail: string; ip: string }>;
}

interface Activity {
  ts: number;
  time: string;
  event: string;
  target: string;
  result: string;
  tab: AdminTab;
  action: string;
}

interface Props {
  status: Status | null;
  refreshToken: number;
  onNavigate: (t: AdminTab) => void;
}

export default function Overview({ status, refreshToken, onNavigate }: Props) {
  const [billing, setBilling] = useState<BillingResp | null>(null);
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [audit, setAudit] = useState<AuditResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, s, a] = await Promise.allSettled([
      getJson<BillingResp>('/api/admin/billing'),
      getJson<StatsResp>('/api/stats'),
      getJson<AuditResp>('/api/admin/audit'),
    ]);
    const errs: string[] = [];
    if (b.status === 'fulfilled') setBilling(b.value);
    else errs.push('计费与用量数据');
    if (s.status === 'fulfilled') setStats(s.value);
    else errs.push('站点统计数据');
    if (a.status === 'fulfilled') setAudit(a.value);
    else errs.push('操作日志数据');
    setErrors(errs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const todos: Todo[] = useMemo(() => buildTodos(status), [status]);
  const firstTodo = todos[0];
  const trend = billing?.usage.trend || [];
  const trendMax = Math.max(...trend.map((t) => t.count), 0);

  const activities: Activity[] = useMemo(() => {
    const fromAudit: Activity[] = (audit?.logs || []).slice(0, 8).map((l) => ({
      ts: l.ts,
      time: l.time || fmtTime(l.ts),
      event: l.action,
      target: (l.detail || '').slice(0, 42) || '—',
      result: '已记录',
      tab: 'audit',
      action: '查看日志',
    }));
    const fromLeads: Activity[] = (status?.leads || []).slice(0, 5).map((l) => ({
      ts: Date.parse(l.createdAt || '') || 0,
      time: fmtTime(l.createdAt),
      event: '预约线索',
      target: l.name || '—',
      result: l.interest || '—',
      tab: 'customers',
      action: '查看线索',
    }));
    return [...fromAudit, ...fromLeads].sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [audit, status]);

  function exportCsv() {
    const rows: string[][] = [
      ['ChainSentinel 运营总览', new Date().toLocaleString('zh-CN', { hour12: false })],
      [],
      ['指标', '数值'],
      ['今日 API 调用', String(billing?.usage.totals.todayUsage ?? '—')],
      ['累计 API 调用', String(billing?.usage.totals.totalUsage ?? '—')],
      ['累计阻断次数', String(stats?.blockedTransactions ?? '—')],
      ['监控地址', String(stats?.watchedAddresses ?? '—')],
      ['自定义黑名单条数', String(status?.blacklistCount ?? '—')],
      [],
      ['时间', '事件', '对象', '结果'],
      ...activities.map((a) => [a.time, a.event, a.target, a.result]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainsentinel-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="运营总览"
        subtitle={`生意如何 · 要处理什么 · 刚发生什么　|　数据实时读取，更新于 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`}
        action={<Button variant="secondary" onClick={exportCsv}><Download size={14} /> 导出报表</Button>}
      />

      {errors.length > 0 && (
        <ErrorNote text={`部分数据源暂不可用（${errors.join('、')}），对应指标显示为「—」，其余数据不受影响。`} />
      )}

      {/* 待办状态条 */}
      {firstTodo ? (
        <Card className="flex flex-wrap items-center gap-3 px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 text-amber-600" />
          <p className="min-w-0 flex-1 text-[13px] font-medium text-amber-800">
            {firstTodo.title}
            {todos.length > 1 && <span className="ml-2 text-[11px] font-normal text-amber-600">另有 {todos.length - 1} 项</span>}
          </p>
          <Button variant="secondary" onClick={() => onNavigate('todos')}>查看全部 <ArrowRight size={13} /></Button>
          <Button variant="primary" onClick={() => onNavigate(firstTodo.tab)}>{firstTodo.action} <ArrowRight size={13} /></Button>
        </Card>
      ) : (
        <Card className="flex items-center gap-3 px-4 py-3">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <p className="flex-1 text-[13px] text-zinc-700">当前无待处理事项 · 服务与配置状态正常</p>
          <span className="text-[11px] text-zinc-400">运行时长 {Math.floor((status?.uptimeSec || 0) / 60)} 分钟</span>
        </Card>
      )}

      {/* KPI —— 全部来自真实数据源 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="今日 API 调用" value={fmtNum(billing?.usage.totals.todayUsage)} hint="按日账本累计 · 免费层不计入" loading={loading} />
        <Kpi label="累计 API 调用" value={fmtNum(billing?.usage.totals.totalUsage)} hint={`活跃令牌 ${billing?.usage.keys.length ?? '—'} 个`} loading={loading} />
        <Kpi label="累计阻断次数" value={fmtNum(stats?.blockedTransactions)} hint="命中风险后阻断的累计次数" loading={loading} />
        <Kpi label="监控地址" value={fmtNum(stats?.watchedAddresses)} hint={`风险标签 ${fmtNum(stats?.riskLabels)} · 自定义名单 ${fmtNum(status?.blacklistCount)} 条`} loading={loading} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        {/* 近 7 天真实调用趋势 */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-zinc-900">近 7 天 API 调用</h2>
            <Badge tone="blue">按日账本真实数据</Badge>
          </div>
          {loading ? (
            <div className="mt-6 h-[130px] animate-pulse rounded-lg bg-zinc-50" />
          ) : trendMax === 0 ? (
            <Empty text="近 7 天暂无调用记录" />
          ) : (
            <>
              <div className="mt-6 flex h-[130px] items-end gap-2">
                {trend.map((d) => (
                  <div key={d.date} className="group flex h-full flex-1 flex-col justify-end" title={`${d.date} · ${d.count} 次`}>
                    <div
                      className="w-full rounded-t bg-blue-500 transition group-hover:bg-blue-700"
                      style={{ height: `${Math.max(3, (d.count / trendMax) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                {trend.map((d) => (
                  <span key={d.date} className="flex-1 text-center font-mono text-[10px] text-zinc-400">
                    {d.date.slice(5)}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-zinc-500">
                峰值 {fmtNum(trendMax)} 次 / 天 · 合计 {fmtNum(trend.reduce((a, b) => a + b.count, 0))} 次
              </p>
            </>
          )}
        </Card>

        {/* 数据口径：不画没有真实来源的风险分布 */}
        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-zinc-900">判定口径与覆盖边界</h2>
          <div className="mt-4 space-y-2.5 text-[12px] text-zinc-600">
            <div className="flex justify-between"><span>内置名单</span><span className="font-mono text-zinc-900">908 条</span></div>
            <div className="flex justify-between"><span>OFAC SDN / 公开记录</span><span className="font-mono text-zinc-900">906 + 2</span></div>
            <div className="flex justify-between"><span>BTC / TRON / ETH</span><span className="font-mono text-zinc-900">528 / 276 / 104</span></div>
            <div className="flex justify-between"><span>自定义黑名单</span><span className="font-mono text-zinc-900">{fmtNum(status?.blacklistCount)} 条</span></div>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
            <p>· green 不是清白证明，仅代表本次检查未见命中。</p>
            <p>· 无实体归因、多跳资金追踪、完整 KYT 报告。</p>
            <p>· 付费层为 TRON USDT 预付，非官方 x402 facilitator。</p>
          </div>
          <button onClick={() => onNavigate('discovery')} className="mt-3 text-[11px] font-medium text-blue-600 hover:underline">
            查看发现层契约与自检 →
          </button>
        </Card>
      </div>

      {/* 最近活动：真实审计日志 + 预约线索 */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-zinc-900">最近活动</h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400">操作日志 + 预约线索 · 按时间倒序</span>
            <button onClick={() => onNavigate('audit')} className="text-[11px] font-medium text-blue-600 hover:underline">查看全部 →</button>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-zinc-50" />)}
          </div>
        ) : activities.length === 0 ? (
          <Empty text="暂无操作日志与线索" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70"><Th>时间</Th><Th>事件</Th><Th>对象</Th><Th>结果</Th><Th>操作</Th></tr></thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={`${a.ts}-${i}`} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                    <Td className="whitespace-nowrap font-mono text-[11px] text-zinc-500">{a.time}</Td>
                    <Td className="font-medium">{a.event}</Td>
                    <Td className="max-w-[280px] truncate text-zinc-500">{a.target}</Td>
                    <Td><Badge tone={a.event === '预约线索' ? 'blue' : 'neutral'}>{a.result}</Badge></Td>
                    <Td>
                      <button onClick={() => onNavigate(a.tab)} className="text-[11px] font-medium text-blue-600 hover:underline">
                        {a.action} →
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-zinc-100 px-5 py-2.5 text-[10px] text-zinc-400">
          每行操作就地跳转对应模块；无匹配结果时保留空状态引导，不跳出当前筛选。
        </p>
      </Card>
    </div>
  );
}
