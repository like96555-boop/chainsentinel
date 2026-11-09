'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Power, Trash2, ArrowRight } from 'lucide-react';
import type { AdminTab } from './AdminNav';
import { DISCOVERY_ENDPOINTS, fmtNum, fmtTime, getJson } from './adminData';
import { Badge, Button, Card, Empty, ErrorNote, Kpi, PageHeader, Td, Th } from './ui';

type Mode = 'usage' | 'discovery';

interface UsageKey {
  id: string;
  name: string;
  maskedKey: string;
  enabled: boolean;
  plan: string;
  dailyQuota: number;
  usedToday: number;
  totalUsage: number;
  lastUsedAt: number;
  createdAt?: number;
  status: string;
}
interface BillingResp {
  usage: {
    keys: UsageKey[];
    totals: { totalUsage: number; todayUsage: number };
    trend: Array<{ date: string; count: number }>;
  };
  orders: unknown[];
}
interface CheckResult {
  path: string;
  label: string;
  note: string;
  ok: boolean;
  status: number;
  ms: number;
}

export default function AgentEcosystem({
  mode,
  refreshToken,
  onNavigate,
}: {
  mode: Mode;
  refreshToken: number;
  onNavigate: (t: AdminTab) => void;
}) {
  if (mode === 'discovery') {
    return <Discovery refreshToken={refreshToken} onNavigate={onNavigate} />;
  }
  return <Usage refreshToken={refreshToken} onNavigate={onNavigate} />;
}

/* ------------------------------------------------------------------ */
/* 调用与用量                                                          */
/* ------------------------------------------------------------------ */
function Usage({ refreshToken, onNavigate }: { refreshToken: number; onNavigate: (t: AdminTab) => void }) {
  const [data, setData] = useState<BillingResp | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getJson<BillingResp>('/api/admin/billing'));
      setError('');
    } catch {
      setError('用量账本读取失败，指标显示为「—」。');
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  const keys = data?.usage.keys || [];
  const quotaSum = keys.reduce((a, k) => a + (k.dailyQuota || 0), 0);
  const usedSum = keys.reduce((a, k) => a + (k.usedToday || 0), 0);
  const pct = quotaSum > 0 ? Math.min(100, (usedSum / quotaSum) * 100) : null;
  const trend = data?.usage.trend || [];
  const trendMax = Math.max(...trend.map((t) => t.count), 0);

  async function mutate(id: string, action: 'toggle' | 'delete', enabled?: boolean) {
    if (action === 'delete' && !window.confirm('确认吊销该令牌？吊销后使用该令牌的调用会立即失效。')) return;
    setBusyId(id);
    try {
      const res = action === 'delete'
        ? await fetch(`/api/admin/keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        : await fetch('/api/admin/keys', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, enabled }),
          });
      if (!res.ok) setError(`操作失败（HTTP ${res.status}）`);
      else { setError(''); await load(); }
    } catch {
      setError('网络异常，操作未完成。');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="调用与用量"
        subtitle="数据来自按日账本；免费层为零注册调用，不计入令牌额度。"
        action={<Button variant="secondary" onClick={() => onNavigate('keys')}>管理 API 令牌 <ArrowRight size={13} /></Button>}
      />
      {error && <ErrorNote text={error} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="今日调用" value={fmtNum(data?.usage.totals.todayUsage)} hint="所有令牌按日汇总" loading={!data} />
        <Kpi label="累计调用" value={fmtNum(data?.usage.totals.totalUsage)} hint="账本启用以来" loading={!data} />
        <Kpi label="令牌数" value={fmtNum(keys.length)} hint={`启用 ${keys.filter((k) => k.enabled).length} · 停用 ${keys.filter((k) => !k.enabled).length}`} loading={!data} />
        <Kpi label="今日额度使用" value={pct === null ? '未设限' : `${pct.toFixed(1)}%`} hint={pct === null ? '令牌未配置日额度' : `${fmtNum(usedSum)} / ${fmtNum(quotaSum)} 次`} loading={!data} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-zinc-900">近 7 天调用趋势</h2>
            <Badge tone="blue">真实账本</Badge>
          </div>
          {!data ? (
            <div className="mt-6 h-[110px] animate-pulse rounded bg-zinc-50" />
          ) : trendMax === 0 ? (
            <Empty text="近 7 天暂无调用记录" />
          ) : (
            <>
              <div className="mt-6 flex h-[110px] items-end gap-2">
                {trend.map((d) => (
                  <div key={d.date} className="group flex h-full flex-1 flex-col justify-end" title={`${d.date} · ${d.count} 次`}>
                    <div className="w-full rounded-t bg-blue-500 transition group-hover:bg-blue-700" style={{ height: `${Math.max(3, (d.count / trendMax) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                {trend.map((d) => <span key={d.date} className="flex-1 text-center font-mono text-[10px] text-zinc-400">{d.date.slice(5)}</span>)}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-zinc-900">今日额度</h2>
          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="rounded-full bg-blue-600 transition-all" style={{ width: `${pct ?? 0}%` }} />
          </div>
          <p className="mt-3 font-mono text-[20px] text-zinc-900">
            {fmtNum(usedSum)} <span className="text-[13px] text-zinc-400">/ {pct === null ? '不限' : fmtNum(quotaSum)}</span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">按各令牌日额度汇总；额度不足前会向调用方返回 402 与充值指引。</p>
          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
            <p>· 单价 $0.01 / 次 · X-Request-Id 幂等</p>
            <p>· 免费层 30 次/分钟/IP，无需注册</p>
            <p>· 查询明细请到「计费与支付」</p>
          </div>
          <button onClick={() => onNavigate('billing')} className="mt-3 text-[11px] font-medium text-blue-600 hover:underline">查看计费明细 →</button>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-zinc-900">API 令牌</h2>
          <span className="text-[11px] text-zinc-400">创建时间 / 最后使用 / 用量 / 一键停用与吊销</span>
        </div>
        {!data ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-zinc-50" />)}</div>
        ) : keys.length === 0 ? (
          <Empty text="尚未创建 API 令牌" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70"><Th>名称 / 令牌</Th><Th>创建</Th><Th>最后使用</Th><Th>用量 / 日额度</Th><Th>状态</Th><Th>操作</Th></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                    <Td>
                      <p className="font-medium">{k.name || '—'}</p>
                      <p className="font-mono text-[10px] text-zinc-400">{k.maskedKey}</p>
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-zinc-500">{k.createdAt ? fmtTime(k.createdAt).slice(0, 10) : '—'}</Td>
                    <Td className="whitespace-nowrap font-mono text-[11px] text-zinc-500">{k.lastUsedAt ? fmtTime(k.lastUsedAt) : '从未使用'}</Td>
                    <Td className="font-mono text-[11px]">{fmtNum(k.usedToday)} / {k.dailyQuota || '不限'} <span className="text-zinc-400">· 累计 {fmtNum(k.totalUsage)}</span></Td>
                    <Td><Badge tone={k.enabled ? 'green' : 'neutral'}>{k.enabled ? '启用' : '停用'}</Badge></Td>
                    <Td>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => mutate(k.id, 'toggle', !k.enabled)}
                          disabled={busyId === k.id}
                          title={k.enabled ? '停用' : '启用'}
                          className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
                        ><Power size={13} /></button>
                        <button
                          onClick={() => mutate(k.id, 'delete')}
                          disabled={busyId === k.id}
                          title="吊销"
                          className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                        ><Trash2 size={13} /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-zinc-100 px-5 py-2.5 text-[10px] text-zinc-400">
          创建时间仅在令牌写入时记录；早期令牌可能显示为「—」，这是账本历史字段缺失，不是数据错误。
        </p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 发现层健康                                                          */
/* ------------------------------------------------------------------ */
function Discovery({ refreshToken, onNavigate }: { refreshToken: number; onNavigate: (t: AdminTab) => void }) {
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');
  const [mcpOk, setMcpOk] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const checked = await Promise.all(
        DISCOVERY_ENDPOINTS.map(async (e): Promise<CheckResult> => {
          const t0 = performance.now();
          try {
            const res = await fetch(e.path, { cache: 'no-store' });
            return { ...e, ok: res.ok, status: res.status, ms: Math.round(performance.now() - t0) };
          } catch {
            return { ...e, ok: false, status: 0, ms: Math.round(performance.now() - t0) };
          }
        }),
      );
      setResults(checked);

      let mcp = false;
      try {
        const r = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
          cache: 'no-store',
        });
        const j = await r.json();
        mcp = r.ok && Boolean(j?.result?.serverInfo || j?.result?.protocolVersion);
      } catch { mcp = false; }
      setMcpOk(mcp);

      try {
        setManifest(await getJson<Record<string, unknown>>('/api/v1/manifest'));
      } catch { setManifest(null); }

      setCheckedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    } catch {
      setError('自检过程异常，请稍后重试。');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { run(); }, [run, refreshToken]);

  const passed = useMemo(() => (results ? results.filter((r) => r.ok).length : 0), [results]);
  const total = DISCOVERY_ENDPOINTS.length + 1;
  const allGreen = results !== null && passed === DISCOVERY_ENDPOINTS.length && mcpOk === true;

  return (
    <div className="space-y-4">
      <PageHeader
        title="发现层健康"
        subtitle="逐项实测公网可达性与 MCP 握手；验证的是「Agent 能否找到并调通」，不等同于搜索引擎已收录。"
        action={<Button variant="primary" onClick={run} disabled={checking}><RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> 重新自检</Button>}
      />
      {error && <ErrorNote text={error} />}

      <Card className={`flex flex-wrap items-center gap-3 px-5 py-4 ${allGreen ? '' : 'border-amber-200 bg-amber-50/40'}`}>
        {allGreen ? <CheckCircle2 size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-amber-600" />}
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-zinc-900">
            {results === null ? '正在自检…' : `${passed + (mcpOk ? 1 : 0)} / ${total} 项通过`}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {checkedAt ? `上次自检 ${checkedAt}` : '首次自检中'} · 每项独立计时，单项失败不影响其它端点
          </p>
        </div>
        <Button variant="secondary" onClick={() => onNavigate('agent')}>查看调用用量 →</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-zinc-900">端点自检</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">相对当前域名实测 GET 状态，不做缓存</p>
        </div>
        {results === null ? (
          <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-zinc-50" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70"><Th>端点</Th><Th>用途</Th><Th>HTTP</Th><Th>耗时</Th><Th>状态</Th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.path} className="border-b border-zinc-50 last:border-0">
                    <Td className="font-mono text-[11px] font-medium">{r.label}</Td>
                    <Td className="text-zinc-500">{r.note}</Td>
                    <Td className="font-mono text-[11px]">{r.status || 'ERR'}</Td>
                    <Td className="font-mono text-[11px] text-zinc-500">{r.ms} ms</Td>
                    <Td><Badge tone={r.ok ? 'green' : 'red'}>{r.ok ? '正常' : '异常'}</Badge></Td>
                  </tr>
                ))}
                <tr className="bg-blue-50/30">
                  <Td className="font-mono text-[11px] font-medium">POST /api/mcp</Td>
                  <Td className="text-zinc-500">MCP initialize 握手</Td>
                  <Td className="font-mono text-[11px]">{mcpOk === null ? '…' : mcpOk ? '200' : 'ERR'}</Td>
                  <Td className="font-mono text-[11px] text-zinc-500">—</Td>
                  <Td><Badge tone={mcpOk ? 'green' : 'red'}>{mcpOk ? '正常' : '异常'}</Badge></Td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-zinc-900">运行时能力清单</h2>
          {!manifest ? (
            <p className="mt-4 text-[12px] text-zinc-500">manifest 暂不可读。</p>
          ) : (
            <div className="mt-4 space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-zinc-500">版本</span><span className="font-mono text-zinc-900">{String(manifest.version ?? '—')}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">语义声明 semantics</span><span className="font-mono text-zinc-900">{manifest.semantics ? '已提供' : '未提供'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">数据来源 dataSources</span><span className="font-mono text-zinc-900">{manifest.dataSources ? '已提供' : '未提供'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">顶层字段数</span><span className="font-mono text-zinc-900">{Object.keys(manifest).length}</span></div>
            </div>
          )}
          <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
            manifest 必须如实声明 coverage 语义与名单构成（906 SDN + 2 公开记录）。绿色不是清白证明，付费非官方 x402。
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-zinc-900">自检不覆盖的部分</h2>
          <div className="mt-4 space-y-2 text-[12px] leading-relaxed text-zinc-600">
            <p>· 搜索引擎是否已抓取 / 收录（需 Search Console、Bing 提交 sitemap）</p>
            <p>· npm 包发布与 MCP Registry 收录（站外分发，需单独执行）</p>
            <p>· 第三方 Agent 是否真的把本服务加进工具列表</p>
            <p>· 品牌词搜索结果里的同名项目消歧</p>
          </div>
          <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
            这里只回答「可达 + 契约正确」。把它和「被收录、被发现混为一谈」会导致误判，所以刻意分开写。
          </p>
        </Card>
      </div>
    </div>
  );
}
