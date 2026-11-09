'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Bell,
  Users,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  KeyRound,
  Radar,
  CreditCard,
  Receipt,
  Globe2,
  Bot,
  ScrollText,
  Lock,
  Webhook,
  Search,
  RefreshCw,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Command,
  type LucideIcon,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    label: '工作区',
    items: [
      { id: 'overview', label: '运营总览', desc: '生意如何 / 要处理什么 / 刚发生什么' },
      { id: 'todos', label: '待办与告警', desc: '按线上真实状态聚合' },
    ],
  },
  {
    label: '业务',
    items: [
      { id: 'customers', label: '客户与线索', desc: '客户档案与预约线索' },
      { id: 'blacklist', label: '黑名单与情报', desc: '制裁名单与自定义条目' },
      { id: 'smartmoney', label: '聪明钱监控', desc: '公开页监控地址' },
    ],
  },
  {
    label: 'AGENT 生态',
    items: [
      { id: 'agent', label: '调用与用量', desc: '按日真实调用趋势' },
      { id: 'keys', label: 'API 令牌', desc: '创建 / 停用 / 吊销' },
      { id: 'discovery', label: '发现层健康', desc: 'Agent 能否找到并调通' },
    ],
  },
  {
    label: '收入',
    items: [
      { id: 'billing', label: '计费与支付', desc: '套餐、额度与用量' },
      { id: 'orders', label: '订单与账本', desc: '订阅订单记录' },
    ],
  },
  {
    label: '系统',
    items: [
      { id: 'site', label: '站点内容与 SEO', desc: '站点设置与营销横幅' },
      { id: 'ai', label: 'AI 客服配置', desc: '模型、提示词与知识库' },
      { id: 'audit', label: '操作日志与审计', desc: '后台操作留痕' },
      { id: 'secrets', label: '密钥与访问权限', desc: 'AES-256-GCM 加密存储' },
      { id: 'webhooks', label: 'Webhook 通知', desc: '事件回调' },
    ],
  },
] as const;

export type AdminTab = (typeof NAV_GROUPS)[number]['items'][number]['id'];

export const TAB_ICONS: Record<AdminTab, LucideIcon> = {
  overview: LayoutDashboard,
  todos: Bell,
  customers: Users,
  blacklist: ShieldAlert,
  smartmoney: TrendingUp,
  agent: BarChart3,
  keys: KeyRound,
  discovery: Radar,
  billing: CreditCard,
  orders: Receipt,
  site: Globe2,
  ai: Bot,
  audit: ScrollText,
  secrets: Lock,
  webhooks: Webhook,
};

export const ALL_TABS = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g.label })),
);

export function tabMeta(tab: AdminTab) {
  return ALL_TABS.find((t) => t.id === tab) || ALL_TABS[0];
}

interface Props {
  tab: AdminTab;
  onTab: (t: AdminTab) => void;
  alertCount: number;
  onRefresh: () => void;
  refreshing: boolean;
  onLogout: () => void;
}

function SidebarContent({
  tab,
  onTab,
  alertCount,
  onClose,
}: {
  tab: AdminTab;
  onTab: (t: AdminTab) => void;
  alertCount: number;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-zinc-900">ChainSentinel</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">运营控制台 · 生产环境</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 lg:hidden" aria-label="关闭菜单">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mx-5 mt-4 rounded-full bg-zinc-100 px-3 py-2 text-[11px] font-medium text-zinc-600">
        主工作区 · 单后台
      </div>

      <nav className="mt-5 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = TAB_ICONS[item.id];
                const active = tab === item.id;
                const badge = item.id === 'todos' && alertCount > 0 ? alertCount : null;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTab(item.id);
                      onClose?.();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${
                      active
                        ? 'bg-blue-600 font-medium text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <Icon size={15} className={active ? 'text-white' : 'text-zinc-400'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge !== null && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <p className="text-[11px] font-medium text-zinc-700">数据保护已启用</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
          每日 03:10 全站备份 · 保留 14 天
        </p>
      </div>
    </div>
  );
}

export default function AdminNav({ tab, onTab, alertCount, onRefresh, refreshing, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_TABS;
    return ALL_TABS.filter(
      (t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.group.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setMenuOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [paletteOpen]);

  function choose(t: AdminTab) {
    onTab(t);
    setPaletteOpen(false);
  }

  const meta = tabMeta(tab);

  return (
    <>
      {/* 侧栏（桌面常驻） */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] border-r border-zinc-200 bg-white lg:block">
        <SidebarContent tab={tab} onTab={onTab} alertCount={alertCount} />
      </aside>

      {/* 侧栏（窄屏抽屉） */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[248px] bg-white shadow-xl">
            <SidebarContent tab={tab} onTab={onTab} alertCount={alertCount} onClose={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* 顶栏 */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:left-[232px] lg:px-6">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
          aria-label="打开菜单"
        >
          <Menu size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-zinc-400">
          <span className="hidden sm:inline">{meta.group}</span>
          <ChevronRight size={13} className="hidden sm:inline" />
          <span className="truncate font-medium text-zinc-900">{meta.label}</span>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex h-8 w-[210px] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-[12px] text-zinc-400 transition hover:border-zinc-300 sm:w-[280px]"
        >
          <Search size={14} />
          <span className="flex-1 truncate text-left">搜索模块或跳转…</span>
          <span className="hidden items-center gap-0.5 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] sm:flex">
            <Command size={9} />K
          </span>
        </button>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="刷新当前数据"
          className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button onClick={onLogout} title="退出登录" className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-red-600">
          <LogOut size={15} />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
          OP
        </div>
      </header>

      {/* ⌘K 命令面板 */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-900/30 px-4 pt-[12vh]" onClick={() => setPaletteOpen(false)}>
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
              <Search size={16} className="text-zinc-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, results.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === 'Enter' && results[cursor]) {
                    choose(results[cursor].id);
                  }
                }}
                placeholder="输入模块名、用途或分组…"
                className="flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-400">ESC</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-[13px] text-zinc-400">没有匹配的模块</p>
              )}
              {results.map((t, i) => {
                const Icon = TAB_ICONS[t.id];
                return (
                  <button
                    key={t.id}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(t.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                      i === cursor ? 'bg-blue-50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <Icon size={16} className={i === cursor ? 'text-blue-600' : 'text-zinc-400'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-zinc-900">{t.label}</p>
                      <p className="truncate text-[11px] text-zinc-500">{t.desc}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400">{t.group}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-zinc-100 px-4 py-2 text-[10px] text-zinc-400">
              ↑↓ 选择 · Enter 跳转 · 共 {ALL_TABS.length} 个模块
            </div>
          </div>
        </div>
      )}
    </>
  );
}
