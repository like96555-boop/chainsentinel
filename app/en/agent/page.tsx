import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free OFAC SDN Address Screening API for AI Agents — No Signup',
  description:
    'Check whether a TRON / BTC / ETH address is on the OFAC SDN list with one curl. No API key, no account, 30 requests/min/IP. Every verdict reports coverage: what was checked, what was not, and the recommended action. green / a non-match is not a clearance.',
  keywords: [
    'OFAC SDN address API', 'free crypto sanctions screening API', 'AI agent address screening',
    'no signup blockchain API', 'TRON address blacklist check', 'MCP server crypto compliance',
    'llms.txt', 'machine-readable risk verdict',
  ],
  alternates: {
    canonical: '/en/agent',
    languages: { 'zh-CN': '/agent', en: '/en/agent', 'x-default': '/en/agent' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Free OFAC SDN Address Screening API for AI Agents — No Signup',
    description:
      'One curl, no credentials. Explicit coverage of what was checked and what was not. A free first-pass veto gate, not a full AML/KYT investigation.',
    url: 'https://chainsentinel.hk/en/agent',
  },
};

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ChainSentinel Agent API',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (HTTP API)',
  url: 'https://chainsentinel.hk/en/agent',
  sameAs: 'https://chainsentinel.hk/agent',
  description:
    'Free zero-signup pre-interaction veto gate for TRON / BTC / ETH addresses. OFAC SDN address-list screening with explicit coverage reporting. Not a full AML/KYT investigation; a non-match is not a clearance.',
  featureList: [
    'OFAC SDN sanctioned-address screening (906 entries + 2 public records)',
    'Explicit coverage: checksPerformed, notCovered, noData, degraded, recommendedAction',
    'TRON / BTC / ETH live on-chain activity heuristics',
    'Zero-signup free tier for autonomous AI agents',
    'Stable machine-readable error codes and 402/429 payment instructions',
    'llms.txt, OpenAPI 3.1, agent card and MCP-style JSON-RPC tools',
  ],
  offers: [
    { '@type': 'Offer', name: 'Free tier', price: '0', priceCurrency: 'USD', description: '30 address checks per minute per IP, no credentials required.' },
    { '@type': 'Offer', name: 'Prepaid agent credits', price: '0.01', priceCurrency: 'USD', description: '0.01 USD per successful check, minimum top-up 1 USDT (TRC20 on TRON).' },
  ],
  provider: { '@type': 'Organization', name: 'ChainSentinel Limited', url: 'https://chainsentinel.hk' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I check if a crypto address is on the OFAC SDN list?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'POST the address as JSON to https://chainsentinel.hk/api/v1/check, for example curl -X POST https://chainsentinel.hk/api/v1/check -H "Content-Type: application/json" -d \'{"address":"TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81"}\'. No API key or account is needed. The response contains level, score, reasons, evidenceLinks and a coverage object. Supported formats: TRON (T...), BTC and ETH.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does a green result or a non-match prove an address is clean?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. A non-match means the address is not in our list of 906 OFAC SDN addresses and 2 public records, and that its on-chain activity looked normal. We have no entity attribution, no multi-hop or cross-chain tracing, and no KYT report. Treat green as "no objection found in a narrow check", not as a clearance. Branch on coverage.recommendedAction (block / escalate / proceed-with-caution), not on level alone.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need an API key, an account or a credit card?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The free tier allows 30 checks per minute per IP with zero configuration. For higher volume, an agent can obtain prepaid credits by requesting a one-time quote, sending that exact USDT (TRC20) amount, and claiming it with the transaction hash. No card form, no KYC, no private key held by the service.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does this API support the official x402 protocol?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. The payment flow is x402-inspired but is NOT an official x402 facilitator integration. Standard x402 clients such as the Coinbase CDP SDK or x402-fetch cannot pay this endpoint. Use the quote → transfer → claim flow documented in /llms-full.txt. The service is not listed in the CDP Bazaar.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which chains and address formats are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'TRON (T... base58), Bitcoin and Ethereum addresses. The chain is auto-detected from the address format. Unsupported or malformed addresses return a stable machine-readable error code (UNSUPPORTED_ADDRESS_FORMAT / INVALID_ADDRESS) with a hint.',
      },
    },
  ],
};

const code = `curl -X POST https://chainsentinel.hk/api/v1/check \\
  -H 'Content-Type: application/json' \\
  -d '{"address":"TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81"}'`;

const agentPseudo = `const r = await check(address);
switch (r.coverage.recommendedAction) {
  case 'block':                 return abort('sanctions list hit');
  case 'escalate':              return handOffToHuman(r.coverage.interpretation);
  case 'proceed-with-caution':  return proceed({ note: 'narrow check only' });
}
// coverage.degraded === true → retry; never treat as a verdict`;

const discovery = [
  ['/llms.txt', 'Short entry point for LLMs'],
  ['/llms-full.txt', 'Complete integration guide with examples'],
  ['/api/v1/manifest', 'Machine-readable capabilities, semantics, prices, error codes'],
  ['/api/openapi.json', 'OpenAPI 3.1 specification'],
  ['/.well-known/agent-card.json', 'Agent card discovery document'],
  ['/api/mcp', 'MCP-style stateless JSON-RPC tools'],
  ['/api/v1/balance', 'Check remaining prepaid credits'],
];

export default function EnAgentPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14 text-slate-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <p className="text-xs tracking-[0.3em] text-neon-cyan">FOR AUTONOMOUS AGENTS · ZERO SIGNUP</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-white">
        Free OFAC SDN address screening API for AI agents
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-300">
        A free first-pass veto gate before your agent sends funds to, receives funds from, or otherwise interacts with a
        crypto address. One HTTP request, no API key, no account, no credit card. Every verdict explicitly reports what
        was checked, what was <em>not</em> checked, and what the agent should do next.
      </p>

      <section className="mt-10 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Quick start — one curl, no credentials</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/50 p-4 text-sm text-neon-cyan"><code>{code}</code></pre>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Response: <code className="text-slate-200">chain</code>, <code className="text-slate-200">level</code> (red /
          yellow / green), <code className="text-slate-200">score</code>, <code className="text-slate-200">reasons[]</code>,{' '}
          <code className="text-slate-200">evidenceLinks[]</code>, <code className="text-neon-cyan">coverage</code> and{' '}
          <code className="text-slate-200">meta</code>. Rate limit: 30 checks / minute / IP. Errors are stable enums:{' '}
          <code className="text-slate-200">{'{ok:false,error:{code,message,hint}}'}</code>.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-neon-cyan/40 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Read this before trusting a verdict</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          The library contains <strong className="text-white">908 entries: 906 OFAC SDN addresses + 2 public
          records</strong> (Ronin Bridge, Silk Road seizure). There is <strong className="text-white">no entity
          attribution</strong> (exchange / mixer / drainer labels), <strong className="text-white">no multi-hop or
          cross-chain tracing</strong>, <strong className="text-white">no KYT report</strong>, and no evidence package
          suitable for a regulator or court.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          <strong className="text-neon-cyan">green is NOT a clearance.</strong> It means &ldquo;not found in our list,
          with normal on-chain activity&rdquo;. Absence of a listing is not evidence of clean funds. Branch on{' '}
          <code className="text-neon-cyan">coverage.recommendedAction</code> instead of the colour.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/50 p-4 text-xs text-slate-300"><code>{agentPseudo}</code></pre>
        <p className="mt-3 text-xs text-slate-400">
          <code>coverage</code> carries <code>verdictBasis</code>, <code>checksPerformed[]</code>,{' '}
          <code>notCovered[]</code>, <code>noData</code>, <code>degraded</code>, <code>upstreamQueried</code>,{' '}
          <code>greenIsNotClearance</code> and <code>interpretation</code>. If <code>degraded</code> is true, retry or
          escalate — never treat it as a screening conclusion. For attribution or fund tracing, hand off to a full
          KYT / forensics provider.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Self-service credits — agent completes the loop alone</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
          <li>On <code>402 PAYMENT_REQUIRED</code> or <code>429 RATE_LIMITED</code>, read the <code>payment</code> object in the response (address, network, minimum, executable steps).</li>
          <li><code>POST /api/v1/quote</code> → a one-time exact 6-decimal USDT amount (30 min TTL). The exact amount binds the transfer to your quote so nobody else can claim an incoming txId.</li>
          <li>Send <strong className="text-white">exactly</strong> that amount in USDT (TRC20 / TRON), then <code>POST /api/v1/topup</code> with <code>{'{txId, quoteId}'}</code>.</li>
          <li>Store the returned <code>cs_agent_*</code> Bearer credential; each successful paid check costs $0.01. Check <code>/api/v1/balance</code> any time.</li>
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Idempotent twice over: one txId credits exactly once, and a paid call with the same{' '}
          <code>X-Request-Id</code> is never billed twice. Non-custodial — the service holds no private key.{' '}
          <strong className="text-white">This is NOT official x402</strong>: CDP SDK / x402-fetch clients cannot pay
          this endpoint and it is not in the CDP Bazaar. Do not send <code>X-PAYMENT</code> headers expecting settlement.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-cyber-700 bg-cyber-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">MCP-style tools &amp; desktop bridge</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          <code>POST /api/mcp</code> is a stateless JSON-RPC endpoint supporting <code>initialize</code>,{' '}
          <code>tools/list</code>, <code>tools/call</code> and <code>ping</code>. Tools:{' '}
          <code>check_address</code>, <code>get_balance</code>, <code>topup_info</code>. No session, no SSE. For desktop
          clients that need stdio, the repository ships a zero-dependency bridge at{' '}
          <code>mcp/stdio-bridge.mjs</code> (<code>node mcp/stdio-bridge.mjs</code>, both newline and Content-Length
          framing). It is a lightweight tools endpoint, not a full stateful MCP session server.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">Discovery endpoints</h2>
        <p className="mt-2 text-sm text-slate-400">
          An agent that only knows the root domain can discover the full contract from these files.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {discovery.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg border border-cyber-700 px-4 py-3 transition hover:border-neon-cyan/60">
              <span className="block font-mono text-sm text-neon-cyan">{href}</span>
              <span className="block text-xs text-slate-400">{label}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">Frequently asked questions</h2>
        <div className="mt-4 space-y-5">
          {faqJsonLd.mainEntity.map((q) => (
            <div key={q.name}>
              <h3 className="text-base font-semibold text-white">{q.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-cyber-700 p-6">
        <h2 className="text-xl font-semibold text-white">Scope &amp; limits</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>• Read-only screening. No trading execution, no custody, no sanctions-evasion assistance.</li>
          <li>• Risk signals, not legal advice or compliance clearance.</li>
          <li>• If an upstream chain data source is unavailable, the verdict degrades to yellow with <code>degraded: true</code>.</li>
          <li>• 中文版说明见 <a href="/agent" className="text-neon-cyan hover:underline">/agent</a>。</li>
        </ul>
      </section>
    </main>
  );
}
