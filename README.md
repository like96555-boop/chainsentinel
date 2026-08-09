# 链哨 ChainSentinel（P0+多链版）

面向商户与机构的链上风控 SaaS —— **3 秒识别黑钱地址**，红绿灯结论 + 链上证据直达各链浏览器。

**支持链**：TRON（T 开头，TronGrid/Tronscan）· BTC（bc1/1/3 开头，Blockstream）· ETH（0x，公共 RPC/Etherscan）。地址粘贴后**自动识别链**，无需手动选择。

技术栈：Next.js 14（App Router）+ TypeScript + Tailwind CSS + framer-motion + lucide-react + zod。

---

## 一键部署

### 方式 ① Windows 双击

双击根目录 **`启动.bat`**：自动检查 Node.js → `npm ci` → `npm run build` → `npm start`，浏览器打开 <http://localhost:3000>。

PowerShell 用户也可执行：`.\deploy.ps1`（同逻辑）。

### 方式 ② Docker

```bash
cp .env.example .env   # 按需修改 ADMIN_PASSWORD 等
docker compose up -d
```

访问 <http://localhost:3000>。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | 管理后台登录密码，请务必修改默认值 |
| `MASTER_KEY` | 自动生成 | 32 字节 hex，用于 AES-256-GCM 加密落盘密钥。首次启动缺失时自动生成并写入 `.env`，**请备份** |
| `KIMI_API_KEY` | 否 | AI 客服模型密钥；亦可在 `/admin` 后台配置（加密存储，优先级更高）。缺失时 AI 客服降级为友好提示 |
| `KIMI_BASE_URL` | 否 | Kimi OpenAI 兼容接口地址，默认 `https://api.kimi.com/coding/v1` |
| `TRONGRID_API_KEY` | 否 | TronGrid API Key，缺失时走公共额度 |
| `STRIPE_SECRET_KEY` | 否 | Stripe 密钥（sk_test_*/sk_live_*）。缺失时订阅走 mock 模式（本地演示/测试） |
| `STRIPE_WEBHOOK_SECRET` | 否 | Stripe Webhook 签名密钥（whsec_*），生产收款必配 |
| `NEXT_PUBLIC_BASE_URL` | 否 | 站点公网地址，用于构造 Checkout 回跳；生产部署必填 |
| `TRONSCAN_API_KEY` | 否 | TRONSCAN 免费 API key（tronscan.org 注册），配置后启用官方标签情报源 |

> 初始密钥放 `.env` 即可生效；后台 `/admin` 配置的密钥加密后优先于环境变量。

## 管理后台

- 入口：**`/admin`**，用 `ADMIN_PASSWORD` 登录（HttpOnly Cookie 会话，2 小时有效）。
- 功能：密钥管理（掩码显示 / 加密写入）、系统状态（TronGrid 连通性 / 密钥配置 / 黑名单条数）、预约线索列表。

## 安全说明

- 密钥一律 **AES-256-GCM** 加密落盘（`data/secrets.enc.json`），`GET /api/admin/secrets` 只返回掩码（如 `sk-****x9f2`）。
- 密钥仅服务端使用，无 `NEXT_PUBLIC_` 前缀，前端 bundle 不含任何密钥。
- 全部公开接口 zod 校验入参 + 内存限流（每 IP 每分钟 10 次）。
- 安全响应头：`X-Content-Type-Options` / `X-Frame-Options: DENY` / `Referrer-Policy` / 基础 CSP。
- `.gitignore` 已排除 `.env*`、`data/secrets*`、`data/leads.json`。

## 功能清单（已建成并实测）

| 页面 | 说明 |
|---|---|
| `/` 落地页 | Hero 免注册多链查询（TRON/BTC/ETH 自动识别）、主流币行情条、功能卡、定价、RWA 咨询表单、AI 客服 |
| `/alerts` 链上风险警示榜 | 免费公开的链上风险情报（**全部为真实地址**：公开执法/安全事件记录 + 链上特征启发式标记）：按链/类型筛选、分页、掩码地址、证据链接直达链浏览器、一键核查 |
| `/smart-money` 聪明钱动向 | 机构/巨鲸地址实时链上数据（余额/交易数/最近动态时间线）+ 关注标的 K 线走势（30 日）；Feature Gate 免费 3 地址×3 动态 |
| `/dashboard` 订阅中心 | API 计量扣费自助：套餐选择（免费/专业/商业）、Stripe 收款（或本地 mock）、令牌一次性展示、用量查询（今日剩余/7 日趋势） |
| `/tax` 税务中心 | 香港口径虚拟资产税务核算（FIFO/LIFO/HIFO + DIPN 59/Cap.112 法律映射 + 黑名单审计联动） |
| `/pro/smart-money` | Pro 功能锁态演示（升级引导） |
| `/admin` 管理后台 | 密钥加密管理（掩码显示）、系统状态、预约线索、聪明钱监控 CRUD、API 令牌（配额/用量/吊销）、Webhook、营销横幅、黑名单库（含批量导入）、站点设置、操作日志 |

## API 订阅计量扣费（已建成并实测 26/26）

- 计量口径：`Authorization: Bearer cs_live_xxx` 每请求计 1 次，按自然日（Asia/Shanghai）配额扣减；超额返回 **402**。
- 套餐：免费（IP 限流 100 次/日）· 专业 $29/月（1 令牌 1000 次/日）· 商业 $199/月（5 令牌 10000 次/日）。
- 收款：Stripe Checkout 订阅 + Webhook 验签（checkout.session.completed / invoice.paid / customer.subscription.deleted）。
  - 未配置 `STRIPE_SECRET_KEY` 时自动走 **mock 模式**（本地演示/全链路测试），配置真实密钥后自动切换真实支付。
- 令牌安全：明文仅在支付成功时展示一次，AES-256-GCM 加密落盘，后台仅见掩码。
- 测试：`node scripts/billing-test.mjs`（服务以 `STRIPE_MOCK=1` 启动时全绿 26/26）。

## 数据说明（真实种子，2026-08-09 起）

**风控分级纪律：红牌结论只由已确认事件支撑；特征观察仅为提示，不构成定性。**

- `data/blacklist.json`（红牌，908 条）—— Ronin Bridge 攻击归集（ETH）、Silk Road 执法没收（BTC）2 条执法/安全事件种子 + **906 条美国财政部 OFAC SDN 制裁地址**（TRON 188 / BTC 524 / ETH 96 + USDT 归链，官方公开数据）。
- `data/alerts.json`（警示榜，8 条）—— 2 条已确认事件（`public-record` 蓝色「已确认事件」徽章）+ 6 条**特征观察**（`onchain-heuristic` 灰色「特征观察」徽章；真实地址、TronGrid 实查，明示非官方定性）。
- 情报同步：`node scripts/intel-sync.mjs`（默认 heuristic-tron 源，**仅产出特征观察进警示榜，不进黑名单**；`intel-sync.mjs tronscan` 官方标签源需 `TRONSCAN_API_KEY`，产出进黑名单；**`intel-sync.mjs ofac` 拉取美国财政部 OFAC SDN 制裁名单（官方公开数据，零申请），产出进黑名单——当前黑名单 906 条制裁地址**）。

## 测试

服务运行中执行（功能回归 14 项 + 新功能全链路 15 项 + 安全 16 项 + 压测 + 税表 17 项 + 情报源 8 项 + 计量扣费 26 项）：

```bash
npm test
node scripts/tax-test.mjs        # 税务中心（FIFO/LIFO/HIFO + 审计联动）
node scripts/intel-test.mjs      # 情报源导入与同步
node scripts/billing-test.mjs    # API 计量扣费（需服务以 STRIPE_MOCK=1 启动）
```

报告自动保存到 `test-reports/`。最近一次实测（2026-08-09）：回归 14/14、安全 16/16、压测通过、税表 17/17、情报源 8/8、计量扣费 26/26（真实链上数据：Ronin 黑客 101.8 ETH、Silk Road 0.33 BTC）。

## 目录结构

```
├── app/                    # App Router
│   ├── page.tsx            # 落地页（Hero 查询框/计数器/功能/定价/咨询表单）
│   ├── layout.tsx          # 全局布局 + 浮动 AI 客服
│   ├── alerts/             # 链上风险警示榜（真实数据源）
│   ├── smart-money/        # 聪明钱追踪
│   ├── tax/                # 税务中心（香港口径）
│   ├── dashboard/          # 订阅中心（API 计量扣费自助）
│   ├── pro/smart-money/    # Pro 功能演示（Feature Gate 锁态）
│   ├── admin/              # 管理后台
│   └── api/
│       ├── check/          # 地址风险检测（zod+限流+黑名单+计量扣费）
│       ├── billing/        # 订阅计量：plans/checkout/webhook/usage/mock-checkout
│       ├── chat/           # AI 客服（Kimi 流式转发，未配置降级）
│       ├── lead/           # 预约表单 → data/leads.json
│       └── admin/          # login/logout/secrets/status/keys/webhooks/banners/blacklist/settings/audit/billing
├── components/             # ChatWidget / AddressChecker / BannerCarousel / admin 模块
├── lib/                    # crypto / secrets / session / rate-limit / tron / blacklist
│                           # billing（计量引擎）/ stripe（支付客户端）/ orders（订单）
├── data/                   # blacklist(真实种子) / alerts(真实种子) / api-keys / webhooks / banners / site-settings / audit-log / orders
├── scripts/                # regression/security/stress/tax/intel/billing 测试 + intel-sync 情报同步
├── deploy/                 # 服务器部署包（ubuntu-init / deploy-server / PM2 / Caddy / 强密码生成）
├── Dockerfile              # node:24-alpine 多阶段
├── docker-compose.yml
├── 启动.bat / deploy.ps1   # Windows 一键部署
└── .env.example
```

## 免责声明

风控结果仅为风险提示，不构成法律意见或投资建议。© 2026 ChainSentinel Limited (Hong Kong)。
