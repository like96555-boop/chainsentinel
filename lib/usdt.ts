// 链哨 · USDT 非托管收款（TRON 链上）
// 设计：客户直接打款到「运营自持的 TRON USDT 钱包」，链哨只负责检测到账并激活订阅。
// 零第三方、零手续费、非托管——钱永远只进运营自己的钱包。
// 流程：USDT 下单（生成订单+金额）→ 客户打款 → 前端轮询 /api/billing/usdt/status
//       → 服务端查 TronGrid 确认到账 → 激活订阅令牌（幂等）。

import { readStore, writeStore } from './config-store';
import { activateSubscription } from './billing';
import { readOrders, updateOrder, findOrder, type OrderRecord } from './orders';

export const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const USDT_DECIMALS = 6;

export interface UsdtPaymentConfig {
  /** 运营自持的 TRON 收款地址（后台「计费与支付」维护） */
  address: string;
}

const CONFIG_FILE = 'usdt-payment.json';

export function getUsdtConfig(): UsdtPaymentConfig {
  const { items } = readStore<UsdtPaymentConfig>(CONFIG_FILE, []);
  return items[0] || { address: '' };
}

export function setUsdtConfig(address: string): void {
  writeStore(CONFIG_FILE, [{ address }]);
}

/** TronGrid 查某地址的 TRC20 USDT 入账（最近 50 笔，含未确认） */
async function fetchUsdtTransfers(address: string): Promise<Array<{ txId: string; from: string; to: string; value: number; confirmed: boolean }>> {
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=50&only_confirmed=false&contract_address=${USDT_CONTRACT}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`TronGrid 查询失败 HTTP ${res.status}`);
  const j = await res.json();
  return (j.data || []).map((t: { transaction_id: string; from: string; to: string; value: string; confirmed?: boolean }) => ({
    txId: t.transaction_id,
    from: t.from,
    to: t.to,
    value: Number(t.value) / 10 ** USDT_DECIMALS,
    confirmed: t.confirmed !== false,
  }));
}

/** 检测到账：订单金额是否已入账（精确匹配金额 ≥ 应到金额的转账） */
export async function checkUsdtArrival(address: string, amountUsdt: number): Promise<{ arrived: boolean; txId?: string; amount?: number; confirmed?: boolean }> {
  if (!address) return { arrived: false };
  const transfers = await fetchUsdtTransfers(address);
  const hit = transfers.find((t) => t.to === address && t.value >= amountUsdt - 0.01); // 允许 0.01 容差
  if (!hit) return { arrived: false };
  return { arrived: true, txId: hit.txId, amount: hit.value, confirmed: hit.confirmed };
}

/**
 * 确认 USDT 订单到账并激活订阅（幂等）：
 * - 订单不存在 → null
 * - 已 paid → 返回现有状态（不重复激活）
 * - 查链上到账（可注入已确认交易用于测试/手动确认）
 */
export async function confirmUsdtOrder(
  orderId: string,
  override?: { txId?: string; amountUsdt?: number }
): Promise<{ ok: boolean; status?: number; error?: string; order?: OrderRecord }> {
  const order = findOrder(orderId);
  if (!order) return { ok: false, status: 404, error: '订单不存在' };
  if (order.method !== 'usdt') return { ok: false, status: 400, error: '该订单非 USDT 支付' };
  if (order.status === 'paid') return { ok: true, order };

  const address = getUsdtConfig().address;
  const amountUsdt = override?.amountUsdt || order.amountUsdt || 0;
  const arrival = override?.txId
    ? { arrived: true, txId: override.txId, amount: override.amountUsdt, confirmed: true }
    : await checkUsdtArrival(address, amountUsdt);
  if (!arrival.arrived) {
    return { ok: false, status: 202, error: '未检测到入账，请确认已完成打款' };
  }

  // 到账 → 激活订阅 + 订单置 paid（幂等：重复调用不会重复激活令牌）
  const { created } = activateSubscription({
    planId: order.planId as 'pro' | 'business',
    customerEmail: order.customerEmail,
    periodEndsAt: Date.now() + 30 * 86_400_000,
  });
  updateOrder(orderId, {
    status: 'paid',
    method: 'usdt',
    usdtTxId: arrival.txId,
    amountUsdt: arrival.amount,
    confirmedAt: Date.now(),
    tokens: created.map((k) => ({ id: k.id, key: k.key, name: k.name })),
  });
  return { ok: true, order: findOrder(orderId) || undefined };
}

/** USDT 支付信息（前端展示用） */
export function usdtPaymentInfo(orderId: string): { address: string; amountUsdt: number; orderId: string } | null {
  const order = findOrder(orderId);
  if (!order || order.method !== 'usdt') return null;
  const address = getUsdtConfig().address;
  if (!address) return null;
  return { address, amountUsdt: order.amountUsdt || order.amountUsd, orderId };
}

export { readOrders };
