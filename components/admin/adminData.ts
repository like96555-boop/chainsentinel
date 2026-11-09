import type { AdminTab } from './AdminNav';

export interface Status {
  trongrid: { ok: boolean; latencyMs: number | null; status: number | null };
  secrets: {
    kimiConfigured: boolean;
    kimiBaseUrlConfigured: boolean;
    trongridKeyConfigured: boolean;
  };
  blacklistCount: number;
  leads: Array<Record<string, string>>;
  uptimeSec: number;
  node: string;
  paymentsConfigured?: boolean;
}

export interface Todo {
  id: string;
  title: string;
  detail: string;
  severity: 'error' | 'warning' | 'info';
  tab: AdminTab;
  action: string;
}

/** 待办完全由线上真实状态推导，不使用任何示意数据 */
export function buildTodos(status: Status | null): Todo[] {
  if (!status) return [];
  const out: Todo[] = [];

  if (status.paymentsConfigured === false) {
    out.push({
      id: 'payments',
      title: 'USDT 收款地址未配置，付费层已暂停',
      detail: 'Agent 免费层不受影响；配置收款地址后，预付充值与 $0.01/次 计费才会启用。',
      severity: 'warning',
      tab: 'billing',
      action: '去计费与支付',
    });
  }
  if (!status.trongrid.ok) {
    out.push({
      id: 'upstream',
      title: 'TronGrid 上游当前不可达',
      detail: '链上活动信号可能降级，coverage.degraded 会如实标记；制裁名单命中判定不受影响。',
      severity: 'error',
      tab: 'discovery',
      action: '查看服务状态',
    });
  }
  if (!status.secrets.kimiConfigured) {
    out.push({
      id: 'kimi',
      title: 'AI 客服模型密钥未配置',
      detail: '客服窗口会降级到预设回复；配置 Kimi 密钥后恢复正常问答。',
      severity: 'warning',
      tab: 'secrets',
      action: '去配置密钥',
    });
  }
  if (!status.secrets.trongridKeyConfigured) {
    out.push({
      id: 'trongrid-key',
      title: 'TronGrid 正在使用公共额度',
      detail: '高频调用可能触发公共端点限流，建议配置专用 API Key。',
      severity: 'info',
      tab: 'secrets',
      action: '去配置密钥',
    });
  }
  if (status.leads.length > 0) {
    out.push({
      id: 'leads',
      title: `有 ${status.leads.length} 条预约线索待跟进`,
      detail: '线索来自落地页预约表单，可在客户与线索中查看联系方式与意向。',
      severity: 'info',
      tab: 'customers',
      action: '查看线索',
    });
  }
  if (status.blacklistCount === 0) {
    out.push({
      id: 'blacklist',
      title: '黑名单库为空',
      detail: '自定义黑名单尚无条目；内置 OFAC SDN 名单仍会正常参与判定。',
      severity: 'info',
      tab: 'blacklist',
      action: '去维护',
    });
  }
  return out;
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const DISCOVERY_ENDPOINTS: Array<{ path: string; label: string; note: string }> = [
  { path: '/llms.txt', label: 'llms.txt', note: 'Agent 入口索引' },
  { path: '/llms-full.txt', label: 'llms-full.txt', note: '完整能力说明' },
  { path: '/api/openapi.json', label: 'OpenAPI 3.1', note: '机器可读契约' },
  { path: '/.well-known/agent-card.json', label: 'agent-card.json', note: 'Agent 名片' },
  { path: '/agent', label: '/agent', note: '中文接入文档' },
  { path: '/en/agent', label: '/en/agent', note: '英文接入文档' },
  { path: '/sitemap.xml', label: 'sitemap.xml', note: '搜索引擎收录' },
  { path: '/robots.txt', label: 'robots.txt', note: '抓取规则' },
  { path: '/api/v1/manifest', label: '/api/v1/manifest', note: '运行时能力清单' },
  { path: '/api/health', label: '/api/health', note: '服务健康' },
];

export function fmtNum(n: number | undefined | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function fmtTime(ts: number | string | undefined): string {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 19).replace('T', ' ');
  return d.toLocaleString('zh-CN', { hour12: false });
}
