// 链哨 · Agent 服务层：机器可读清单、统一定价、统一错误结构、MCP 工具定义
// 所有面向 Agent 的端点共用本文件，保证「同一个价格、同一套错误码、同一个文档地址」。
import { getUsdtConfig, USDT_CONTRACT } from '@/lib/usdt';
import { PRICE_PER_CALL_USD, MIN_TOPUP_USDT, FREE_CALLS_PER_MINUTE } from '@/lib/agent-billing';

export const AGENT_API_VERSION = '1.1.0';
export const PROD_BASE = 'https://chainsentinel.hk';

export function serviceBase(req?: Request): string {
  if (req) {
    const u = new URL(req.url);
    const host = req.headers.get('x-forwarded-host') || u.host;
    const proto = req.headers.get('x-forwarded-proto') || u.protocol.replace(':', '');
    return `${proto}://${host}`;
  }
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  return env && !env.includes('localhost') ? env : PROD_BASE;
}

/** 机器可读的支付指引：402 响应、manifest、MCP topup_info 三处共用 */
export function paymentInstructions() {
  const cfg = getUsdtConfig();
  return {
    required: false,
    scheme: 'prepaid-onchain-transfer',
    network: 'tron',
    asset: 'USDT',
    contract: USDT_CONTRACT,
    chainId: '728126428',
    address: cfg.address || null,
    configured: Boolean(cfg.address),
    pricePerCallUsd: PRICE_PER_CALL_USD,
    minTopupUsdt: MIN_TOPUP_USDT,
    unit: '1 USDT ≈ 1 USD',
    quoteEndpoint: '/api/v1/quote',
    topupEndpoint: '/api/v1/topup',
    steps: [
      'POST /api/v1/quote to get a one-time quoteId and a unique amountUsdt (e.g. 1.000137).',
      'Send EXACTLY that amount of USDT (TRC20, 6 decimals) to the address above from the wallet the agent controls.',
      'POST /api/v1/topup with {"txId":"<64-hex-tron-tx-hash>","quoteId":"<quoteId>"} within 30 minutes.',
      'Receive a Bearer credential (cs_agent_...); store it securely.',
      'Send Authorization: Bearer <credential> on subsequent /api/v1/check calls.',
      'Each successful check costs 0.01 USD; check GET /api/v1/balance any time.',
    ],
    note: 'Non-custodial: funds go directly to the operator wallet. No card form, no KYC, no private key held by this service. The receiving address is public, so a one-time unique 6-decimal amount from /api/v1/quote is REQUIRED before paying — it prevents anyone from claiming someone else\'s incoming transfer. This is an x402-inspired prepaid flow, not an official x402 facilitator integration.',
  };
}

/** 统一 CORS + JSON 响应头，让浏览器内 Agent 与服务端 Agent 都能直接调用 */
export function agentHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id, X-Agent-Test, MCP-Protocol-Version',
    'Access-Control-Expose-Headers': 'X-RateLimit-Remaining, X-Agent-Balance-Usd, X-Request-Id, X-Agent-Billed-Usd',
    'Cache-Control': 'no-store',
    ...extra,
  };
}

export function agentJson(body: Record<string, unknown>, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...agentHeaders(extra) },
  });
}

/** 统一错误结构：code 是稳定枚举，Agent 可直接分支处理 */
export function agentError(
  code: string,
  message: string,
  status: number,
  opts?: { hint?: string; payment?: boolean; retryAfterSec?: number; extra?: Record<string, unknown> }
) {
  return {
    status,
    body: {
      ok: false,
      error: {
        code,
        message,
        ...(opts?.hint ? { hint: opts.hint } : {}),
        ...(opts?.retryAfterSec ? { retryAfterSec: opts.retryAfterSec } : {}),
      },
      ...(opts?.payment ? { payment: paymentInstructions() } : {}),
      docs: '/llms.txt',
      ...(opts?.extra || {}),
    } as Record<string, unknown>,
  };
}

export function agentManifest(base: string) {
  return {
    name: 'ChainSentinel Agent API',
    version: AGENT_API_VERSION,
    description:
      'A free, zero-signup pre-interaction veto gate for crypto addresses (TRON / BTC / ETH). Answers one question reliably: is this address on the OFAC SDN / curated sanctions list? Also returns live on-chain activity signals. It explicitly reports what was NOT checked, and green is never a clearance. Designed for autonomous AI agents: no API key, machine-readable errors, on-chain prepaid credits for higher volume.',
    baseUrl: base,
    discovery: {
      llmsTxt: `${base}/llms.txt`,
      llmsFullTxt: `${base}/llms-full.txt`,
      openapi: `${base}/api/openapi.json`,
      agentCard: `${base}/.well-known/agent-card.json`,
      mcp: `${base}/api/mcp`,
      docsPage: `${base}/agent`,
    },
    capabilities: ['ofac-sdn-address-screening', 'multi-chain-tron-btc-eth', 'onchain-activity-heuristics', 'explicit-coverage-reporting', 'prepaid-agent-billing', 'mcp-tools'],
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/check',
        auth: 'none (free tier) or Bearer cs_agent_* (prepaid)',
        priceUsd: PRICE_PER_CALL_USD,
        description: 'Screen one address against the OFAC SDN / curated list, then report on-chain activity. Free tier needs no credentials.',
        request: { address: 'T... / 1... / 0x... (string, 1-128 chars)' },
        response: {
          chain: 'tron|btc|eth', level: 'red|yellow|green', score: '0-100', reasons: 'string[]', evidenceLinks: 'string[]',
          coverage: 'verdictBasis, checksPerformed[], notCovered[], noData, degraded, greenIsNotClearance, recommendedAction, interpretation',
        },
      },
      { method: 'POST', path: '/api/v1/quote', auth: 'none', description: 'Get a one-time quoteId and a unique exact USDT amount (anti-claim-theft). Required before paying.' },
      { method: 'POST', path: '/api/v1/topup', auth: 'none', description: 'Claim prepaid credits with {txId, quoteId}. Verifies the exact quoted amount on-chain. Idempotent per txId.' },
      { method: 'GET', path: '/api/v1/balance', auth: 'Bearer cs_agent_*', description: 'Read remaining credits and call count.' },
      { method: 'GET', path: '/api/v1/manifest', auth: 'none', description: 'This machine-readable service manifest.' },
      { method: 'POST', path: '/api/mcp', auth: 'none', description: 'MCP-style JSON-RPC endpoint: initialize / tools/list / tools/call.' },
      { method: 'POST', path: '/api/check', auth: 'none or Bearer cs_live_* (human subscription)', description: 'Legacy endpoint, unchanged behaviour (now also returns coverage).' },
    ],
    pricing: {
      currency: 'USD',
      pricePerCallUsd: PRICE_PER_CALL_USD,
      freeTier: { callsPerMinutePerIp: FREE_CALLS_PER_MINUTE, auth: 'none', note: 'No signup. An agent can start immediately.' },
      payment: paymentInstructions(),
    },
    semantics: {
      greenIsNotClearance: true,
      noDataIsExplicit: true,
      coverageField: 'coverage',
      recommendedActionField: 'coverage.recommendedAction',
      verdictBasisValues: ['sanctions-list-hit', 'chain-activity-heuristics', 'degraded-upstream'],
      recommendedActionValues: ['block', 'escalate', 'proceed-with-caution'],
      note: 'Always branch on coverage.recommendedAction, not on level alone. A non-hit means "not found in our list", never "clean funds". Absence of a listing is not a clearance.',
    },
    dataSources: {
      curatedEntries: 908,
      composition: { 'ofac-sdn': 906, 'public-record': 2 },
      coverageByChain: { btc: 528, tron: 276, eth: 104 },
      note: 'The library is essentially the OFAC SDN address list plus 2 public records (Ronin Bridge, Silk Road seizure). It is NOT a multi-source threat-intelligence database.',
    },
    errorCodes: [
      'INVALID_JSON', 'INVALID_ADDRESS', 'UNSUPPORTED_ADDRESS_FORMAT', 'RATE_LIMITED',
      'PAYMENT_REQUIRED', 'INVALID_TOKEN', 'INSUFFICIENT_CREDIT', 'PAYMENTS_NOT_CONFIGURED',
      'QUOTE_REQUIRED', 'QUOTE_INVALID', 'QUOTE_EXPIRED', 'QUOTE_TX_MISMATCH', 'QUOTE_REUSED',
      'INVALID_TXID', 'TX_NOT_FOUND', 'TX_UNCONFIRMED', 'TX_ALREADY_USED', 'AMOUNT_TOO_SMALL', 'AMOUNT_MISMATCH', 'UPSTREAM_UNAVAILABLE',
    ],
    idempotency: {
      topup: 'Same txId always returns the same credential and never credits twice.',
      check: 'Send X-Request-Id to make a paid call idempotent; same id never debits twice.',
    },
    limits: { freeCallsPerMinutePerIp: FREE_CALLS_PER_MINUTE, paidCallsPerMinute: 300, maxAddressLength: 128 },
    compliance: 'Read-only pre-interaction screening. No entity attribution, no multi-hop tracing, no KYT reports, no court-admissible evidence. No trading execution, no private keys, no custody, no sanctions-evasion assistance. Results are risk signals, not legal advice or a compliance clearance.',
  };
}

/** MCP tools/list 的工具定义（HTTP 端点与 stdio bridge 共用） */
export const AGENT_TOOLS = [
  {
    name: 'check_address',
    description:
      'Pre-interaction veto gate for a TRON / BTC / ETH address. Checks the OFAC SDN / curated sanctions address list (906 SDN + 2 public records) and live on-chain activity. Returns level, score, reasons, evidence links and a coverage object stating exactly what was and was NOT checked. IMPORTANT: green is NOT a clearance — we have no entity attribution or fund-tracing data. Always read coverage.recommendedAction (block | escalate | proceed-with-caution). Free tier works without credentials; with a prepaid Bearer credential each call costs 0.01 USD.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'TRON T..., BTC 1/3/bc1..., or ETH 0x... address', minLength: 1, maxLength: 128 },
        credential: { type: 'string', description: 'Optional Bearer credential cs_agent_* obtained from /api/v1/topup. Omit to use the free tier.' },
      },
      required: ['address'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_balance',
    description: 'Check the remaining prepaid USD credits and total calls for a cs_agent_* credential.',
    inputSchema: {
      type: 'object',
      properties: { credential: { type: 'string', description: 'Bearer credential cs_agent_*' } },
      required: ['credential'],
      additionalProperties: false,
    },
  },
  {
    name: 'topup_info',
    description: 'Get the payment address, price per call, minimum top-up and the exact steps to add prepaid credits with TRON USDT. Also use after a 402 PAYMENT_REQUIRED response. Note: a one-time quote (POST /api/v1/quote) is required before paying — the exact 6-decimal amount binds the transfer to your claim.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;
