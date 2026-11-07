// 链哨 · Agent 服务层：机器可读清单、统一定价、统一错误结构、MCP 工具定义
// 所有面向 Agent 的端点共用本文件，保证「同一个价格、同一套错误码、同一个文档地址」。
import { getUsdtConfig, USDT_CONTRACT } from '@/lib/usdt';
import { PRICE_PER_CALL_USD, MIN_TOPUP_USDT, FREE_CALLS_PER_MINUTE } from '@/lib/agent-billing';

export const AGENT_API_VERSION = '1.0.0';
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
    topupEndpoint: '/api/v1/topup',
    steps: [
      'Send >= 1 USDT (TRC20) to the address above from the wallet the agent controls.',
      'POST /api/v1/topup with {"txId":"<64-hex-tron-tx-hash>"}.',
      'Receive a Bearer credential (cs_agent_...); store it securely.',
      'Send Authorization: Bearer <credential> on subsequent /api/v1/check calls.',
      'Each successful check costs 0.01 USD; check GET /api/v1/balance any time.',
    ],
    note: 'Non-custodial: funds go directly to the operator wallet. No card form, no KYC, no private key held by this service. This is an x402-inspired prepaid flow, not an official x402 facilitator integration.',
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
      'Crypto AML / on-chain risk screening for TRON, BTC and ETH addresses. Detects OFAC SDN sanctions, blacklists, scam and laundering-linked funds in ~3 seconds. Designed for autonomous AI agents: no signup, no credit card, machine-readable errors, on-chain prepaid credits.',
    baseUrl: base,
    discovery: {
      llmsTxt: `${base}/llms.txt`,
      llmsFullTxt: `${base}/llms-full.txt`,
      openapi: `${base}/api/openapi.json`,
      agentCard: `${base}/.well-known/agent-card.json`,
      mcp: `${base}/api/mcp`,
      docsPage: `${base}/agent`,
    },
    capabilities: ['address-risk-screening', 'ofac-sdn-screening', 'multi-chain-tron-btc-eth', 'prepaid-agent-billing', 'mcp-tools'],
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/check',
        auth: 'none (free tier) or Bearer cs_agent_* (prepaid)',
        priceUsd: PRICE_PER_CALL_USD,
        description: 'Screen one crypto address. Free tier needs no credentials.',
        request: { address: 'T... / 1... / 0x... (string, 1-128 chars)' },
        response: { chain: 'tron|btc|eth', level: 'red|yellow|green', score: '0-100', reasons: 'string[]', evidenceLinks: 'string[]' },
      },
      { method: 'POST', path: '/api/v1/topup', auth: 'none', description: 'Claim prepaid credits with one TRON USDT txId. Idempotent per txId.' },
      { method: 'GET', path: '/api/v1/balance', auth: 'Bearer cs_agent_*', description: 'Read remaining credits and call count.' },
      { method: 'GET', path: '/api/v1/manifest', auth: 'none', description: 'This machine-readable service manifest.' },
      { method: 'POST', path: '/api/mcp', auth: 'none', description: 'MCP-style JSON-RPC endpoint: initialize / tools/list / tools/call.' },
      { method: 'POST', path: '/api/check', auth: 'none or Bearer cs_live_* (human subscription)', description: 'Legacy endpoint, unchanged behaviour.' },
    ],
    pricing: {
      currency: 'USD',
      pricePerCallUsd: PRICE_PER_CALL_USD,
      freeTier: { callsPerMinutePerIp: FREE_CALLS_PER_MINUTE, auth: 'none', note: 'No signup. An agent can start immediately.' },
      payment: paymentInstructions(),
    },
    errorCodes: [
      'INVALID_JSON', 'INVALID_ADDRESS', 'UNSUPPORTED_ADDRESS_FORMAT', 'RATE_LIMITED',
      'PAYMENT_REQUIRED', 'INVALID_TOKEN', 'INSUFFICIENT_CREDIT', 'PAYMENTS_NOT_CONFIGURED',
      'INVALID_TXID', 'TX_NOT_FOUND', 'TX_UNCONFIRMED', 'TX_ALREADY_USED', 'AMOUNT_TOO_SMALL', 'UPSTREAM_UNAVAILABLE',
    ],
    idempotency: {
      topup: 'Same txId always returns the same credential and never credits twice.',
      check: 'Send X-Request-Id to make a paid call idempotent; same id never debits twice.',
    },
    limits: { freeCallsPerMinutePerIp: FREE_CALLS_PER_MINUTE, paidCallsPerMinute: 300, maxAddressLength: 128 },
    compliance: 'Read-only screening. No trading execution, no private keys, no custody, no sanctions-evasion assistance. Results are risk signals, not legal advice.',
  };
}

/** MCP tools/list 的工具定义（HTTP 端点与 stdio bridge 共用） */
export const AGENT_TOOLS = [
  {
    name: 'check_address',
    description:
      'Screen a crypto address (TRON / BTC / ETH) for AML risk: OFAC SDN sanctions, blacklists, scam and laundering-linked funds. Returns chain, risk level (red/yellow/green), score, reasons and evidence links. Free tier works without credentials; with a prepaid Bearer credential each call costs 0.01 USD.',
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
    description: 'Get the payment address, price per call, minimum top-up and the exact steps to add prepaid credits with TRON USDT. Also use after a 402 PAYMENT_REQUIRED response.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;
