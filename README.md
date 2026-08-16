<div align="center">

# ◆ ChainSentinel

### On-chain AML & Risk Screening Engine — Detect dirty-money addresses in 3 seconds

Multi-chain crypto address risk screening (TRON / BTC / ETH) · OFAC SDN sanctions · Hong Kong tax engine · Open-source core, commercial SaaS

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
![Platform](https://img.shields.io/badge/Platform-Node.js%2024-2ea44f)
![Chains](https://img.shields.io/badge/Chains-TRON%20%7C%20BTC%20%7C%20ETH-7170ff)
![Sanctions](https://img.shields.io/badge/OFAC%20SDN-900%2B%20addresses-red)
![Tests](https://img.shields.io/badge/Tests-92%20cases%20green-green)
[![Website](https://img.shields.io/badge/Website-chainsentinel.hk-38e0ff)](https://chainsentinel.hk)
[![Telegram](https://img.shields.io/badge/Telegram-%40chainsentinel-26A5E4)](https://t.me/+85293877936)
[![GitHub Stars](https://img.shields.io/github/stars/like96555-boop/chainsentinel?style=social)](https://github.com/like96555-boop/chainsentinel)

**Paste an address → instant red/yellow/green verdict with on-chain evidence links · fully transparent data sources · Stripe / USDT payment**

> **中文简介**：链哨 ChainSentinel —— 链上风控 KYT 引擎，3 秒识别黑钱地址。多链地址风险筛查（TRON/BTC/ETH）、OFAC 制裁名单、香港税务核算、可商用开源底座。官网 <https://chainsentinel.hk>。

[Quick Start](#-quick-start) · [Features](#-features) · [API Examples](#-api-examples) · [Open Source vs SaaS](#-open-source-vs-saas) · [Data Sources](#-data-sources--compliance) · [Contact](#-contact--support)

</div>

---

## ✦ Why ChainSentinel

| Your concern | How ChainSentinel answers |
|---|---|
| 😰 Received funds from a blacklisted address, account frozen | **3-second verdict** with evidence links you can verify and archive |
| 😰 Compliance screening too expensive | **900+ OFAC SDN sanctioned addresses built in for free** — zero node cost architecture |
| 😰 Data provenance unclear | Every verdict cites its source: official sanctions lists / law-enforcement records / heuristic observation |
| 😰 Crypto tax accounting is a mess | Hong Kong FIFO/LIFO/HIFO with DIPN 59 / Cap.112 legal mapping, audit-linked |
| 😰 Customers can't pay | **Stripe cards / Apple Pay / FPS + USDT (TRC-20 non-custodial)** dual channels |

## ✦ Features

| Module | Description |
|---|---|
| 🔍 **Multi-chain risk check** | TRON / BTC / ETH auto-detection; red/yellow/green verdict + risk score + reasons + evidence links |
| 🚫 **OFAC SDN sanctions** | 900+ US Treasury SDN addresses built in (TRON 188 / BTC 524 / ETH 96), official public data, daily sync |
| 📢 **On-chain risk alerts board** | Public threat intel: confirmed incidents (law-enforcement/security records) vs heuristic observations, source badges |
| 💰 **Smart money tracker** | Real on-chain footprints of institutions & whales + watchlist K-lines (lightweight-charts) |
| 🧮 **Hong Kong tax center** | FIFO / LIFO / HIFO cost-basis engine mapped to DIPN 59 / Cap.112, blacklist audit linkage |
| 🤖 **AI support agent** | Kimi streaming chat, visual config backend, graceful fallback |
| 🔑 **API metering** | Token-based daily quotas, 402 over-quota; Stripe + USDT dual payment, admin-managed plans |
| 🛡️ **Security architecture** | AES-256-GCM at-rest encryption · HMAC cookies · zod validation · in-memory rate limit · security headers |

## ✦ Quick Start

```bash
# 1) Clone
git clone https://github.com/like96555-boop/chainsentinel.git
cd chainsentinel

# 2) Install dependencies
npm ci

# 3) Build & run (MASTER_KEY auto-generated into .env on first start)
npm run build && npm start
# Open http://localhost:3000 — paste any address and try it
```

Admin panel: `http://localhost:3000/admin` (password in `.env` → `ADMIN_PASSWORD`).
Subscription center: `http://localhost:3000/dashboard` (API metering; production returns explicit 503 when payment keys are missing — never silently falls back).

## ✦ API Examples

```bash
# Free tier address risk check (per-IP rate limited, no token needed)
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"address":"0x098B716B8Aaf21512996dC57EB0615e2383E2f96"}'
# → {"level":"red","score":5,"reasons":["命中本地风险标签库：Ronin Bridge 攻击事件归集地址（2022-03）",...]}

# Subscribed (Bearer token) — daily quota metering, 402 when exhausted
curl -X POST http://localhost:3000/api/check \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"address":"TNiq9AXBp9EjUqhDhrwrfvAA8U3GUQZH81"}'
# → {"level":"red",...,"blacklist":{"source":"ofac-sdn","sourceLabel":"美国财政部 OFAC 制裁名单（官方公开数据）"}}
```

Live demo: **<https://chainsentinel.hk>** (public address checker, no sign-up).

## ✦ Open Source vs SaaS

| | Community (this repo) | Pro (SaaS) | Business (SaaS) |
|---|---|---|---|
| Multi-chain address check | ✅ Free (IP rate limit) | ✅ 1,000/day | ✅ 10,000/day |
| OFAC SDN sanctions | ✅ | ✅ | ✅ |
| Risk alerts board | ✅ | ✅ | ✅ |
| API tokens & metering | ✅ basic | ✅ | ✅ 5 tokens |
| Smart money Pro | 🔒 locked demo | ✅ | ✅ |
| Tax Center Pro | 🔒 locked demo | ✅ | ✅ |
| Pricing | Free | $29/mo | $199/mo |
| Commercial license | GPL-3.0 | subscription | subscription |

> GPL-3.0: free to use/modify; closed-source commercial use must comply with GPL or purchase a commercial license. Pro/Business are managed SaaS with no closed-source code.

## ✦ Data Sources & Compliance

- **OFAC SDN**: official US Treasury public-domain data, daily sync via `node scripts/intel-sync.mjs ofac`.
- **Raw on-chain data**: TronGrid / Blockstream / public RPC — zero node cost.
- **Heuristic labels**: our own observations (real addresses, non-official classification), signals only, never red-card alone.
- **Risk discipline**: red-card conclusions are backed only by confirmed events (law-enforcement/security records, official sanctions lists); heuristics are clearly marked "non-official".
- Results are risk signals only, not legal or investment advice.

## ✦ Tests

```bash
npm test            # regression 14 + security 16 + stress
npm run tax:test    # tax engine 17 (FIFO/LIFO/HIFO + audit linkage)
node scripts/intel-test.mjs    # intel 12 (OFAC sync / red-card / source labeling)
node scripts/billing-test.mjs  # metering 33 (USDT non-custodial; start with STRIPE_MOCK=1)
```

## ✦ Contact & Support

**Open-source free, commercial dual-track** — every use helps ChainSentinel grow:

- ⭐ **Star this repo** — help more people who need on-chain risk control find it
- 🐛 **Issues / PRs** — make KYT more accurate together
- 💼 **SaaS subscription** — $29/mo Pro: no deployment, daily sanctions updates, high API quota
- 🏢 **Commercial license / custom deployment** — GPL closed-source compliance, custom setup, compliance onboarding
- 🪙 **USDT donation** (TRC-20, non-custodial direct to maintainer): `TQ2VnvpsYyfyjFQMkJ1TdkDc4aAe1joAs1`

### 📮 Talk to the team directly

| Channel | Where |
|---|---|
| 🌐 Website | <https://chainsentinel.hk> (zh-CN / English) |
| ✈ **Telegram (support / sales / licensing)** | **<https://t.me/+85293877936>** |
| 🐙 GitHub | <https://github.com/like96555-boop/chainsentinel> |

> **Sales, API access, commercial licensing and RWA/stablecoin compliance consulting — contact us on Telegram.** Your Star is the biggest motivation for this open-source project. Using it is the best support.

## ✦ Disclaimer

ChainSentinel is an on-chain data analysis tool. Outputs are risk signals only and do not constitute legal, investment or financial advice. Users should independently verify and comply with local regulations. © 2026 ChainSentinel Limited (Hong Kong)
