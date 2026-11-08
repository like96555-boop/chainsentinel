# ChainSentinel MCP bridge

零依赖的 stdio → HTTP 桥接，让桌面 MCP 客户端直连托管的 ChainSentinel Agent API。
**服务定位**：免费、零注册的交互前否决门——检查地址是否命中 OFAC SDN 名单，并明确报告「查了什么 / 没查什么」。不是完整的 AML/KYT 调查，`green` / 未命中不是清白证明。

## 一行安装（发布后可用）

```json
{
  "mcpServers": {
    "chainsentinel": {
      "command": "npx",
      "args": ["-y", "chainsentinel-agent-mcp"],
      "env": { "CHAIN_SENTINEL_BASE": "https://chainsentinel.hk" }
    }
  }
}
```

> ⚠️ **状态：尚未发布到 npm**。`mcp/package.json` 已备好，`npx` 命令在 `npm publish` 之后才生效。
> 发布前先确认包名未被占用：`npm view chainsentinel-agent-mcp version`。
> 发布动作本身需要账号权限，属于独立决策，不在本仓库代码改动范围内。
> 在发布之前，请用下面「本地路径」方式配置，或直接走 HTTP 端点。

## 本地路径（现在就能用）

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

## 让 Agent 找得到的清单（站外分发）

站内文件（`llms.txt` / OpenAPI / agent card）只有 Agent 主动访问根域名时才生效。要进入 Agent 生态的公共索引，还需要：

- [ ] `npm publish` 本目录 → npm / socket.dev 等包索引可检索（`npx -y chainsentinel-agent-mcp` 一行接入）
- [ ] 提交到 MCP Registry（`io.github.like96555-boop/chainsentinel-agent-mcp` 命名格式）
- [ ] 在 MCP 目录站登记远程端点 `https://chainsentinel.hk/api/mcp`
- [ ] 把 sitemap 提交到 Google / Bing Search Console（收录 `/en/agent` 与 FAQ 结构化数据）
- [ ] 部署上线（`llms.txt`、`/en/agent`、`/.well-known/*` 目前生产仍为 404）

注意：**不要**为了进目录而添加 `/.well-known/x402.json`。本服务的支付是 TRON USDT 预付 + 唯一金额报价，**不是官方 x402**；标准 x402 客户端会按协议付款然后失败，比不被发现更伤。

## 说明

- 桥接器不持有密钥、不缓存结果，只做 JSON-RPC 转发。
- 服务端是**无状态** JSON-RPC 端点（initialize / tools/list / tools/call / ping），不是完整的有状态 MCP 会话服务器（无 SSE、无 resources/prompts）。
- 日志走 stderr，stdout 只输出 JSON-RPC，避免污染协议通道。
- 支持换行与 `Content-Length` 两种分帧；stdin 结束时会等待在途请求回包后再退出。
