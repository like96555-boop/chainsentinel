#!/usr/bin/env bash
# 链哨 ChainSentinel · Ubuntu 24.04 服务器初始化脚本（阿里云香港 ECS，2C4G 起步）
# 用法：sudo bash ubuntu-init.sh
# 安装：Node.js 24 LTS + PM2 + Caddy（自动 HTTPS 反代）
set -euo pipefail

echo "==> 1/5 系统更新与基础工具"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git unzip ca-certificates gnupg lsb-release build-essential ufw

echo "==> 2/5 安装 Node.js 24 LTS（NodeSource）"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

echo "==> 3/5 安装 PM2 并配置开机自启"
npm install -g pm2 --registry=https://registry.npmmirror.com
pm2 startup systemd -u "$(whoami)" --hp "$HOME" | tail -1 || true

echo "==> 4/5 安装 Caddy（自动 HTTPS）"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
caddy version

echo "==> 5/5 防火墙（仅放行 80/443/22）"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

echo ""
echo "✅ 服务器基础环境就绪：Node $(node -v) / PM2 $(pm2 -v) / Caddy $(caddy version | awk '{print $1}')"
echo "   下一步："
echo "   1) 拷贝项目代码到 /opt/chainsentinel"
echo "   2) 生成强密码：node gen-strong-env.mjs"
echo "   3) 配置 .env（ADMIN_PASSWORD / MASTER_KEY / KIMI / STRIPE）"
echo "   4) 执行 deploy-server.sh"
