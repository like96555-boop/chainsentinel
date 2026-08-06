@echo off
chcp 65001 >nul
title 链哨 AI 客服管理台 (独立部署 · 端口 3001)
for %%P in ("C:\Program Files\nodejs") do set "PATH=%%~P;%PATH%"
echo 正在启动 AI 客服管理台  http://localhost:3001 ...
start "" http://localhost:3001
cd /d "%~dp0"
if not exist node_modules (
  echo 首次运行，安装依赖（约 1 分钟）...
  call npm install --registry=https://registry.npmmirror.com
)
if not exist .next (
  echo 首次构建...
  call npm run build
)
npm start
pause
