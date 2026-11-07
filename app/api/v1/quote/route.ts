import { rateLimit, clientIp } from '@/lib/rate-limit';
import { createQuote, QUOTE_TTL_MS, PRICE_PER_CALL_USD } from '@/lib/agent-billing';
import { agentError, agentHeaders, agentJson, paymentInstructions, serviceBase } from '@/lib/agent-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: agentHeaders() });
}

/**
 * 一次性充值报价：生成唯一的 6 位小数金额。
 * 运营收款地址是公开的 —— 若只凭 txId 认领，任何人都能拿别人已到账的记录领额度。
 * 唯一金额把「这笔转账」和「这次认领」绑定起来，不需要签名、不需要注册。
 */
async function issue(req: Request) {
  const rl = rateLimit(`v1:quote:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    const e = agentError('RATE_LIMITED', 'Too many quotes. Try again in a minute.', 429, { retryAfterSec: 60 });
    return agentJson(e.body, e.status);
  }
  const q = await createQuote();
  const p = paymentInstructions();
  const base = serviceBase(req);
  return agentJson({
    ok: true,
    quoteId: q.quoteId,
    amountUsdt: q.amountUsdt,
    currency: 'USDT',
    network: 'tron',
    asset: 'USDT',
    contract: p.contract,
    address: p.address,
    configured: p.configured,
    expiresAt: new Date(q.expiresAt).toISOString(),
    ttlSec: QUOTE_TTL_MS / 1000,
    pricePerCallUsd: PRICE_PER_CALL_USD,
    estimatedCalls: Math.floor(q.amountUsdt / PRICE_PER_CALL_USD),
    next: {
      pay: `Send EXACTLY ${q.amountUsdt.toFixed(6)} USDT (TRC20, 6 decimals) to ${p.address || '<operator address>'}`,
      claim: `POST ${base}/api/v1/topup with {"txId":"<64-hex-tron-tx-hash>","quoteId":"${q.quoteId}"}`,
      docs: `${base}/llms.txt`,
    },
    warning: 'The amount is unique to this quote. A transfer with any other amount cannot be claimed with this quoteId.',
  });
}

export async function GET(req: Request) {
  return issue(req);
}

export async function POST(req: Request) {
  return issue(req);
}
