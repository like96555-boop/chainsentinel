// 链哨 · Stripe 支付集成（零依赖，REST + HMAC 验签）
// 密钥：STRIPE_SECRET_KEY（sk_test_*/sk_live_*）、STRIPE_WEBHOOK_SECRET（whsec_*）
// Mock 模式：STRIPE_MOCK=1 时 createCheckoutSession 返回本地占位 URL，webhook 校验跳过，
//   供无真实 Stripe 密钥时的全链路自包含测试（scripts/billing-test.mjs）。
// 真实密钥接入：注册 Stripe → 后台密钥管理录入（AES 加密落盘）→ .env 或后台配置均可。

import crypto from 'crypto';

const API = 'https://api.stripe.com/v1';

function secretKey(): string {
  const v = process.env.STRIPE_SECRET_KEY || '';
  if (v && v.startsWith('sk_')) return v;
  // 兼容后台加密存储（读取 .env 与 secrets 均由调用方注入，此处仅环境变量）
  return v;
}

export function isStripeConfigured(): boolean {
  return (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_');
}

export function isMockMode(): boolean {
  return process.env.STRIPE_MOCK === '1';
}

/** 创建订阅 Checkout Session，返回跳转 URL（mock 模式返回占位 URL） */
export async function createCheckoutSession(opts: {
  priceId: string;
  customerEmail: string;
  clientReferenceId: string; // 业务订单号
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  if (isMockMode() || !secretKey()) {
    return {
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/billing/mock-checkout?order=${opts.clientReferenceId}`,
      sessionId: 'cs_mock_' + opts.clientReferenceId,
    };
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
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
  stripeSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: number;
  updatedAt: number;
}
