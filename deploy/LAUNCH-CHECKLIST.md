# 链哨 ChainSentinel · 上线前置条件清单（Launch Checklist）

> 纪律：**每一项都标注了「缺失后果」**。凡标 🔴 的项目缺失 = 上线即出问题（客户投诉/收不到钱），
> 必须在正式对外发布前完成并逐项打勾。上线当天按本清单从头到尾核对一遍。

## 🔴 收款链路（Stripe）—— 缺失则客户无法付款，必投诉

| # | 事项 | 缺失后果 | 操作 | 状态 |
|---|---|---|---|---|
| 1 | 注册 Stripe 账号（公司邮箱 + 香港公司资料） | 无法收款 | dashboard.stripe.com 注册 | ☐ |
| 2 | **绑定香港银行账户**（提现收款账户） | 钱到不了你账户 | 注册流程第 ② 步 / Settings → Payouts | ☐ |
| 3 | 测试模式拿 sk_test（注册即得，无需审核） | 无法验证真实支付链路 | Dashboard → Developers → API keys | ☐ |
| 4 | **生产模式审核**（公司资料+网站+业务描述） | 只能测试不能收真钱 | Dashboard → Settings → 激活账户 | ☐ |
| 5 | 创建 Stripe 产品/价格，把 Price ID 填入**后台「计费与支付」模块**（pro/business 的 Price ID 字段） | Checkout 创建失败，订阅 503 | Dashboard → Products → 建两个订阅价格 → 后台录入 | ☐ |
| 6 | 服务器 `.env` 配置 `STRIPE_SECRET_KEY=sk_live_*` + `STRIPE_WEBHOOK_SECRET=whsec_*` | 订阅接口返回 503「收款通道未配置」；webhook 拒收 → 支付成功但令牌不激活 | Stripe → Webhooks → 端点 `https://域名/api/billing/webhook`，订阅 3 个事件 | ☐ |
| 7 | 收款链路验收（必须真实跑一遍） | 上线才发现支付 bug | 用 sk_test 走完整订阅（测试卡 4242…）→ 确认令牌激活 → 续费 → 取消 | ☐ |

> ⚠️ 代码纪律（已内置）：未配置真实密钥时订阅接口**返回 503 明确报错**，绝不 fallback 到本地演示
> （防止客户不扣款白得令牌）。本地/演示环境才允许 `STRIPE_MOCK=1`。

## 🔴 服务器与域名

| # | 事项 | 缺失后果 | 操作 | 状态 |
|---|---|---|---|---|
| 8 | 阿里云香港 ECS（Ubuntu 24.04，2C4G） | 无法上线 | 控制台开通，给 Hermes IP+SSH | ☐ |
| 9 | 域名注册 + 实名认证（如 chainsentinel.com） | 无品牌域名；Stripe 生产审核通常要求网站 | 阿里云域名注册 | ☐ |
| 10 | 域名解析 A 记录 → ECS IP | 域名打不开 | 云解析 DNS | ☐ |
| 11 | Caddy HTTPS 配置（主域 → 3000，ai.子域 → 3001） | 无 HTTPS，浏览器告警，支付页不信任 | deploy/Caddyfile（Hermes 执行） | ☐ |
| 12 | 部署双应用 + 健康检查通过 | 无法访问 | deploy/deploy-server.sh（Hermes 执行） | ☐ |
| 13 | `.env` 强密码（MASTER_KEY/ADMIN_PASSWORD/AI_ADMIN_PASSWORD） | 弱密码被爆破，密钥泄露 | deploy/gen-strong-env.mjs 生成 | ☐ |

## 🟡 运营配置（缺失不影响上线，但影响体验/合规）

| # | 事项 | 缺失后果 | 操作 | 状态 |
|---|---|---|---|---|
| 14 | 情报 cron 自动同步（OFAC 每日 + 启发式） | 制裁名单过期，筛查失效 | crontab（Hermes 部署时配置） | ☐ |
| 15 | TRONSCAN API key（可选） | 无官方标签源（启发式+OFAC 已够用） | tronscan.org 注册（注册不了可跳过） | ☐ |
| 16 | AI 客服 Kimi 密钥 | AI 客服降级为友好提示 | 后台密钥管理或 .env | ☐ |
| 17 | 免责声明/隐私条款页面 | 合规瑕疵 | 站点设置（后台） | ☐ |

## ✅ 上线当天最终核验（发布前 30 分钟）

1. `https://域名/api/health` 200
2. 首页查一个 OFAC 制裁地址 → 红牌 + 来源标注正确
3. `/dashboard` 选专业版 → 填邮箱 → 跳转 Stripe（测试卡 4242…）→ 支付成功 → 令牌展示 → 用量查询正常
4. Webhook 收到 `checkout.session.completed`（Stripe Dashboard → Events 可查）
5. `pm2 status` 双进程 online；`pm2 save` 已执行（开机自启）

> 完成第 1-7 项（收款链路）是「正式对外收费」的前提；其余项可并行推进。
