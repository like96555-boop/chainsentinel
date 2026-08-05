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

## 测试

服务运行中执行（三套件：功能回归 12 项 + 安全 16 项 + 压测）：

```bash
npm test
```

报告自动保存到 `test-reports/`。最近一次实测（2026-08-05）：回归 12/12、安全 16/16、首页 100 并发 100% 成功 p95=180ms、/api/check 限流冲击下 429 拒绝成本 51ms、内存无异常。

## 目录结构

```
├── app/                    # App Router
│   ├── page.tsx            # 落地页（Hero 查询框/计数器/功能/定价/咨询表单）
│   ├── layout.tsx          # 全局布局 + 浮动 AI 客服
│   ├── pro/smart-money/    # Pro 功能演示（Feature Gate 锁态）
│   ├── admin/              # 管理后台
│   └── api/
│       ├── check/          # 地址风险检测（zod+限流+黑名单+TronGrid 启发式）
│       ├── chat/           # AI 客服（Kimi 流式转发，未配置降级）
│       ├── lead/           # 预约表单 → data/leads.json
│       └── admin/          # login/logout/secrets/status
├── components/             # ChatWidget / AddressChecker / Counter
├── lib/                    # crypto / secrets / session / rate-limit / tron / blacklist
├── data/blacklist.json     # 演示黑名单种子（3 条）
├── Dockerfile              # node:24-alpine 多阶段
├── docker-compose.yml
├── 启动.bat / deploy.ps1   # Windows 一键部署
└── .env.example
```

## 免责声明

风控结果仅为风险提示，不构成法律意见或投资建议。© 2026 ChainSentinel Limited (Hong Kong)。
