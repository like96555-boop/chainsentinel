import { rateLimit, clientIp } from '@/lib/rate-limit';
import { claimTopup, bindQuote, releaseQuote, PRICE_PER_CALL_USD } from '@/lib/agent-billing';
import { verifyTopupTransfer } from '@/lib/payment-proof';
import { agentError, agentHeaders, agentJson, paymentInstructions, serviceBase } from '@/lib/agent-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: agentHeaders() });
}

/** GET：告诉 Agent 如何充值（很多 Agent 会先读再付） */
export async function GET(req: Request) {
  const base = serviceBase(req);
  return agentJson({
    ok: true,
    endpoint: 'POST /api/v1/topup',
    description: 'Claim prepaid credits with a TRON USDT txId plus a one-time quoteId. Idempotent: the same txId always returns the same credential.',
    quoteEndpoint: 'POST /api/v1/quote',
    example: { method: 'POST', url: `${base}/api/v1/topup`, headers: { 'Content-Type': 'application/json' }, body: { txId: '<64-hex-tron-tx-hash>', quoteId: '<from /api/v1/quote>' } },
    payment: paymentInstructions(),
    pricePerCallUsd: PRICE_PER_CALL_USD,
    docs: `${base}/llms.txt`,
  });
}

/** POST：绑定一次性报价 → 校验链上到账金额 → 幂等入账 → 返回 Bearer 凭证 */
export async function POST(req: Request) {
  const base = serviceBase(req);
  const rl = rateLimit(`v1:topup:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) {
    const e = agentError('RATE_LIMITED', 'Too many topup attempts. Try again in a minute.', 429, { retryAfterSec: 60 });
    return agentJson(e.body, e.status);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    const e = agentError('INVALID_JSON', 'Request body must be JSON.', 400);
    return agentJson(e.body, e.status);
  }
  const body = (raw || {}) as { txId?: unknown; quoteId?: unknown };
  const txId = typeof body.txId === 'string' ? body.txId.trim() : '';
  const quoteId = typeof body.quoteId === 'string' ? body.quoteId.trim() : '';
  if (!txId) {
    const e = agentError('INVALID_TXID', 'txId is required.', 400, { hint: 'Send {"txId":"<64-hex-tron-tx-hash>","quoteId":"<from /api/v1/quote>"}.', payment: true });
    return agentJson(e.body, e.status);
  }
  if (!quoteId) {
    const e = agentError('QUOTE_REQUIRED', 'A one-time quoteId is required before claiming credits.', 400, {
      hint: 'POST /api/v1/quote, pay EXACTLY the quoted 6-decimal USDT amount, then retry with quoteId.',
      payment: true,
    });
    return agentJson(e.body, e.status);
  }

  // 1) 报价绑定（幂等，同一 quoteId+txId 可重复提交）
  const bound = await bindQuote(quoteId, txId);
  if (!bound.ok || !bound.quote) {
    const e = agentError(bound.reason || 'QUOTE_INVALID', 'Quote is invalid, expired, or already bound to a different transaction.', 400, { payment: true });
    return agentJson(e.body, e.status);
  }

  // 2) 链上校验：收款地址、确认状态、以及「金额 == 一次性报价」
  const verified = await verifyTopupTransfer(txId, { expectedAmountUsdt: bound.quote.amountUsdt, quoteId });
  if (!verified.ok) {
    // 金额不符 / 未到账 / 未确认等失败时释放绑定，让同一个报价可用于正确金额的付款
    await releaseQuote(quoteId, txId);
    const e = agentError(verified.reason, verified.message, verified.reason === 'PAYMENTS_NOT_CONFIGURED' ? 503 : 400, {
      payment: verified.reason !== 'PAYMENTS_NOT_CONFIGURED',
      ...(verified.reason === 'TX_UNCONFIRMED' ? { retryAfterSec: 15 } : {}),
      ...(verified.expectedAmountUsdt ? { extra: { expectedAmountUsdt: verified.expectedAmountUsdt } } : {}),
    });
    return agentJson(e.body, e.status);
  }

  const claimed = await claimTopup({
    txId: verified.transfer.txId,
    amountUsd: verified.transfer.amountUsd,
    wallet: verified.transfer.from,
  });
  if (!claimed.ok) {
    const e = agentError('AMOUNT_TOO_SMALL', 'Top-up amount is below the minimum.', 400, { payment: true });
    return agentJson(e.body, e.status);
  }

  return agentJson({
    ok: true,
    alreadyClaimed: claimed.alreadyClaimed,
    credential: claimed.token,
    tokenType: 'Bearer',
    balanceUsd: claimed.balanceUsd,
    pricePerCallUsd: PRICE_PER_CALL_USD,
    estimatedCalls: Math.floor((claimed.balanceUsd || 0) / PRICE_PER_CALL_USD),
    next: {
      check: `POST ${base}/api/v1/check with header Authorization: Bearer <credential>`,
      balance: `GET ${base}/api/v1/balance with the same header`,
      docs: `${base}/llms.txt`,
    },
    warning: 'Store this credential securely. It is shown only here and on repeated claims of the same txId.',
  });
}
