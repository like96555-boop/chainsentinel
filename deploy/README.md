# 链哨 ChainSentinel · 阿里云香港 ECS 部署指南（上线通道）

目标环境：Ubuntu 24.04 · 2C4G（起步）· Node.js 24 LTS · PM2 双进程 · Caddy 自动 HTTPS
域名：`chainsentinel.hk`（主站）+ `ai.chainsentinel.hk`（AI 管理台）

## 服务器侧执行顺序（全程约 10 分钟）

### 1. 初始化环境（一次性）

```bash
# 上传代码到服务器后（见下），在服务器上：
cd /opt/chainsentinel
sudo bash deploy/ubuntu-init.sh        # Node24 + PM2 + Caddy + 防火墙(80/443/22)
```

### 2. 配置强凭据（一次性）

```bash
cd /opt/chainsentinel
node deploy/gen-strong-env.mjs          # 生成强随机凭据
nano .env                               # 粘贴生成结果；再填 STRIPE / KIMI / TRONSCAN
```

`.env` 必改项：`MASTER_KEY`（AES 根密钥，**备份！**）、`ADMIN_PASSWORD`（主站后台）、`AI_ADMIN_PASSWORD`（ai.子域后台）、`NEXT_PUBLIC_BASE_URL`（https://你的主域名）。

### 3. 一键部署

```bash
sudo bash deploy/deploy-server.sh       # 构建双应用 + PM2 启动 + 健康检查
```

### 4. 配置 Caddy 域名与 HTTPS

```bash
# 域名解析（阿里云云解析，指向服务器公网 IP）：
#   A 记录  chainsentinel.hk    → 服务器公网 IP
#   A 记录  www.chainsentinel.hk → 服务器公网 IP
#   A 记录  ai.chainsentinel.hk  → 服务器公网 IP
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

完成后：
- `https://chainsentinel.hk` → 主站（端口 3000）
- `https://ai.chainsentinel.hk` → AI 管理台（端口 3001）
- 服务器 `.env` 中 `NEXT_PUBLIC_BASE_URL=https://chainsentinel.hk`

### 5. Stripe 生产接入（收款上线）

1. Stripe Dashboard 创建产品/价格，复制 Price ID → **后台「计费与支付」模块录入**（套餐定价/配额/Price ID 均后台可维护，保存即生效，无需改代码）。
2. Stripe Webhooks 添加端点：`https://你的主域名/api/billing/webhook`，订阅事件：
   `checkout.session.completed` / `invoice.paid` / `customer.subscription.deleted`。
3. 把 `sk_live_*` 与 `whsec_*` 填入服务器 `.env`（`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`）。
4. 重启主站：`pm2 restart chainsentinel-main`。此时 Checkout 走真实支付，mock 模式自动关闭。

### 6. 情报源与数据运营

```bash
cd /opt/chainsentinel
node scripts/intel-sync.mjs                  # 默认源：链上启发式（无需 key）
node scripts/intel-sync.mjs tronscan         # TRONSCAN 源（需 TRONSCAN_API_KEY）
# 定时同步建议（crontab）：
# 0 6 * * * cd /opt/chainsentinel && node scripts/intel-sync.mjs >> logs/intel.log 2>&1
```

## 运维速查

| 操作 | 命令 |
|---|---|
| 查看主站状态 | `pm2 status` / `pm2 logs chainsentinel-main` |
| 重启主站 | `pm2 restart chainsentinel-main` |
| 查看数据 | `cat /opt/chainsentinel/data/*.json`（密钥为加密文件 secrets.enc.json） |
| 备份 | `tar czf backup-$(date +%F).tgz data .env` |
| 更新代码 | `git pull && npm run build && pm2 restart chainsentinel-main`（建议先在本地测试全绿） |

## 安全基线（上线前核对）

- [ ] `.env` 全部强随机（MASTER_KEY 32 字节 hex / 两个后台密码 24 hex）
- [ ] 防火墙仅放行 22/80/443（`ufw status` 确认）
- [ ] 服务器 .env 与 data/secrets.enc.json 不进 git（.gitignore 已覆盖）
- [ ] Caddy 已启用 HSTS / nosniff / X-Frame-Options（模板已含）
- [ ] TRONSCAN API key 未写进代码/仓库，仅存 .env
- [ ] PM2 `pm2 save` 已执行（开机自启）
