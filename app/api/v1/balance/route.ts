import { balanceOf, PRICE_PER_CALL_USD } from '@/lib/agent-billing';
import { agentError, agentHeaders, agentJson, serviceBase } from '@/lib/agent-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: agentHeaders() });
}

export async function GET(req: Request) {
  const base = serviceBase(req);
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    const e = agentError('INVALID_TOKEN', 'Send Authorization: Bearer cs_agent_* to read balance.', 401, { hint: `POST ${base}/api/v1/topup to obtain a credential.` });
    return agentJson(e.body, e.status);
  }
  const b = balanceOf(token);
  if (!b) {
    const e = agentError('INVALID_TOKEN', 'Unknown credential.', 401);
    return agentJson(e.body, e.status);
  }
  return agentJson({
    ok: true,
    wallet: b.wallet,
    balanceUsd: b.balanceUsd,
    creditedUsd: b.creditedUsd,
    calls: b.calls,
    pricePerCallUsd: PRICE_PER_CALL_USD,
    estimatedRemainingCalls: Math.floor(b.balanceUsd / PRICE_PER_CALL_USD),
    lowBalance: b.balanceUsd < 1,
    topup: `${base}/api/v1/topup`,
    docs: `${base}/llms.txt`,
  }, 200, { 'X-Agent-Balance-Usd': String(b.balanceUsd) });
}
