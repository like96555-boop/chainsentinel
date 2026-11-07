# ChainSentinel MCP bridge

零依赖的 stdio → HTTP 桥接，让桌面 MCP 客户端直连托管的 ChainSentinel Agent API。

## Claude Desktop / Cursor / Cline 配置

```json
{
  "mcpServers": {
    "chainsentinel": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/mcp/stdio-bridge.mjs"],
      "env": { "CHAIN_SENTINEL_BASE": "https://chainsentinel.hk" }
    }
  }
}
```

老版本客户端若使用 Content-Length 分帧，加一个环境变量：

```json
"env": {
  "CHAIN_SENTINEL_BASE": "https://chainsentinel.hk",
  "MCP_FRAMING": "content-length"
}
```

## 也可以不用这个桥

支持 HTTP 的客户端直接 POST 到 `https://chainsentinel.hk/api/mcp`：

```bash
curl -X POST https://chainsentinel.hk/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

工具：`check_address`（免费层直接可用）、`get_balance`、`topup_info`。
详细说明见 `https://chainsentinel.hk/llms-full.txt`。

## 说明

- 桥接器不持有密钥、不缓存结果，只做 JSON-RPC 转发。
- 服务端是**无状态** JSON-RPC 端点（initialize / tools/list / tools/call / ping），不是完整的有状态 MCP 会话服务器（无 SSE、无 resources/prompts）。
- 日志走 stderr，stdout 只输出 JSON-RPC，避免污染协议通道。
