import { agentHeaders, agentJson, agentManifest, serviceBase } from '@/lib/agent-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 机器可读服务清单：Agent 拿到这一份即可知道全部能力、价格、错误码和支付流程 */
export async function GET(req: Request) {
  return agentJson(agentManifest(serviceBase(req)), 200, { 'Cache-Control': 'public, max-age=300' });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: agentHeaders() });
}
