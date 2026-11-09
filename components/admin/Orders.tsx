'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminTab } from './AdminNav';
import { fmtNum, fmtTime, getJson, type Status } from './adminData';
import { Badge, Button, Card, Empty, ErrorNote, Kpi, PageHeader, Td, Th } from './ui';

interface Order {
  id: string;
  planId: string;
  customerEmail: string;
  amountUsd: number;
  status: string;
  createdAt: number;
}
interface BillingResp { usage: unknown; orders: Order[] }

const STATUS_TONE: Record<string, 'green' | 'amber' | 'neutral' | 'blue'> = {
  paid: 'green',
  completed: 'green',
  confirmed: 'green',
  pending: 'amber',
  processing: 'blue',
  expired: 'neutral',
  failed: 'neutral',
};

export default function Orders({
  status,
  refreshToken,
  onNavigate,
}: {
  status: Status | null;
  refreshToken: number;
  onNavigate: (t: AdminTab) => void;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const j = await getJson<BillingResp>('/api/admin/billing');
      setOrders(j.orders || []);
      setError('');
    } catch {
      setError('订单数据读取失败，下方金额与列表暂不可用。');
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  const total = (orders || []).reduce((a, o) => a + (Number(o.amountUsd) || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="订单与账本"
        subtitle="订阅订单来自本地账本；Agent 预付充值走 TRON USDT 链上转账，不在本表内。"
        action={<Button variant="secondary" onClick={() => onNavigate('billing')}>计费与支付 →</Button>}
      />

      {error && <ErrorNote text={error} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="订单总数" value={fmtNum(orders?.length)} hint="最近 50 条" loading={orders === null} />
        <Kpi label="订单金额合计" value={orders ? `$${total.toFixed(2)}` : '—'} hint="按 USD 计价，未做汇率换算" loading={orders === null} />
        <Kpi
          label="Agent 付费层"
          value={status?.paymentsConfigured ? '已启用' : '已暂停'}
          tone={status?.paymentsConfigured ? 'green' : 'amber'}
          hint={status?.paymentsConfigured ? '收款地址已配置' : '需配置 USDT 收款地址'}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <h2 className="text-[14px] font-semibold text-zinc-900">订阅订单</h2>
          <span className="text-[11px] text-zinc-400">按创建时间倒序</span>
        </div>
        {orders === null ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-zinc-50" />)}</div>
        ) : orders.length === 0 ? (
          <Empty text="暂无订阅订单" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/70"><Th>时间</Th><Th>订单号</Th><Th>套餐</Th><Th>客户</Th><Th>金额</Th><Th>状态</Th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60">
                    <Td className="whitespace-nowrap font-mono text-[11px] text-zinc-500">{fmtTime(o.createdAt)}</Td>
                    <Td className="font-mono text-[11px]">{o.id}</Td>
                    <Td>{o.planId || '—'}</Td>
                    <Td className="text-zinc-500">{o.customerEmail || '—'}</Td>
                    <Td className="font-mono">${(Number(o.amountUsd) || 0).toFixed(2)}</Td>
                    <Td><Badge tone={STATUS_TONE[o.status] || 'neutral'}>{o.status || '—'}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-[14px] font-semibold text-zinc-900">Agent 预付充值口径</h2>
        <div className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-zinc-600">
          <p>· 非托管：USDT (TRC20) 直接转入运营方自持钱包，平台不持有私钥、不做 KYC。</p>
          <p>· 防冒领：必须先 <span className="font-mono">POST /api/v1/quote</span> 取得一次性 6 位小数金额，再按该金额转账。</p>
          <p>· 幂等：<span className="font-mono">txId + quoteId + requestId</span> 三重去重，重复认领不会重复入账。</p>
          <p>· 定价：$0.01 / 次；免费层 30 次/分钟/IP，零注册，不计入账本。</p>
          <p>· 这是 x402 风格的预付流程，<span className="font-medium text-zinc-800">不是官方 x402 facilitator 集成</span>。</p>
        </div>
        <button onClick={() => onNavigate('discovery')} className="mt-4 text-[11px] font-medium text-blue-600 hover:underline">
          查看对外契约是否与此处一致 →
        </button>
      </Card>
    </div>
  );
}
