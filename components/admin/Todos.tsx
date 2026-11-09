'use client';

import { AlertTriangle, CheckCircle2, Info, ArrowRight, Activity } from 'lucide-react';
import type { AdminTab } from './AdminNav';
import { buildTodos, fmtNum, type Status } from './adminData';
import { Badge, Button, Card, PageHeader } from './ui';

const SEVERITY = {
  error: { label: '需立即处理', tone: 'red' as const, icon: AlertTriangle, box: 'border-red-200 bg-red-50/50', text: 'text-red-700' },
  warning: { label: '建议处理', tone: 'amber' as const, icon: AlertTriangle, box: 'border-amber-200 bg-amber-50/50', text: 'text-amber-700' },
  info: { label: '提示', tone: 'blue' as const, icon: Info, box: 'border-blue-200 bg-blue-50/40', text: 'text-blue-700' },
};

export default function Todos({
  status,
  onNavigate,
}: {
  status: Status | null;
  onNavigate: (t: AdminTab) => void;
}) {
  const todos = buildTodos(status);
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...todos].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="待办与告警"
        subtitle="全部由线上真实配置与运行状态自动推导，不维护人工清单；状态恢复后对应条目自动消失。"
        action={<Badge tone={todos.length ? 'amber' : 'green'}>{todos.length} 项待处理</Badge>}
      />

      {sorted.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14">
          <CheckCircle2 size={30} className="text-emerald-500" />
          <p className="text-[14px] font-medium text-zinc-800">当前无待处理事项</p>
          <p className="text-[12px] text-zinc-500">上游连通性、密钥、收款配置、线索与名单均已检查。</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => {
            const s = SEVERITY[t.severity];
            const Icon = s.icon;
            return (
              <Card key={t.id} className={`flex flex-wrap items-start gap-3 border p-4 ${s.box}`}>
                <Icon size={17} className={`mt-0.5 shrink-0 ${s.text}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-zinc-900">{t.title}</p>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-600">{t.detail}</p>
                </div>
                <Button variant="secondary" onClick={() => onNavigate(t.tab)}>
                  {t.action} <ArrowRight size={13} />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-zinc-400" />
            <h2 className="text-[14px] font-semibold text-zinc-900">服务实时状态</h2>
          </div>
          <div className="mt-4 space-y-2.5 text-[12px]">
            <Row label="TronGrid 上游" value={status?.trongrid.ok ? `正常 · ${fmtNum(status.trongrid.latencyMs)} ms` : '不可达'} ok={status?.trongrid.ok} />
            <Row label="Kimi 模型密钥" value={status?.secrets.kimiConfigured ? '已配置' : '未配置（客服降级）'} ok={status?.secrets.kimiConfigured} />
            <Row label="TronGrid 专用 Key" value={status?.secrets.trongridKeyConfigured ? '已配置' : '未配置（公共额度）'} ok={status?.secrets.trongridKeyConfigured} />
            <Row label="Agent 收款地址" value={status?.paymentsConfigured ? '已配置 · 付费层可用' : '未配置 · 付费层暂停'} ok={status?.paymentsConfigured} />
            <div className="flex justify-between border-t border-zinc-100 pt-2.5 text-zinc-500">
              <span>运行时长 / Node</span>
              <span className="font-mono text-zinc-700">{Math.floor((status?.uptimeSec || 0) / 60)} 分 · {status?.node || '—'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[14px] font-semibold text-zinc-900">这些判断从哪来</h2>
          <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-zinc-600">
            <p><span className="font-mono text-zinc-800">/api/admin/status</span>　上游探测、密钥状态、线索数、黑名单条数、收款配置</p>
            <p><span className="font-mono text-zinc-800">paymentInstructions()</span>　读取运营方自持 USDT 地址的实时配置</p>
            <p><span className="font-mono text-zinc-800">/api/admin/billing</span>　按日账本与额度</p>
          </div>
          <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
            这里刻意不放「人为设定的提醒」：每条都对应一个可验证的线上布尔状态，处理完即消失，避免后台变成永远清不完的清单。
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={ok === false ? 'font-medium text-amber-700' : 'font-medium text-zinc-800'}>{value}</span>
    </div>
  );
}
