import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent API — 让 AI 直接调用链上风控',
  description: 'ChainSentinel Agent API：无需注册即可筛查 TRON/BTC/ETH 地址风险，面向 AI Agent 的零摩擦 REST + MCP 风格工具端点，机器可读错误码、按需预付 TRON USDT。No signup, machine-readable errors, prepaid credits for AI agents.',
  alternates: { canonical: '/agent' },
  openGraph: {
    title: 'ChainSentinel Agent API — Crypto AML screening for AI agents',
    description: 'No signup. $0.01 per call. llms.txt, OpenAPI, agent card and MCP-style tools endpoint.',
    url: 'https://chainsentinel.hk/agent',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ChainSentinel Agent API',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (HTTP API)',
  url: 'https://chainsentinel.hk/agent',
  description:
    'Crypto AML / on-chain risk screening API for TRON, BTC and ETH addresses, designed for autonomous AI agents. Free tier needs no signup; prepaid credits cost 0.01 USD per check.',
  featureList: [
    'OFAC SDN sanctions address screening',
    '900+ curated blacklist labels',
    'TRON / BTC / ETH address risk scoring',
    'No-signup free tier for AI agents',
    'Machine-readable error codes and 402 payment instructions',
    'llms.txt, OpenAPI 3.1, agent card and MCP-style JSON-RPC tools',
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Free tier',
      price: '0',
      priceCurrency: 'USD',
      description: '30 address checks per minute per IP, no credentials required.',
    },
    {
      '@type': 'Offer',
      name: 'Prepaid agent credits',
      price: '0.01',
      priceCurrency: 'USD',
      description: '0.01 USD per successful check, minimum top-up 1 USDT (TRC20, TRON). 1 USDT ≈ 100 checks.',
    },
  ],
  provider: { '@type': 'Organization', name: 'ChainSentinel Limited', url: 'https://chainsentinel.hk' },
};

const code = `curl -X POST https://chainsentinel.hk/api/v1/check \\
  -H 'Content-Type: application/json' \\
  -d '{"address":"TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81"}'`;

const mcpCode = `{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"check_address",
 "arguments":{"address":"TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81"}}}`;

export default function AgentPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14 text-slate-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs tracking-[0.3em] text-neon-cyan">FOR AUTONOMOUS AGENTS</p>
      <h1 className="mt-3 text-4xl font-bold text-white">三行代码，让 Agent 拥有链上风控能力</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-300">
        无需注册、无需信用卡、无需 API key。免费层直接可调用；需要更高频率时，用一笔 TRON USDT 换取预付额度，Agent 自己就能完成「发现 → 付费 → 调用 → 查余额」的闭环。
      </p>

      <section className="mt-10 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">① 直接调用（零配置）</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/50 p-4 text-sm text-neon-cyan"><code>{code}</code></pre>
        <p className="mt-3 text-sm text-slate-400">
          返回 <code className="text-slate-200">level</code>（red / yellow / green）、<code className="text-slate-200">score</code>、<code className="text-slate-200">reasons[]</code>、<code className="text-slate-200">evidenceLinks[]</code> 与 <code className="text-slate-200">meta</code>。每个 IP 每分钟 30 次。
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">② 机器可读，出错不会卡住</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          所有错误都带稳定的 <code className="text-neon-cyan">error.code</code> 与 <code className="text-neon-cyan">error.hint</code>；遇到 402 / 429 时响应里直接附带 <code className="text-neon-cyan">payment</code> 对象（收款地址、网络、最低充值、可执行步骤）。Agent 不需要读人类文档就能自己恢复。
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">③ MCP 风格工具端点</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/50 p-4 text-sm text-neon-cyan"><code>{mcpCode}</code></pre>
        <p className="mt-3 text-sm text-slate-400">
          POST <code className="text-slate-200">/api/mcp</code> 支持 initialize / tools/list / tools/call / ping，工具：<code className="text-slate-200">check_address</code>、<code className="text-slate-200">get_balance</code>、<code className="text-slate-200">topup_info</code>。无状态，单个 HTTP 请求即可完成，不需要会话或 SSE。
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">发现入口（给 Agent / 爬虫 / 搜索引擎）</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['/llms.txt', '给 LLM 的简短入口'],
            ['/llms-full.txt', '完整集成文档'],
            ['/api/v1/manifest', '机器可读能力清单与价目'],
            ['/api/openapi.json', 'OpenAPI 3.1 规范'],
            ['/.well-known/agent-card.json', 'Agent Card 发现文档'],
            ['/api/mcp', 'MCP 风格 JSON-RPC 端点'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg border border-cyber-700 px-4 py-3 transition hover:border-neon-cyan/60">
              <span className="block font-mono text-sm text-neon-cyan">{href}</span>
              <span className="block text-xs text-slate-400">{label}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-cyber-700 p-6">
        <h2 className="text-xl font-semibold text-white">价格与边界</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>• 免费层：30 次/分钟/IP，零配置。</li>
          <li>• 预付层：$0.01 / 次成功调用，1 USDT ≈ 100 次；TRON TRC20 非托管收款，服务不持有私钥。</li>
          <li>• 幂等：同一 txId 只入账一次；带 X-Request-Id 的调用不会重复扣费。</li>
          <li>• 只读风控筛查，不执行交易、不托管资金、不协助规避制裁；结果是风险信号，不构成法律意见。</li>
        </ul>
      </section>
    </main>
  );
}
