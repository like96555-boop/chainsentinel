import { checkSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { performAddressCheck } from '@/lib/check-engine';
import {
  PRICE_PER_CALL_USD,
  FREE_CALLS_PER_MINUTE,
  PAID_CALLS_PER_MINUTE,
  getCredential,
  debit,
  newRequestId,
} from '@/lib/agent-billing';
import { agentError, agentHeaders, agentJson, paymentInstructions, serviceBase } from '@/lib/agent-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Agent 第一入口：无需注册、无需信用卡。免费层直接可用；付费层只需一个 Bearer 凭证。
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: agentHeaders() });
}

/** GET 供 Agent 探测端点用法（很多 Agent 会先 GET 一次） */
export async function GET(req: Request) {
  const base = serviceBase(req);
  return agentJson({
    ok: true,
    endpoint: 'POST /api/v1/check',
    description: 'Screen one crypto address for AML risk. No signup required.',
    example: {
      method: 'POST',
      url: `${base}/api/v1/check`,
      headers: { 'Content-Type': 'application/json' },
      body: { address: 'TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81' },
    },
    freeTier: { callsPerMinutePerIp: FREE_CALLS_PER_MINUTE, auth: 'none' },
    paidTier: { pricePerCallUsd: PRICE_PER_CALL_USD, auth: 'Bearer cs_agent_*', quote: '/api/v1/quote', topup: '/api/v1/topup' },
    docs: `${base}/llms.txt`,
    openapi: `${base}/api/openapi.json`,
    manifest: `${base}/api/v1/manifest`,
    mcp: `${base}/api/mcp`,
  });
}

export async function POST(req: Request) {
  const base = serviceBase(req);
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const isAgentToken = token.startsWith('cs_agent_');
  const requestId = req.headers.get('x-request-id') || newRequestId();

  // 0) 限流：付费凭证宽松，免费层按 IP
  const rl = isAgentToken
    ? rateLimit(`v1:paid:${token}`, PAID_CALLS_PER_MINUTE, 60_000)
    : rateLimit(`v1:free:${clientIp(req)}`, FREE_CALLS_PER_MINUTE, 60_000);
  if (!rl.ok) {
    const e = agentError('RATE_LIMITED', 'Rate limit exceeded. Wait a moment or add prepaid credits for a much higher limit.', 429, {
      retryAfterSec: 60,
      payment: !isAgentToken,
      extra: { rateLimit: { remaining: 0 } },
    });
    return agentJson(e.body, e.status, { 'X-RateLimit-Remaining': '0' });
  }

  // 1) 参数（错误结构对机器友好）
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    const e = agentError('INVALID_JSON', 'Request body must be a JSON object.', 400, { hint: 'Send Content-Type: application/json with {"address":"..."}' });
    return agentJson(e.body, e.status);
  }
  const parsed = checkSchema.safeParse(raw);
  if (!parsed.success) {
    const e = agentError('INVALID_ADDRESS', parsed.error.issues[0]?.message || 'Invalid address.', 400, {
      hint: 'address must be a 1-128 char string. TRON T..., BTC 1/3/bc1..., ETH 0x...',
    });
    return agentJson(e.body, e.status);
  }
  const address = parsed.data.address.trim();

  // 2) 付费凭证：先校验余额（避免白嫖算力），成功产出后再扣费
  let balanceUsd: number | null = null;
  if (isAgentToken) {
    const cred = getCredential(token);
    if (!cred) {
      const e = agentError('INVALID_TOKEN', 'Unknown cs_agent_* credential.', 401, {
        hint: 'POST /api/v1/topup with a TRON USDT txId to obtain a credential.',
      });
      return agentJson(e.body, e.status);
    }
    if (cred.balanceUsd + 1e-9 < PRICE_PER_CALL_USD) {
      const e = agentError('PAYMENT_REQUIRED', `Prepaid balance is ${cred.balanceUsd.toFixed(4)} USD; each call costs ${PRICE_PER_CALL_USD} USD.`, 402, {
        payment: true,
        hint: 'POST /api/v1/quote for a one-time exact USDT amount, pay exactly that amount, then POST /api/v1/topup with {txId, quoteId}. The same credential keeps its balance.',
        extra: { balanceUsd: cred.balanceUsd, topupHowTo: paymentInstructions().steps },
      });
      return agentJson(e.body, e.status);
    }
  }

  // 3) 判定（与 /api/check 共用引擎）
  const result = await performAddressCheck(address, null);
  if (result.status !== 200) {
    const e = agentError('UNSUPPORTED_ADDRESS_FORMAT', String(result.body.error || 'Unsupported address format.'), 400, {
      hint: 'Supported: TRON (T..., 34 chars), BTC (1/3/bc1...), ETH (0x... 40 hex).',
    });
    return agentJson(e.body, e.status);
  }

  // 4) 扣费（幂等：X-Request-Id 相同只扣一次）
  let billedUsd = 0;
  if (isAgentToken) {
    const d = await debit({ token, requestId });
    if (!d.ok) {
      const code = d.reason === 'INSUFFICIENT_CREDIT' ? 'PAYMENT_REQUIRED' : 'INVALID_TOKEN';
      const e = agentError(code, d.reason === 'INSUFFICIENT_CREDIT' ? 'Prepaid balance exhausted.' : 'Credential became invalid.', d.reason === 'INSUFFICIENT_CREDIT' ? 402 : 401, { payment: true });
      return agentJson(e.body, e.status);
    }
    billedUsd = d.alreadyDebited ? 0 : PRICE_PER_CALL_USD;
    balanceUsd = d.balanceUsd ?? null;
  }

  const meta = {
    ok: true,
    requestId,
    tier: isAgentToken ? 'prepaid' : 'free',
    billedUsd,
    pricePerCallUsd: isAgentToken ? PRICE_PER_CALL_USD : 0,
    ...(balanceUsd !== null ? { balanceUsd } : {}),
    freeCallsRemainingPerMinute: isAgentToken ? null : rl.remaining,
    docs: `${base}/llms.txt`,
    openapi: `${base}/api/openapi.json`,
    ...(isAgentToken ? { balanceEndpoint: `${base}/api/v1/balance` } : { upgrade: `${base}/api/v1/topup` }),
  };

  return agentJson(
    { ...result.body, meta },
    200,
    {
      'X-Request-Id': requestId,
      'X-RateLimit-Remaining': String(rl.remaining),
      ...(balanceUsd !== null ? { 'X-Agent-Balance-Usd': String(balanceUsd) } : {}),
      'X-Agent-Billed-Usd': String(billedUsd),
    }
  );
}
