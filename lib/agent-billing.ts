// 链哨 · Agent 预付余额账本
// 设计目标：AI Agent 无需注册/无需信用卡，一次链上转账换取一个 Bearer 凭证，之后按次自动扣费。
// 硬约束：txId（充值）与 requestId（扣费）双幂等；原子落盘；资金仍进运营自持钱包，本服务不托管。
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const PRICE_PER_CALL_USD = 0.01;
export const MIN_TOPUP_USDT = 1;
export const FREE_CALLS_PER_MINUTE = 30; // 每个 IP 免费层上限（Agent 免费层比人类宽松）
export const PAID_CALLS_PER_MINUTE = 300; // 已付费凭证的滥用保护

const FILE = 'agent-credits.json';
const MAX_DEBITS = 50_000; // 账本上限，超出裁剪最旧的扣费记录（不影响余额）

export interface AgentCredential {
  token: string;
  wallet: string;
  balanceUsd: number;
  creditedUsd: number;
  createdAt: number;
  lastUsedAt: number | null;
  calls: number;
}

interface Claim {
  txId: string;
  token: string;
  amountUsd: number;
  wallet: string;
  createdAt: number;
}

interface Debit {
  requestId: string;
  token: string;
  amountUsd: number;
  at: number;
}

export interface TopupQuote {
  quoteId: string;
  /** 一次性精确金额（6 位小数），付款方必须按此金额转账，防止他人冒领公开地址上的历史入账 */
  amountUsdt: number;
  createdAt: number;
  expiresAt: number;
  usedTxId?: string;
}

interface Ledger {
  credentials: AgentCredential[];
  claims: Claim[];
  debits: Debit[];
  quotes: TopupQuote[];
  updatedAt: number;
}

export const QUOTE_TTL_MS = 30 * 60_000; // 报价有效期 30 分钟

/** 生成一次性充值报价：1.000001 ~ 1.999999 USDT 的 6 位小数随机金额 */
export function createQuote(): Promise<TopupQuote> {
  return withLock('quote:create', () => {
    const l = readLedger();
    // 1 USDT + 最多 0.999999 的随机尾数；最小充值额约 1 USDT
    const suffix = crypto.randomInt(1, 1_000_000); // 1..999999
    const amountUsdt = Number((MIN_TOPUP_USDT + suffix / 1_000_000).toFixed(6));
    const now = Date.now();
    const quote: TopupQuote = {
      quoteId: 'q_' + crypto.randomBytes(12).toString('hex'),
      amountUsdt,
      createdAt: now,
      expiresAt: now + QUOTE_TTL_MS,
    };
    l.quotes.push(quote);
    // 只保留最近 2000 个报价，避免账本无限增长
    if (l.quotes.length > 2000) l.quotes = l.quotes.slice(-2000);
    writeLedger(l);
    return quote;
  });
}

export function getQuote(quoteId: string): TopupQuote | null {
  return readLedger().quotes.find((q) => q.quoteId === quoteId) || null;
}

/** 校验失败时释放本次绑定，避免一次金额错误的尝试把报价锁死（绑定本身仍防并发冒领） */
export function releaseQuote(quoteId: string, txId: string): Promise<void> {
  return withLock('quote:bind:' + quoteId, () => {
    const l = readLedger();
    const q = l.quotes.find((x) => x.quoteId === quoteId);
    if (q && q.usedTxId === txId) {
      delete q.usedTxId;
      writeLedger(l);
    }
  });
}

/** 某笔交易是否已被别的报价绑定（防止同一 txId 换多份额度） */
export function quoteForTx(txId: string): TopupQuote | null {
  return readLedger().quotes.find((q) => q.usedTxId === txId) || null;
}

/** 把报价绑定到某笔交易；重复提交同一 quoteId+txId 返回同一绑定（幂等） */
export function bindQuote(quoteId: string, txId: string): Promise<{ ok: boolean; reason?: 'QUOTE_INVALID' | 'QUOTE_EXPIRED' | 'QUOTE_TX_MISMATCH'; quote?: TopupQuote }> {
  return withLock('quote:bind:' + quoteId, () => {
    const l = readLedger();
    const q = l.quotes.find((x) => x.quoteId === quoteId);
    if (!q) return { ok: false, reason: 'QUOTE_INVALID' as const };
    if (q.usedTxId && q.usedTxId !== txId) return { ok: false, reason: 'QUOTE_TX_MISMATCH' as const };
    if (!q.usedTxId && Date.now() > q.expiresAt) return { ok: false, reason: 'QUOTE_EXPIRED' as const };
    if (!q.usedTxId) {
      q.usedTxId = txId;
      writeLedger(l);
    }
    return { ok: true, quote: q };
  });
}

function filePath(): string {
  return path.join(process.cwd(), 'data', FILE);
}

function emptyLedger(): Ledger {
  return { credentials: [], claims: [], debits: [], quotes: [], updatedAt: Date.now() };
}

function readLedger(): Ledger {
  try {
    if (fs.existsSync(filePath())) {
      const raw = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<Ledger>;
      return {
        credentials: Array.isArray(raw.credentials) ? raw.credentials : [],
        claims: Array.isArray(raw.claims) ? raw.claims : [],
        debits: Array.isArray(raw.debits) ? raw.debits : [],
        quotes: Array.isArray(raw.quotes) ? raw.quotes : [],
        updatedAt: raw.updatedAt || Date.now(),
      };
    }
  } catch (e) {
    console.error('[agent-billing] 账本读取失败，按空账本处理', e);
  }
  return emptyLedger();
}

function writeLedger(l: Ledger): void {
  const p = filePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  l.updatedAt = Date.now();
  if (l.debits.length > MAX_DEBITS) l.debits = l.debits.slice(-MAX_DEBITS);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(l, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

// 同一 key 串行执行，防止并发充值/扣费产生竞态（单实例部署足够）
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => T): Promise<T> {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.then(() => fn(), () => fn());
  locks.set(key, next as Promise<unknown>);
  next.finally(() => {
    if (locks.get(key) === next) locks.delete(key);
  }).catch(() => {});
  return next;
}

export function newAgentToken(): string {
  return 'cs_agent_' + crypto.randomBytes(24).toString('hex');
}

export function newRequestId(): string {
  return 'req_' + crypto.randomBytes(12).toString('hex');
}

export function getCredential(token: string): AgentCredential | null {
  if (!token || !token.startsWith('cs_agent_')) return null;
  return readLedger().credentials.find((c) => c.token === token) || null;
}

/** 按 txId 幂等充值。返回凭证；重复提交同一 txId 返回同一凭证，不重复入账。 */
export function claimTopup(opts: { txId: string; amountUsd: number; wallet: string }): Promise<{
  ok: boolean;
  reason?: string;
  token?: string;
  balanceUsd?: number;
  alreadyClaimed?: boolean;
}> {
  return withLock('topup:' + opts.txId, () => {
    const l = readLedger();
    const existing = l.claims.find((c) => c.txId === opts.txId);
    if (existing) {
      const cred = l.credentials.find((c) => c.token === existing.token);
      return {
        ok: true,
        alreadyClaimed: true,
        token: existing.token,
        balanceUsd: cred?.balanceUsd ?? 0,
      };
    }
    if (!Number.isFinite(opts.amountUsd) || opts.amountUsd < MIN_TOPUP_USDT) {
      return { ok: false, reason: 'AMOUNT_TOO_SMALL' };
    }
    const token = newAgentToken();
    const now = Date.now();
    l.claims.push({ txId: opts.txId, token, amountUsd: opts.amountUsd, wallet: opts.wallet || '', createdAt: now });
    l.credentials.push({
      token,
      wallet: opts.wallet || '',
      balanceUsd: opts.amountUsd,
      creditedUsd: opts.amountUsd,
      createdAt: now,
      lastUsedAt: null,
      calls: 0,
    });
    writeLedger(l);
    return { ok: true, alreadyClaimed: false, token, balanceUsd: opts.amountUsd };
  });
}

/** 按 requestId 幂等扣费。同一 requestId 重复调用只扣一次并返回首次结果。 */
export function debit(opts: { token: string; requestId: string; amountUsd?: number }): Promise<{
  ok: boolean;
  reason?: 'INVALID_TOKEN' | 'INSUFFICIENT_CREDIT';
  balanceUsd?: number;
  alreadyDebited?: boolean;
}> {
  const amount = opts.amountUsd ?? PRICE_PER_CALL_USD;
  return withLock('debit:' + opts.token, () => {
    const l = readLedger();
    const prior = l.debits.find((d) => d.requestId === opts.requestId && d.token === opts.token);
    if (prior) {
      const cred0 = l.credentials.find((c) => c.token === opts.token);
      return { ok: true, alreadyDebited: true, balanceUsd: cred0?.balanceUsd ?? 0 };
    }
    const cred = l.credentials.find((c) => c.token === opts.token);
    if (!cred) return { ok: false, reason: 'INVALID_TOKEN' as const };
    if (cred.balanceUsd + 1e-9 < amount) {
      return { ok: false, reason: 'INSUFFICIENT_CREDIT' as const, balanceUsd: cred.balanceUsd };
    }
    cred.balanceUsd = Math.max(0, Math.round((cred.balanceUsd - amount) * 1e8) / 1e8);
    cred.lastUsedAt = Date.now();
    cred.calls += 1;
    l.debits.push({ requestId: opts.requestId, token: opts.token, amountUsd: amount, at: Date.now() });
    writeLedger(l);
    return { ok: true, balanceUsd: cred.balanceUsd };
  });
}

export function balanceOf(token: string): { balanceUsd: number; calls: number; creditedUsd: number; wallet: string } | null {
  const c = getCredential(token);
  if (!c) return null;
  return { balanceUsd: c.balanceUsd, calls: c.calls, creditedUsd: c.creditedUsd, wallet: c.wallet };
}

/** 后台用量快照（可选接入 /admin 运营总览） */
export function agentUsageSnapshot(): { credentials: number; totalCreditedUsd: number; totalCalls: number } {
  const l = readLedger();
  return {
    credentials: l.credentials.length,
    totalCreditedUsd: Math.round(l.credentials.reduce((s, c) => s + c.creditedUsd, 0) * 100) / 100,
    totalCalls: l.credentials.reduce((s, c) => s + c.calls, 0),
  };
}
