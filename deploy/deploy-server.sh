#!/usr/bin/env bash
# 链哨 · 服务器一键部署（在已初始化的 Ubuntu 上执行，需先完成：ubuntu-init.sh + .env 配置）
# 用法：sudo bash deploy-server.sh   （或普通用户：bash deploy-server.sh）
# 前置：/opt/chainsentinel 已含代码；/opt/chainsentinel/.env 已配置（gen-strong-env.mjs 生成）
set -euo pipefail
cd /opt/chainsentinel

echo "==> 1/4 主站依赖与构建"
npm ci --registry=https://registry.npmmirror.com
npm run build

echo "==> 2/4 AI 管理台依赖与构建"
cd /opt/chainsentinel/ai-admin
npm ci --registry=https://registry.npmmirror.com
npm run build
cd /opt/chainsentinel

echo "==> 3/4 PM2 双进程启动"
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 ls

echo "==> 4/4 健康检查"
sleep 4
curl -sf http://127.0.0.1:3000/api/health && echo "  <- 主站 OK" || echo "  <- 主站健康检查失败！"
curl -sf http://127.0.0.1:3001/api/health && echo "  <- AI 管理台 OK" || echo "  <- AI 管理台健康检查失败！"

echo ""
echo "✅ 部署完成。最后一步：配置 Caddy"
echo "   1) 编辑 /etc/caddy/Caddyfile（用 deploy/Caddyfile 模板，替换域名）"
echo "   2) sudo systemctl reload caddy"
echo "   3) 确认 https://你的主域名/api/health 可访问"
