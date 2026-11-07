// 链哨 · Agent 充值凭证校验
// 只做一件事：确认某笔 TRON USDT 转账真实打进了运营自持地址，且未被认领过。
// 不托管资金、不生成私钥、不代发交易。
import { getUsdtConfig, fetchUsdtTransfers } from '@/lib/usdt';
import { readOrders } from '@/lib/orders';
import { MIN_TOPUP_USDT } from '@/lib/agent-billing';

export interface VerifiedTransfer {
  txId: string;
  amountUsd: number;
  from: string;
  confirmed: boolean;
}

export type VerifyResult =
  | { ok: true; transfer: VerifiedTransfer }
  | { ok: false; reason: 'PAYMENTS_NOT_CONFIGURED' | 'INVALID_TXID' | 'TX_NOT_FOUND' | 'TX_ALREADY_USED' | 'TX_UNCONFIRMED' | 'AMOUNT_TOO_SMALL' | 'UPSTREAM_UNAVAILABLE'; message: string };

/**
 * 校验充值交易。
 * - 复用 lib/usdt.ts 的 TronGrid 查询（唯一链上取数入口，禁止另写一套）
 * - 同一 txId 若已被订阅订单使用，拒绝重复认领（防止一笔钱换两份权益）
 * - 本地开发测试：仅当 NODE_ENV !== production 且 AGENT_API_TEST=1 时接受 test_ 前缀的合成交易
 */
export async function verifyTopupTransfer(txId: string): Promise<VerifyResult> {
  const cfg = getUsdtConfig();
  const isTest = process.env.NODE_ENV !== 'production' && process.env.AGENT_API_TEST === '1' && txId.startsWith('test_');

  if (!cfg.address && !isTest) {
    return { ok: false, reason: 'PAYMENTS_NOT_CONFIGURED', message: '运营方尚未在后台配置 USDT 收款地址，Agent 充值暂不可用；免费层仍可调用。' };
  }
  if (!isTest && !/^[0-9a-fA-F]{64}$/.test(txId)) {
    return { ok: false, reason: 'INVALID_TXID', message: 'txId 必须是 64 位十六进制 TRON 交易哈希。' };
  }

  // 已被订阅订单认领 → 拒绝
  if (readOrders().some((o) => o.usdtTxId === txId)) {
    return { ok: false, reason: 'TX_ALREADY_USED', message: '该交易已用于订阅订单激活，不能重复认领。' };
  }

  if (isTest) {
    console.warn('[payment-proof] 开发测试模式：接受合成交易，绝不会在 production 生效');
    const m = txId.match(/^test_([\d.]+)_/);
    const amount = m ? Number(m[1]) : MIN_TOPUP_USDT;
    return { ok: true, transfer: { txId, amountUsd: amount, from: 'TEST', confirmed: true } };
  }

  let transfers: Awaited<ReturnType<typeof fetchUsdtTransfers>>;
  try {
    transfers = await fetchUsdtTransfers(cfg.address);
  } catch (e) {
    console.error('[payment-proof] TronGrid 查询失败', e);
    return { ok: false, reason: 'UPSTREAM_UNAVAILABLE', message: '链上到账查询暂时不可用，请稍后重试。' };
  }
  const hit = transfers.find((t) => t.txId.toLowerCase() === txId.toLowerCase() && t.to === cfg.address);
  if (!hit) {
    return { ok: false, reason: 'TX_NOT_FOUND', message: '未在该收款地址的最近入账中找到这笔交易；请确认已打款且收款地址正确。' };
  }
  if (!hit.confirmed) {
    return { ok: false, reason: 'TX_UNCONFIRMED', message: '交易尚未确认，请稍后重试。' };
  }
  if (hit.value < MIN_TOPUP_USDT) {
    return { ok: false, reason: 'AMOUNT_TOO_SMALL', message: `最低充值 ${MIN_TOPUP_USDT} USDT，实际到账 ${hit.value}。` };
  }
  return {
    ok: true,
    transfer: { txId: hit.txId, amountUsd: hit.value, from: hit.from, confirmed: true },
  };
}
