# 链哨 ChainSentinel - PowerShell 一键部署
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "============================================"
Write-Host "  链哨 ChainSentinel | 一键部署启动"
Write-Host "============================================"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未检测到 Node.js，请先安装 Node.js 20+ ：https://nodejs.org/"
    exit 1
}
Write-Host "[OK] Node.js $(node -v)"

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "[提示] 已从 .env.example 生成 .env，请按需修改 ADMIN_PASSWORD"
}

Write-Host "[1/3] 安装依赖..."
npm ci --registry=https://registry.npmmirror.com

Write-Host "[2/3] 构建生产版本..."
npm run build

Write-Host "[3/3] 启动服务： http://localhost:3000  （后台 /admin）"
npm start
