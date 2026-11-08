import { AGENT_TOOLS, AGENT_API_VERSION, agentHeaders, agentJson, paymentInstructions, serviceBase } from '@/lib/agent-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 轻量 MCP 风格 JSON-RPC 端点：Agent 只需要一个 URL，无需安装任何包。
// 支持 initialize / tools/list / tools/call / ping。工具实现统一转发到 /api/v1/*，
// 保证「计量、限流、错误结构、价格」只有一套实现。
const PROTOCOL_VERSION = '2025-06-18';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: agentHeaders() });
}

/** GET：探测友好 */
export async function GET(req: Request) {
  const base = serviceBase(req);
  return agentJson({
    name: 'chainsentinel-mcp',
    transport: 'JSON-RPC 2.0 over HTTP POST (stateless, single request per call)',
    protocolVersion: PROTOCOL_VERSION,
    endpoint: `${base}/api/mcp`,
    methods: ['initialize', 'tools/list', 'tools/call', 'ping'],
    tools: AGENT_TOOLS.map((t) => t.name),
    example: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } },
    note: 'This is a stateless JSON-RPC tools endpoint, not a full stateful MCP session server. No session id or SSE stream is required.',
    docs: `${base}/llms.txt`,
  });
}

function rpcResult(id: unknown, result: unknown) {
  return agentJson({ jsonrpc: '2.0', id: id ?? null, result } as Record<string, unknown>);
}

function rpcError(id: unknown, code: number, message: string) {
  return agentJson({ jsonrpc: '2.0', id: id ?? null, error: { code, message } } as Record<string, unknown>);
}

function toolText(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }],
    structuredContent: typeof payload === 'string' ? { message: payload } : (payload as Record<string, unknown>),
    isError,
  };
}

async function callTool(name: string, args: Record<string, unknown>, base: string) {
  if (name === 'topup_info') {
    const res = await fetch(`${base}/api/v1/topup`, { headers: { Accept: 'application/json' } });
    return toolText(await res.json(), !res.ok);
  }
  if (name === 'get_balance') {
    const credential = typeof args.credential === 'string' ? args.credential : '';
    const res = await fetch(`${base}/api/v1/balance`, { headers: { Authorization: `Bearer ${credential}` } });
    return toolText(await res.json(), !res.ok);
  }
  if (name === 'check_address') {
    const credential = typeof args.credential === 'string' ? args.credential : '';
    const res = await fetch(`${base}/api/v1/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
      },
      body: JSON.stringify({ address: args.address }),
    });
    return toolText(await res.json(), !res.ok);
  }
  return toolText({ error: { code: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}`, availableTools: AGENT_TOOLS.map((t) => t.name) } }, true);
}

export async function POST(req: Request) {
  const base = serviceBase(req);
  let rpc: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    rpc = await req.json();
  } catch {
    return rpcError(null, -32700, 'Parse error: body must be JSON-RPC 2.0');
  }
  if (!rpc || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
    return rpcError(rpc?.id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0" and method must be a string');
  }
  // 通知类消息（无 id）不返回 JSON-RPC 响应
  if (rpc.id === undefined && rpc.method.startsWith('notifications/')) {
    return new Response(null, { status: 202, headers: agentHeaders() });
  }

  switch (rpc.method) {
    case 'initialize':
      return rpcResult(rpc.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'chainsentinel', version: AGENT_API_VERSION, title: 'ChainSentinel · Free pre-interaction veto gate' },
        instructions:
          'Use check_address as a free pre-interaction veto gate for a TRON/BTC/ETH address: it checks the OFAC SDN / curated address list (906 SDN + 2 public records) plus live on-chain activity. This is NOT a full AML/KYT investigation — no entity attribution, no multi-hop tracing, no KYT reports. Always read coverage.recommendedAction (block | escalate | proceed-with-caution) instead of branching on level alone; green means "not found in our list", NOT "clean funds", and coverage.noData tells you we have no intelligence about the counterparty. No signup needed for the free tier. If you get a 402 PAYMENT_REQUIRED or need high volume, call topup_info, then POST /api/v1/quote for a one-time exact 6-decimal USDT amount, pay EXACTLY that amount (TRC20), then POST /api/v1/topup with {txId, quoteId} to get a cs_agent_* credential. Use get_balance to check remaining credits.',
      });
    case 'ping':
      return rpcResult(rpc.id, {});
    case 'tools/list':
      return rpcResult(rpc.id, { tools: AGENT_TOOLS });
    case 'tools/call': {
      const params = rpc.params || {};
      const name = typeof params.name === 'string' ? params.name : '';
      const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>;
      try {
        return rpcResult(rpc.id, await callTool(name, args, base));
      } catch (e) {
        return rpcResult(rpc.id, toolText({ error: { code: 'UPSTREAM_UNAVAILABLE', message: String(e), payment: paymentInstructions() } }, true));
      }
    }
    default:
      return rpcError(rpc.id, -32601, `Method not found: ${rpc.method}`);
  }
}
