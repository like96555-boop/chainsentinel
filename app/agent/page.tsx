import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent API — 让 AI 在交互前先过一道免费否决门',
  description: 'ChainSentinel Agent API：零注册筛查 TRON/BTC/ETH 地址是否命中 OFAC SDN 等名单，明确返回「查了什么、没查什么」与建议动作。面向 AI Agent 的 REST + MCP 风格工具端点。No signup, explicit coverage, machine-readable errors.',
  alternates: {
    canonical: '/agent',
    languages: { 'zh-CN': '/agent', en: '/en/agent', 'x-default': '/en/agent' },
  },
  openGraph: {
    title: 'ChainSentinel Agent API — Free pre-interaction veto gate for AI agents',
    description: 'No signup. OFAC SDN address screening with explicit coverage. green is not a clearance. llms.txt, OpenAPI, agent card and MCP-style tools endpoint.',
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
    'Free zero-signup pre-interaction veto gate for TRON / BTC / ETH addresses. OFAC SDN address-list screening with explicit coverage reporting. Not a full AML/KYT investigation.',
  featureList: [
    'OFAC SDN sanctioned-address screening (906 entries + 2 public records)',
    'Explicit coverage reporting: checksPerformed, notCovered, noData, recommendedAction',
    'TRON / BTC / ETH live on-chain activity heuristics',
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

      <p className="text-xs tracking-[0.3em] text-neon-cyan">
        FOR AUTONOMOUS AGENTS · <a href="/en/agent" className="text-slate-400 hover:text-neon-cyan">English version →</a>
      </p>
      <h1 className="mt-3 text-4xl font-bold text-white">交互前，先让 Agent 查一次</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-300">
        一道免费、零注册的否决门：无需 API key、无需信用卡，检查地址是否命中 OFAC SDN 等名单，并明确告诉 Agent「我们查了什么、没查什么、下一步该怎么做」。需要更高频率时，用一笔 TRON USDT 换取预付额度，Agent 自己就能完成「发现 → 付费 → 调用 → 查余额」的闭环。
      </p>

      <section className="mt-10 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">① 直接调用（零配置）</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/50 p-4 text-sm text-neon-cyan"><code>{code}</code></pre>
        <p className="mt-3 text-sm text-slate-400">
          返回 <code className="text-slate-200">level</code>（red / yellow / green）、<code className="text-slate-200">score</code>、<code className="text-slate-200">reasons[]</code>、<code className="text-slate-200">evidenceLinks[]</code>、<code className="text-neon-cyan">coverage</code> 与 <code className="text-slate-200">meta</code>。每个 IP 每分钟 30 次。
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-neon-cyan/40 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">② 诚实的能力边界（请务必读）</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          标签库共 <strong className="text-white">908 条</strong>：<strong className="text-white">906 条 OFAC SDN 地址</strong> + 2 条公开记录（Ronin Bridge、Silk Road 没收地址）。我们<strong className="text-white">没有</strong>实体归因（交易所 / 混币器 / drainer 标签）、没有多跳跨链追踪、没有 KYT 报告，也不产出可提交监管或法庭的证据。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          因此 <code className="text-neon-cyan">green 不等于「干净」</code>，它只表示「不在我们的名单里且链上活动正常」。每个响应都带 <code className="text-neon-cyan">coverage</code>：<code className="text-slate-200">verdictBasis</code>、<code className="text-slate-200">checksPerformed[]</code>、<code className="text-slate-200">notCovered[]</code>、<code className="text-slate-200">noData</code>、<code className="text-slate-200">degraded</code> 和 <code className="text-slate-200">recommendedAction</code>（block / escalate / proceed-with-caution）。<strong className="text-white">请按 recommendedAction 分支，而不是只看 level。</strong> 需要归因或资金追踪时，交给完整的 KYT / 取证服务。
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">③ 机器可读，出错不会卡住</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          所有错误都带稳定的 <code className="text-neon-cyan">error.code</code> 与 <code className="text-neon-cyan">error.hint</code>；遇到 402 / 429 时响应里直接附带 <code className="text-neon-cyan">payment</code> 对象（收款地址、网络、最低充值、可执行步骤）。Agent 不需要读人类文档就能自己恢复。上游不可达时 <code className="text-neon-cyan">coverage.degraded</code> 为 true，应重试或升级，不要把降级结果当筛查结论。
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">④ MCP 风格工具端点</h2>
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
            ['/api/v1/manifest', '机器可读能力清单、语义与数据源'],
            ['/api/v1/quote', '一次性充值报价'],
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
          <li>• 免费层：30 次/分钟/IP，零配置，永久可用。</li>
          <li>• 预付层：$0.01 / 次成功调用，1 USDT ≈ 100 次；TRON TRC20 非托管收款，服务不持有私钥。</li>
          <li>• 充值先取一次性报价（唯一 6 位小数金额），按精确金额转账；金额不符无法认领，防止他人冒领公开地址上的历史入账。</li>
          <li>• 幂等：同一 txId 只入账一次；带 X-Request-Id 的调用不会重复扣费。</li>
          <li>• 支付是 x402 风格的预付流程，<strong className="text-white">并非官方 x402 集成</strong>：标准 x402 客户端（CDP SDK / x402-fetch）无法直接付款，请按 llms.txt 的报价 → 转账 → 认领流程。</li>
          <li>• 只读筛查，不执行交易、不托管资金、不协助规避制裁；结果是风险信号，不构成法律意见或合规放行。</li>
        </ul>
      </section>
    </main>
  );
}
