@echo off
chcp 65001 >nul
title 链哨 ChainSentinel - 一键启动
cd /d "%~dp0"

echo ============================================
echo   链哨 ChainSentinel ^| 一键部署启动
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 20+ ：https://nodejs.org/
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo [OK] Node.js %%v

if not exist .env (
  copy .env.example .env >nul
  echo [提示] 已从 .env.example 生成 .env，请按需修改 ADMIN_PASSWORD
)

echo [1/3] 安装依赖...
call npm ci --registry=https://registry.npmmirror.com
if errorlevel 1 goto fail

echo [2/3] 构建生产版本...
call npm run build
if errorlevel 1 goto fail

echo [3/3] 启动服务： http://localhost:3000  （后台 /admin）
call npm start
goto end

:fail
echo [错误] 部署失败，请查看上方日志。
pause

:end
