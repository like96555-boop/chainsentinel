// 链哨 · 服务器强密码生成器
// 用法：node gen-strong-env.mjs  →  打印可直接粘贴进 .env 的强凭据（不写盘，安全）
import crypto from 'crypto';
const rand = (n) => crypto.randomBytes(n).toString('hex');

const out = `# 由 gen-strong-env.mjs 生成（${new Date().toISOString()}）—— 请粘贴进服务器 .env
# MASTER_KEY：AES-256-GCM 根密钥（务必备份，丢失后后台加密密钥无法解密）
MASTER_KEY=${rand(32)}

# 管理后台登录密码（强随机，请妥善保存）
ADMIN_PASSWORD=${rand(12)}

# AI 管理台登录密码（ai.子域后台）
AI_ADMIN_PASSWORD=${rand(12)}

# Stripe 密钥（生产模式必填；测试阶段可先用 sk_test_*）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_BASE_URL=https://chainsentinel.hk

# TRONSCAN 情报源（可选，免费注册：tronscan.org → API）
TRONSCAN_API_KEY=

# Kimi 模型密钥（可选，未配置则 AI 客服降级友好提示）
KIMI_API_KEY=
KIMI_BASE_URL=https://api.kimi.com/coding/v1
`;
console.log(out);
