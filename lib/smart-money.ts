import fs from 'fs';
import path from 'path';
import { ETH_RPCS, explorerAddressUrl, detectChain } from './chains';
import { maskAddress } from './alerts-meta';
import { getSecret } from './secrets';

/**
 * 聪明钱追踪数据引擎：
 *  - ETH：公共 RPC（多节点兜底）→ 余额 / nonce / 最新区块时间
 *  - BTC：Blockstream 公共 API → 余额 / 总交易 / 最近 5 笔动态（净值 + 对手方）
 *  - TRON：TronGrid → 账户余额 + 最近交易时间线（TRC20 优先，原生 TRX 兜底）
 * 每个地址独立并行拉取，单地址失败降级不影响整页；默认 8s 超时。
 */

export type SmartChain = 'tron' | 'btc' | 'eth';

export interface SmartMoneyEvent {
  address: string;
  chain: SmartChain;
  direction: 'in' | 'out';
  token: string;
  amount: number;
  amountText: string;
  counterparty: string | null;
  counterpartyMasked: string | null;
  ts: number | null; // 毫秒
  tsText: string;
  txHash: string | null;
  txShort: string | null;
  evidenceUrl: string | null;
}

export interface SmartMoneyCard {
  name: string;
  chain: SmartChain;
  address: string;
  maskedAddress: string;
  demo: boolean;
  balance: string | null; // 摘要文案，如 "1,234.56 ETH"
  balanceValue: number | null;
  txCount: number | null;
  lastActive: string | null; // ISO
  lastActiveTs: number | null;
  eventsCount: number;
  degraded: boolean;
  degradedReason?: string;
  updatedAt: number;
}

export interface SmartMoneySeed {
  address: string;
  chain: SmartChain;
  name: string;
  enabled?: boolean;
  demo?: boolean;
}

const TRONGRID = 'https://api.trongrid.io';
const BLOCKSTREAM = 'https://blockstream.info/api';
const TIMEOUT_MS = 8_000;

function trongridHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = getSecret('TRONGRID_API_KEY');
  if (key) h['TRON-PRO-API-KEY'] = key;
  return h;
}

async function fetchJson(
  url: string,
  opts: { timeoutMs?: number; headers?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; json: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
      signal: ctrl.signal,
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------ ETH ------------------------------ */

async function ethRpc(method: string, params: unknown[]): Promise<any> {
  let lastErr: unknown = null;
  for (const url of ETH_RPCS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: ctrl.signal,
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json && json.result !== undefined && !json.error) return json.result;
      lastErr = new Error(json?.error?.message || `HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('ETH RPC 全部不可达');
}

export interface EthSnapshot {
  balanceEth: number;
  txCount: number;
  latestBlockTs: number | null; // 毫秒
}

async function fetchEthSnapshot(address: string): Promise<EthSnapshot> {
  const [balHex, nonceHex, blockHex] = await Promise.all([
    ethRpc('eth_getBalance', [address, 'latest']),
    ethRpc('eth_getTransactionCount', [address, 'latest']),
    ethRpc('eth_getBlockByNumber', ['latest', false]),
  ]);
  const latestBlockTs = blockHex && typeof blockHex.timestamp === 'string'
    ? Number(BigInt(blockHex.timestamp)) * 1000
    : null;
  return {
    balanceEth: Number(BigInt(balHex)) / 1e18,
    txCount: Number(BigInt(nonceHex)),
    latestBlockTs,
  };
}

/* ------------------------------ BTC ------------------------------ */

interface BtcTx {
  txid: string;
  status?: { block_time?: number };
  vin: Array<{ prevout?: { scriptpubkey_address?: string; value?: number } | null }>;
  vout: Array<{ scriptpubkey_address?: string | null; value?: number }>;
}

export interface BtcSnapshot {
  balanceBtc: number;
  txCount: number;
  events: SmartMoneyEvent[];
  lastActiveTs: number | null;
}

async function fetchBtcSnapshot(address: string): Promise<BtcSnapshot> {
  const [addrRes, txsRes] = await Promise.all([
    fetchJson(`${BLOCKSTREAM}/address/${address}`),
    fetchJson(`${BLOCKSTREAM}/address/${address}/txs`),
  ]);
  if (!addrRes.ok || !addrRes.json?.chain_stats) throw new Error(`Blockstream HTTP ${addrRes.status}`);

  const cs = addrRes.json.chain_stats;
  const ms = addrRes.json.mempool_stats || { funded_txo_sum: 0, spent_txo_sum: 0, tx_count: 0 };
  const balanceSat =
    Number(cs.funded_txo_sum || 0) - Number(cs.spent_txo_sum || 0) +
    (Number(ms.funded_txo_sum || 0) - Number(ms.spent_txo_sum || 0));
  const txCount = Number(cs.tx_count || 0) + Number(ms.tx_count || 0);

  const events: SmartMoneyEvent[] = [];
  const txs: BtcTx[] = txsRes.ok && Array.isArray(txsRes.json) ? (txsRes.json as BtcTx[]).slice(0, 5) : [];
  for (const tx of txs) {
    const inSat = (tx.vin || []).reduce(
      (s, v) => s + Number(v.prevout?.scriptpubkey_address === address ? v.prevout?.value || 0 : 0),
      0
    );
    const outSat = (tx.vout || []).reduce(
      (s, v) => s + Number(v.scriptpubkey_address === address ? v.value || 0 : 0),
      0
    );
    const net = outSat - inSat;
    if (net === 0) continue;
    const direction = net > 0 ? 'in' : 'out';
    const counterparty =
      direction === 'out'
        ? (tx.vout || []).find((v) => v.scriptpubkey_address && v.scriptpubkey_address !== address)
            ?.scriptpubkey_address || null
        : (tx.vin || []).find((v) => v.prevout?.scriptpubkey_address && v.prevout.scriptpubkey_address !== address)
            ?.prevout?.scriptpubkey_address || null;
    const ts = tx.status?.block_time ? tx.status.block_time * 1000 : null;
    const amount = Math.abs(net) / 1e8;
    events.push({
      address,
      chain: 'btc',
      direction,
      token: 'BTC',
      amount,
      amountText: `${direction === 'in' ? '+' : '-'}${amount.toFixed(8)} BTC`,
      counterparty,
      counterpartyMasked: counterparty ? maskAddress(counterparty) : null,
      ts,
      tsText: ts ? new Date(ts).toISOString().slice(0, 19).replace('T', ' ') : '—',
      txHash: tx.txid || null,
      txShort: tx.txid ? `${tx.txid.slice(0, 8)}…${tx.txid.slice(-6)}` : null,
      evidenceUrl: tx.txid ? `https://blockstream.info/tx/${tx.txid}` : null,
    });
  }

  return {
    balanceBtc: balanceSat / 1e8,
    txCount,
    events,
    lastActiveTs: events[0]?.ts || null,
  };
}

/* ------------------------------ TRON ------------------------------ */

export interface TronSnapshot {
  balanceTrx: number;
  accountExists: boolean;
  events: SmartMoneyEvent[];
  lastActiveTs: number | null;
}

function hexToBase58(hex: string): string {
  // TronGrid 返回的 from/to 是 hex 地址，转成 base58 便于展示
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const clean = hex.replace(/^0x/, '');
  const bytes = Buffer.from(clean.length % 2 ? `0${clean}` : clean, 'hex');
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = alphabet[Number(n % 58n)] + out;
    n /= 58n;
  }
  // 前导零字节 → '1'
  for (const b of bytes) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return out;
}

function parseTrc20Events(addr: string, arr: any[]): SmartMoneyEvent[] {
  const evts: SmartMoneyEvent[] = [];
  for (const t of arr) {
    const from = t.from || '';
    const to = t.to || '';
    if (!from || !to) continue;
    const direction = from.toLowerCase() === addr.toLowerCase() ? 'out' : 'in';
    const counterparty = direction === 'out' ? to : from;
    const decimals = Number(t.token_info?.decimals ?? 6);
    const value = Number(t.value ?? 0) / 10 ** decimals;
    const ts = t.block_timestamp || null;
    evts.push({
      address: addr,
      chain: 'tron',
      direction,
      token: String(t.token_info?.symbol || 'TRC20'),
      amount: value,
      amountText: `${direction === 'in' ? '+' : '-'}${value.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} ${String(t.token_info?.symbol || '')}`,
      counterparty,
      counterpartyMasked: counterparty ? maskAddress(counterparty) : null,
      ts,
      tsText: ts ? new Date(ts).toISOString().slice(0, 19).replace('T', ' ') : '—',
      txHash: t.transaction_id || null,
      txShort: t.transaction_id ? `${t.transaction_id.slice(0, 8)}…${t.transaction_id.slice(-6)}` : null,
      evidenceUrl: t.transaction_id ? `https://tronscan.org/#/transaction/${t.transaction_id}` : null,
    });
  }
  return evts;
}

function parseRawTronEvents(addr: string, arr: any[]): SmartMoneyEvent[] {
  const lower = addr.toLowerCase();
  const evts: SmartMoneyEvent[] = [];
  for (const tx of arr) {
    const contract = tx.raw_data?.contract?.[0];
    const value = contract?.parameter?.value;
    if (contract?.type !== 'TransferContract' || !value?.owner_address || !value?.to_address) continue;
    const owner = value.owner_address.toLowerCase();
    const to = value.to_address.toLowerCase();
    if (owner !== lower && to !== lower) continue;
    const direction = owner === lower ? 'out' : 'in';
    const counterparty = direction === 'out' ? to : owner;
    const amount = Number(value.amount || 0) / 1e6;
    const ts = tx.block_timestamp || tx.raw_data?.timestamp || null;
    evts.push({
      address: addr,
      chain: 'tron',
      direction,
      token: 'TRX',
      amount,
      amountText: `${direction === 'in' ? '+' : '-'}${amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} TRX`,
      counterparty: hexToBase58(counterparty),
      counterpartyMasked: null,
      ts,
      tsText: ts ? new Date(ts).toISOString().slice(0, 19).replace('T', ' ') : '—',
      txHash: tx.txID || null,
      txShort: tx.txID ? `${tx.txID.slice(0, 8)}…${tx.txID.slice(-6)}` : null,
      evidenceUrl: tx.txID ? `https://tronscan.org/#/transaction/${tx.txID}` : null,
    });
  }
  return evts;
}

async function fetchTronSnapshot(address: string): Promise<TronSnapshot> {
  const [accRes, trc20Res, rawRes] = await Promise.all([
    fetchJson(`${TRONGRID}/v1/accounts/${address}`, { headers: trongridHeaders() }),
    fetchJson(`${TRONGRID}/v1/accounts/${address}/transactions/trc20?limit=10&order_by=block_timestamp,desc`, {
      headers: trongridHeaders(),
    }),
    fetchJson(`${TRONGRID}/v1/accounts/${address}/transactions?limit=10&order_by=block_timestamp,desc`, {
      headers: trongridHeaders(),
    }),
  ]);

  const dataArr = accRes.ok ? accRes.json?.data : null;
  const account = Array.isArray(dataArr) && dataArr.length > 0 ? dataArr[0] : null;
  const balanceTrx = account ? Number(account.balance || 0) / 1e6 : 0;

  const trc20Events = trc20Res.ok && Array.isArray(trc20Res.json?.data) ? parseTrc20Events(address, trc20Res.json.data) : [];
  const rawEvents = rawRes.ok && Array.isArray(rawRes.json?.data) ? parseRawTronEvents(address, rawRes.json.data) : [];

  // TRC20 为主，原生 TRX 兜底补充；按时间倒序去重（同 tx 只留一条）
  const byTx = new Map<string, SmartMoneyEvent>();
  for (const e of [...trc20Events, ...rawEvents]) {
    const key = `${e.txHash || ''}-${e.direction}-${e.amountText}`;
    if (e.txHash && !byTx.has(e.txHash)) byTx.set(e.txHash, e);
    else if (!e.txHash) byTx.set(key, e);
  }
  const events = [...byTx.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 10);

  return {
    balanceTrx,
    accountExists: !!account,
    events,
    lastActiveTs: events[0]?.ts || null,
  };
}

/* ------------------------------ 卡片组装 ------------------------------ */

export async function fetchCardForSeed(seed: SmartMoneySeed): Promise<SmartMoneyCard> {
  const base: Omit<SmartMoneyCard, 'balance' | 'balanceValue' | 'txCount' | 'lastActive' | 'lastActiveTs' | 'eventsCount' | 'degraded' | 'degradedReason'> = {
    name: seed.name,
    chain: seed.chain,
    address: seed.address,
    maskedAddress: maskAddress(seed.address),
    demo: !!seed.demo,
    updatedAt: Date.now(),
  };

  try {
    if (seed.chain === 'eth') {
      const snap = await fetchEthSnapshot(seed.address);
      return {
        ...base,
        balance: `${snap.balanceEth.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} ETH`,
        balanceValue: snap.balanceEth,
        txCount: snap.txCount,
        lastActive: snap.latestBlockTs ? new Date(snap.latestBlockTs).toISOString() : null,
        lastActiveTs: snap.latestBlockTs,
        eventsCount: 0,
        degraded: false,
      };
    }
    if (seed.chain === 'btc') {
      const snap = await fetchBtcSnapshot(seed.address);
      return {
        ...base,
        balance: `${snap.balanceBtc.toLocaleString('zh-CN', { maximumFractionDigits: 8 })} BTC`,
        balanceValue: snap.balanceBtc,
        txCount: snap.txCount,
        lastActive: snap.lastActiveTs ? new Date(snap.lastActiveTs).toISOString() : null,
        lastActiveTs: snap.lastActiveTs,
        eventsCount: snap.events.length,
        degraded: false,
      };
    }
    const snap = await fetchTronSnapshot(seed.address);
    return {
      ...base,
      balance: `${snap.balanceTrx.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} TRX`,
      balanceValue: snap.balanceTrx,
      txCount: snap.events.length,
      lastActive: snap.lastActiveTs ? new Date(snap.lastActiveTs).toISOString() : null,
      lastActiveTs: snap.lastActiveTs,
      eventsCount: snap.events.length,
      degraded: false,
    };
  } catch (e) {
    return {
      ...base,
      balance: null,
      balanceValue: null,
      txCount: null,
      lastActive: null,
      lastActiveTs: null,
      eventsCount: 0,
      degraded: true,
      degradedReason: e instanceof Error ? e.message : '数据源暂不可用',
    };
  }
}

/** 读取监控列表（data/smartmoney.json），可按 enabled 过滤 */
export function readSmartMoneySeeds(): SmartMoneySeed[] {
  try {
    const p = path.join(process.cwd(), 'data', 'smartmoney.json');
    if (fs.existsSync(p)) {
      const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(arr)) {
        return arr
          .filter((s) => s && typeof s.address === 'string' && typeof s.chain === 'string')
          .map((s) => ({
            address: s.address,
            chain: s.chain as SmartChain,
            name: String(s.name || s.address),
            enabled: s.enabled !== false,
            demo: !!s.demo,
          }));
      }
    }
  } catch (e) {
    console.error('[ChainSentinel] smartmoney.json 读取失败。', e);
  }
  return [];
}

/** 原子化写回监控列表（供 admin CRUD 调用） */
export function writeSmartMoneySeeds(seeds: SmartMoneySeed[]): void {
  const p = path.join(process.cwd(), 'data', 'smartmoney.json');
  const tmp = `${p}.tmp`;
  const payload = seeds.map((s) => ({
    address: s.address,
    chain: s.chain,
    name: s.name,
    enabled: s.enabled !== false,
    demo: !!s.demo,
  }));
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

/** 批量拉取所有启用地址的卡片（并行；单地址失败自动降级） */
export async function fetchAllCards(seeds: SmartMoneySeed[]): Promise<SmartMoneyCard[]> {
  const results = await Promise.allSettled(
    seeds.filter((s) => s.enabled !== false).map((s) => fetchCardForSeed(s))
  );
  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : ({
          name: '—',
          chain: 'tron',
          address: 'unknown',
          maskedAddress: 'unknown',
          demo: false,
          balance: null,
          balanceValue: null,
          txCount: null,
          lastActive: null,
          lastActiveTs: null,
          eventsCount: 0,
          degraded: true,
          degradedReason: r.reason instanceof Error ? r.reason.message : '数据源暂不可用',
          updatedAt: Date.now(),
        } as SmartMoneyCard)
  );
}

/** 单地址动态时间线（ETH 无公开交易明细 → 降级快照） */
export async function fetchEventsForAddress(
  address: string,
  chain: SmartChain
): Promise<{ events: SmartMoneyEvent[]; degraded?: { message: string; snapshot?: Record<string, unknown> } }> {
  if (chain === 'eth') {
    try {
      const snap = await fetchEthSnapshot(address);
      return {
        events: [],
        degraded: {
          message: 'ETH 公共 RPC 无法提供交易明细，已降级为余额/交易数快照（升级专业版解锁完整时间线）',
          snapshot: {
            balanceEth: snap.balanceEth,
            txCount: snap.txCount,
            latestBlockTs: snap.latestBlockTs,
          },
        },
      };
    } catch {
      return { events: [], degraded: { message: 'ETH 公共 RPC 暂不可达，数据暂不可用' } };
    }
  }
  if (chain === 'btc') {
    const snap = await fetchBtcSnapshot(address);
    return { events: snap.events.slice(0, 10) };
  }
  const snap = await fetchTronSnapshot(address);
  return { events: snap.events.slice(0, 10) };
}

/** 校验地址与声明链一致（供 admin CRUD 使用） */
export function assertChainMatches(address: string, chain: SmartChain): boolean {
  return detectChain(address) === chain;
}
