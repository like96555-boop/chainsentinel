// 链哨 · Stripe 支付集成（零依赖，REST + HMAC 验签）
// 密钥：STRIPE_SECRET_KEY（sk_test_*/sk_live_*）、STRIPE_WEBHOOK_SECRET（whsec_*）
// Mock 模式：STRIPE_MOCK=1 时 createCheckoutSession 返回本地占位 URL，webhook 校验跳过，
//   供无真实 Stripe 密钥时的全链路自包含测试（scripts/billing-test.mjs）。
// 真实密钥接入：注册 Stripe → 后台密钥管理录入（AES 加密落盘）→ .env 或后台配置均可。

import crypto from 'crypto';
import { getSecret, secretSource } from './secrets';

const API = 'https://api.stripe.com/v1';

function secretKey(): string {
  // 优先级：后台加密存储（AES-256-GCM）> 环境变量
  const v = getSecret('STRIPE_SECRET_KEY');
  if (v && v.startsWith('sk_')) return v;
  return v;
}

export function isStripeConfigured(): boolean {
  return secretKey().startsWith('sk_');
}

export function isMockMode(): boolean {
  return process.env.STRIPE_MOCK === '1';
}

/** 后台展示：Stripe 密钥配置状态（来源 + 是否就绪） */
export function stripeConfigStatus(): { secretConfigured: boolean; webhookConfigured: boolean; secretSource: string; webhookSource: string } {
  return {
    secretConfigured: secretKey().startsWith('sk_'),
    webhookConfigured: (getSecret('STRIPE_WEBHOOK_SECRET') || '').startsWith('whsec_'),
    secretSource: secretSource('STRIPE_SECRET_KEY'),
    webhookSource: secretSource('STRIPE_WEBHOOK_SECRET'),
  };
}

/** 创建订阅 Checkout Session，返回跳转 URL（仅显式 STRIPE_MOCK=1 时走本地占位） */
export async function createCheckoutSession(opts: {
  priceId: string;
  customerEmail: string;
  clientReferenceId: string; // 业务订单号
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  if (isMockMode()) {
    return {
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/billing/mock-checkout?order=${opts.clientReferenceId}`,
      sessionId: 'cs_mock_' + opts.clientReferenceId,
    };
  }
  if (!secretKey()) {
    // 生产模式必须配置真实 Stripe 密钥：宁可明确报错，绝不静默放行（否则客户不扣款白得令牌）
    throw new Error('收款通道未配置：缺少 STRIPE_SECRET_KEY（sk_live_*）。请在服务器 .env 配置后重启服务。');
  }
  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': opts.priceId,
    'line_items[0][quantity]': '1',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.customerEmail,
    client_reference_id: opts.clientReferenceId,
  });
  const res = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(secretKey() + ':').toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Stripe Checkout 创建失败 HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  return { url: j.url as string, sessionId: j.id as string };
}

/** Webhook 验签：Stripe-Signature: t=<ts>,v1=<hmac>，HMAC-SHA256(whsec, `${t}.${payload}`) */
export function verifyWebhookSignature(payload: string, signatureHeader: string, secret: string): boolean {
  if (isMockMode()) return true; // mock 模式跳过验签（测试用）
  const parts = new Map<string, string>();
  for (const kv of signatureHeader.split(',')) {
    const i = kv.indexOf('=');
    if (i > 0) parts.set(kv.slice(0, i), kv.slice(i + 1));
  }
  const t = parts.get('t');
  const v1 = parts.get('v1');
  if (!t || !v1) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${payload}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}

/** 生成 Stripe 签名头（测试工具：模拟 Stripe 回调） */
export function signPayloadForTest(payload: string, secret: string, ts = Math.floor(Date.now() / 1000)): string {
  const v1 = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${v1}`;
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

/** 解析并校验 Webhook 原始请求体 */
export function parseWebhook(rawBody: string, signatureHeader: string): { event: StripeEvent } | { error: string } {
  const secret = getSecret('STRIPE_WEBHOOK_SECRET');
  if (!isMockMode() && (!secret || !signatureHeader)) {
    return { error: '缺少 Stripe Webhook 签名头或密钥' };
  }
  if (!verifyWebhookSignature(rawBody, signatureHeader, secret)) {
    return { error: 'Webhook 签名校验失败' };
  }
  try {
    return { event: JSON.parse(rawBody) as StripeEvent };
  } catch {
    return { error: 'Webhook 载荷不是合法 JSON' };
  }
}

/** 订单（订阅）记录：落盘 data/orders.json，供后台核对收入 */
export interface OrderRecord {
  id: string; // 业务订单号
  planId: string;
  customerEmail: string;
  amountUsd: number;
  status: 'pending' | 'paid' | 'canceled';
  /** 支付方式：stripe（卡/钱包）/ usdt（TRON 链上 USDT，非托管） */
  method?: 'stripe' | 'usdt';
  /** USDT 支付：应到金额（USDT 数量，1 USDT ≈ 1 USD） */
  amountUsdt?: number;
  /** USDT 支付：链上交易哈希（确认到账后记录） */
  usdtTxId?: string;
  confirmedAt?: number;
  /** 激活后生成的令牌（明文仅此时可查，后台可复核） */
  tokens?: Array<{ id: string; key: string; name: string }>;
  stripeSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: number;
  updatedAt: number;
}
