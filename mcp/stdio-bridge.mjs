#!/usr/bin/env node
/**
 * ChainSentinel · 零依赖 MCP stdio bridge
 *
 * 把桌面 MCP 客户端（Claude Desktop / Cursor / Cline 等）的 stdio JSON-RPC
 * 转发到托管的 https://chainsentinel.hk/api/mcp 端点。
 *
 * 用法：node mcp/stdio-bridge.mjs
 * 环境变量：CHAIN_SENTINEL_BASE（默认 https://chainsentinel.hk）
 *           MCP_FRAMING=content-length（老版本客户端需要 Content-Length 分帧，默认换行分帧）
 *
 * 支持两种输入分帧：换行分隔 JSON（新版 MCP stdio）与 Content-Length 头（旧版 LSP 风格）。
 * 不写 stdout 日志，避免污染 JSON-RPC 通道；日志一律走 stderr。
 */
import process from 'node:process';

const BASE = (process.env.CHAIN_SENTINEL_BASE || 'https://chainsentinel.hk').replace(/\/$/, '');
const ENDPOINT = `${BASE}/api/mcp`;
const FRAMING = process.env.MCP_FRAMING === 'content-length' ? 'content-length' : 'newline';
const TIMEOUT_MS = 30_000;

function send(obj) {
  const payload = JSON.stringify(obj);
  if (FRAMING === 'content-length') {
    process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
  } else {
    process.stdout.write(payload + '\n');
  }
}

function log(...args) {
  process.stderr.write('[chainsentinel-mcp] ' + args.join(' ') + '\n');
}

const pending = new Set();

async function forward(msg) {
  // 通知类消息没有 id，不需要响应
  if (msg.id === undefined && typeof msg.method === 'string' && msg.method.startsWith('notifications/')) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(msg),
      signal: controller.signal,
    });
    if (res.status === 202 || res.status === 204) return; // 通知
    const text = await res.text();
    if (!text) return;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      send({ jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32603, message: 'Upstream returned non-JSON: ' + text.slice(0, 200) } });
      return;
    }
    send(parsed);
  } catch (e) {
    const message = e?.name === 'AbortError' ? 'Upstream timeout' : String(e?.message || e);
    log('request failed:', message);
    send({ jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32603, message: `ChainSentinel upstream unavailable: ${message}`, data: { endpoint: ENDPOINT, docs: `${BASE}/llms.txt` } } });
  } finally {
    clearTimeout(timer);
  }
}

let buf = Buffer.alloc(0);
function drain() {
  for (;;) {
    if (buf.length === 0) return;
    const s = buf.toString('utf8');
    if (s.startsWith('Content-Length:')) {
      const m = s.match(/^Content-Length:\s*(\d+)\r?\n\r?\n/);
      if (!m) return;
      const headLen = Buffer.byteLength(m[0], 'utf8');
      const bodyLen = Number(m[1]);
      if (buf.length < headLen + bodyLen) return;
      const body = buf.subarray(headLen, headLen + bodyLen).toString('utf8');
      buf = buf.subarray(headLen + bodyLen);
      try {
        const p = Promise.resolve(forward(JSON.parse(body)));
        pending.add(p);
        p.finally(() => pending.delete(p));
      } catch (e) {
        log('parse error:', String(e));
      }
      continue;
    }
    const nl = s.indexOf('\n');
    if (nl < 0) return;
    const line = s.slice(0, nl).trim();
    buf = buf.subarray(Buffer.byteLength(s.slice(0, nl + 1), 'utf8'));
    if (!line) continue;
    try {
      const p = Promise.resolve(forward(JSON.parse(line)));
      pending.add(p);
      p.finally(() => pending.delete(p));
    } catch (e) {
      log('parse error:', String(e));
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    }
  }
}

process.stdin.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  drain();
});
// 管道式调用（如测试脚本 printf | node bridge）stdin 会立刻结束，
// 必须等所有在途请求回包后再退出，否则响应会丢失。
process.stdin.on('end', async () => {
  while (pending.size > 0) {
    await Promise.allSettled([...pending]);
  }
  // 不要调用 process.exit()：管道场景下会截断尚未 flush 的 stdout 写入。
  // 没有在途句柄后事件循环会自然退出。
  process.exitCode = 0;
});
log(`ready → ${ENDPOINT} (framing=${FRAMING})`);
