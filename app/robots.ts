import type { MetadataRoute } from 'next';

// Agent 友好：显式放行发现文件与 Agent 专用端点；后台与旧版内部接口保持禁止。
export default function robots(): MetadataRoute.Robots {
  const agentAllow = ['/', '/agent', '/en/agent', '/llms.txt', '/llms-full.txt', '/api/v1/', '/api/mcp', '/api/openapi.json', '/.well-known/agent-card.json'];
  // /dashboard 是公开的订阅中心页（已在 sitemap 中），只禁止后台与敏感 API。
  const blocked = ['/admin/', '/api/admin/', '/api/billing/', '/api/auth/'];
  return {
    rules: [
      { userAgent: '*', allow: agentAllow, disallow: blocked },
      // 明确欢迎主流 AI 爬虫与搜索代理，便于被 Agent 与 AI 搜索引用
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Bingbot', 'CCBot', 'Bytespider'], allow: agentAllow, disallow: blocked },
    ],
    sitemap: 'https://chainsentinel.hk/sitemap.xml',
    host: 'https://chainsentinel.hk',
  };
}
