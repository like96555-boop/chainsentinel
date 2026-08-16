// 链哨 · 英文博客内容（真实产品能力 + 真实数据，无虚构）
// 约定：body 中以 "## " 开头的行渲染为小节标题，其余为正文段落
export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readingTime: string;
  excerpt: string;
  keywords: string[];
  body: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-check-if-usdt-address-is-blacklisted',
    title: 'How to Check if a USDT (TRC-20) Address Is Blacklisted',
    date: '2026-08-16',
    readingTime: '5 min read',
    excerpt:
      'Receiving USDT from a dirty address can freeze your account or tangle you in an investigation. Here is how to screen any TRON/USDT address against OFAC sanctions and laundering databases in seconds — free, no sign-up.',
    keywords: ['usdt blacklist check', 'tron address check', 'usdt trc20 risk screening', 'crypto aml'],
    body: [
      'If you run a merchant business, an OTC desk, or any operation that receives USDT (TRC-20), the worst email you can get is from your bank or exchange saying funds from a counterparty are tied to fraud, ransomware, or sanctions evasion. Accounts get frozen, payments get clawed back, and compliance teams start asking questions.',
      'The good news: dirty money almost always moves through identifiable addresses. Once a wallet has been linked to a phishing campaign, a mixer, a laundering channel, or a sanctioned entity, it rarely launders itself into a clean state. The practical problem is checking those addresses before you accept the payment — not after.',
      '## What a blacklist check actually covers',
      'A serious address screening checks against multiple threat sources at once:',
      'OFAC SDN sanctions — addresses designated by the US Treasury. Handling these can trigger immediate account freezes at any US-connected institution.',
      'Confirmed incident databases — addresses tied to publicly documented hacks, phishing operations, and scams (e.g. the Ronin Bridge attack collector wallets).',
      'Heuristic signals — contract risk, abnormal balance patterns, and recent activity anomalies that warrant extra review.',
      '## How to check a USDT address for free',
      'ChainSentinel provides a free public checker for TRON, BTC, and ETH addresses. Paste the address and get a red / yellow / green verdict in about 3 seconds, with the reasons and clickable on-chain evidence for every conclusion.',
      'No sign-up is required for the free checker — it is rate-limited to 10 checks per minute per IP, which is fine for manual screening of counterparties before a payment.',
      '## What the traffic-light verdict means',
      'Green (low risk) — no blacklist hit, and on-chain signals look normal. Safe to proceed, but keep your own due-diligence for large amounts.',
      'Yellow (medium risk) — flagged by heuristics. Review the evidence and the counterparty before releasing funds.',
      'Red (high risk) — matched a confirmed label such as OFAC SDN or a documented attack collector. Stop the transaction and do not move funds until you have legal advice.',
      'Every verdict lists its data source (official sanctions list / public incident records / heuristic observation) so the decision is auditable — important if you ever need to justify a rejection.',
      '## For merchants who need this at scale',
      'The free checker is manual. If you process many payments, ChainSentinel also exposes a REST API (POST /api/check) with token-based quota metering — from 1,000 checks/day on the $29/mo Pro plan to 10,000/day on Business. Webhook alerts notify you when a watched address changes risk status.',
      'The built-in label database covers 908 entries including the full OFAC SDN set (900+ addresses across TRON/BTC/ETH) plus verified public-incident records, and it is updated via daily sync.',
      'Bottom line: a 3-second check before every USDT payment is the cheapest insurance you can buy. Try it now at chainsentinel.hk — no sign-up, paste any TRON, BTC or ETH address.',
      'Questions about AML setups, OFAC screening for your business, or volume licensing? Reach the team directly on Telegram.',
    ],
  },
  {
    slug: 'ofac-sdn-crypto-address-screening-api',
    title: 'OFAC SDN Sanctions Screening for Crypto: A Free API Approach',
    date: '2026-08-16',
    readingTime: '6 min read',
    excerpt:
      'OFAC SDN designation is the fastest way for a crypto business to lose its banking. Screening addresses against the 900+ sanctioned wallets before every payout is now practical and cheap — here is a working API approach.',
    keywords: ['ofac sdn check', 'crypto sanctions screening', 'sanctioned wallet api', 'kyt api'],
    body: [
      'For any crypto business that touches US markets — or that wants to keep its banking relationships — the Office of Foreign Assets Control (OFAC) SDN list is not optional reading. The US Treasury has been designating crypto addresses for years, and banks and exchanges now screen counterparties routinely. One payment to a sanctioned wallet can end a business relationship overnight.',
      'The problem was always cost. Enterprise KYT suites (Chainalysis, Elliptic) run into five figures per year — fine for banks, absurd for a merchant processing a few hundred thousand USDT a month. Until recently, there was no middle ground.',
      '## What an OFAC SDN crypto check needs to do',
      'Match the exact address — sanctioned lists contain specific addresses (TRON, BTC, ETH), and the check must be an exact, normalized match with chain detection. No fuzzy guessing.',
      'Cite the source — a compliance officer needs to see why the flag fired: the OFAC designation, or a public incident record. Unlabeled red flags are useless for audits.',
      'Be instant — screening happens in a payment flow. A check that takes minutes is a check that never gets run.',
      '## The ChainSentinel approach',
      'ChainSentinel embeds 900+ OFAC SDN addresses (plus verified public-incident wallets) in a local risk-label database — 908 entries total across TRON, BTC, and ETH. The data comes from the US Treasury public-domain SDN list and is re-synced daily.',
      'The public endpoint is POST /api/check:',
      'Send {"address": "0x..."} and receive a level (red/yellow/green), a 0-100 risk score, the reasons, and evidence links in one response — typically under 3 seconds.',
      'On a red hit the response names the exact label and source, e.g. "OFAC SDN" or "Ronin Bridge attack collector". That is the audit trail you need to reject a counterparty defensibly.',
      'Free tier: no API key, rate-limited to 10 checks/min/IP — enough for manual vetting and to test integration. Paid tiers add token-based metering (1,000–10,000 checks/day), webhook alerts, and priority support.',
      '## Sanctions screening is a process, not a checkbox',
      'Screening addresses is one layer. Serious operations also monitor their own hot wallets, set up alerts when a counterparty address gets designated later, and keep records of every verdict. ChainSentinel\'s address monitoring and webhook alerting cover the "designated later" case — the most common way businesses get surprised.',
      'If you are building a payment flow, an OTC desk, or a stablecoin settlement layer, an OFAC SDN check on every counterparty is table stakes. The API above gives you that in a few lines of code.',
      'Need help integrating screening into your workflow, or a custom label database for your jurisdiction? Contact us on Telegram — we respond within hours, Mon–Sat.',
    ],
  },
  {
    slug: 'multi-chain-crypto-address-risk-screening',
    title: 'TRON / BTC / ETH Address Risk Screening: 3-Second Verdicts, Transparent Evidence',
    date: '2026-08-16',
    readingTime: '5 min read',
    excerpt:
      'How a multi-chain risk-screening engine works under the hood: chain auto-detection, OFAC + incident blacklists, heuristic scoring, and evidence links — and why transparency matters for a risk verdict you might have to defend.',
    keywords: ['crypto address risk screening', 'tron btc eth risk check', 'blockchain aml tool', 'address risk api'],
    body: [
      'Most teams know they should screen crypto addresses before receiving funds. Fewer know what a credible screening result looks like — and how to tell a real engine from a toy that just guesses a score.',
      'ChainSentinel is a multi-chain screening engine covering TRON, BTC, and ETH. Here is what happens when you paste an address, so you know exactly what you are getting.',
      '## 1. Chain auto-detection',
      'You paste an address; the engine detects the chain from the format — TRON (T...), BTC (1/3/bc1...), ETH (0x...). No dropdowns, no mistakes, no "please select chain" friction.',
      '## 2. Blacklist short-circuit',
      'The address is matched against the local risk-label database: 908 entries, including the full OFAC SDN set and documented attack/incident wallets. A hit returns an immediate red verdict with the exact label — no waiting on upstream APIs, no ambiguity.',
      '## 3. Heuristic scoring for everything else',
      'Addresses that are not blacklisted get scored on public on-chain signals: contract recognition, balance behavior, recent activity patterns. This yields a 0-100 score mapped to red/yellow/green. Heuristic results are explicitly labeled as observations — never presented as official determinations.',
      '## 4. Evidence links on every verdict',
      'Every conclusion includes clickable links to the explorer (TronGrid / Blockstream / public RPC) so you can verify the reasoning yourself. A verdict you can check is a verdict you can defend; a verdict you cannot check is a liability.',
      '## Where the data comes from',
      'Raw on-chain data comes from TronGrid, Blockstream, and public RPCs — no node infrastructure to run, no sync costs. The sanctions data is the US Treasury public-domain OFAC SDN list, re-synced daily. Incident records are public, documented events with sources attached.',
      '## Risk discipline matters',
      'A red flag should be rare and precise. ChainSentinel\'s discipline: red verdicts are backed only by confirmed events (sanctions lists, law-enforcement/security records). Heuristic observations can flag for review but never hard-block on their own. This keeps false positives low — which is what makes a screening tool usable instead of annoying.',
      '## Try it with any address',
      'The public checker at chainsentinel.hk takes any TRON, BTC, or ETH address with no sign-up. Watch the verdict, open the evidence links, and see the sources. If it looks right, the API is the same engine for your payment flow.',
      'For screening at volume, licensing, or compliance consulting for stablecoin/RWA operations, talk to us on Telegram.',
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
