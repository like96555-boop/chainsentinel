// 链哨 · PM2 双进程配置（主站 3000 + AI 管理台 3001）
// 使用：pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'chainsentinel-main',
      cwd: '/opt/chainsentinel',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: { NODE_ENV: 'production' },
      time: true,
    },
    {
      name: 'chainsentinel-ai-admin',
      cwd: '/opt/chainsentinel/ai-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
      time: true,
    },
  ],
};
