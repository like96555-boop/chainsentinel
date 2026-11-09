import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Bot,
  Braces,
  CreditCard,
  FileBarChart,
  Landmark,
  Radar,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

/**
 * 全站唯一的功能清单来源。
 * 原则：只列已上线、可从站内点进去的能力；门槛（免费 / 登录 / 部分免费 / 预约）如实标注。
 * NavBar 下拉、移动端菜单、首页能力地图、首屏速览共用这一份数据，避免各处说法不一致。
 */
export type FeatureTone = 'free' | 'partial' | 'login' | 'contact' | 'dev';

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  badge: string;
  tone: FeatureTone;
}

export interface FeatureGroup {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  items: FeatureItem[];
}

export interface QuickLink {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface CatalogLabels {
  home: string;
  menu: string;
  all: string;
  menuNote: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  quickLabel: string;
  quickCta: string;
  pricing: string;
  blog: string;
  alerts: string;
  smartMoney: string;
  agent: string;
  telegram: string;
  mapHref: string;
}

export interface Catalog {
  groups: FeatureGroup[];
  quick: QuickLink[];
  labels: CatalogLabels;
}

export const BADGE_CLASS: Record<FeatureTone, string> = {
  free: 'border-neon-green/30 bg-neon-green/10 text-neon-green',
  partial: 'border-neon-yellow/30 bg-neon-yellow/10 text-neon-yellow',
  login: 'border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan',
  contact: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  dev: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
};

export function FeatureBadge({ item, compact = false }: { item: FeatureItem; compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-1.5 py-0.5 font-medium ${compact ? 'text-[9px]' : 'text-[10px]'} ${BADGE_CLASS[item.tone]}`}
    >
      {item.badge}
    </span>
  );
}

const ZH: Catalog = {
  labels: {
    home: '首页',
    menu: '产品功能',
    all: '查看全部功能',
    menuNote: '以下均为已上线能力 · 使用门槛以标签为准',
    eyebrow: 'CAPABILITY MAP · 能力地图',
    title: '我们到底提供什么，一屏看全',
    subtitle: '按使用场景分组，点任意一张卡片即可直接使用。不再让客户从页脚里翻功能。',
    disclaimer: '清单内全部为当前已上线功能；标注「部分免费 / 登录可用 / 预约制」的条目按对应门槛开放，尚未接入的能力不列入。',
    quickLabel: '我们还能做什么：',
    quickCta: '全部功能',
    pricing: '定价',
    blog: '博客',
    alerts: '风险警示榜',
    smartMoney: '聪明钱',
    agent: 'Agent API',
    telegram: 'Telegram 客服',
    mapHref: '/#features',
  },
  groups: [
    {
      id: 'risk',
      icon: ShieldCheck,
      title: '收款前风控',
      desc: '资金往来之前，先把对手方地址过一遍',
      items: [
        {
          icon: ScanSearch,
          title: '免费地址风险筛查',
          desc: 'TRON / BTC / ETH 地址，3 秒返回红绿灯结论与命中依据，免注册',
          href: '/#check',
          badge: '免费',
          tone: 'free',
        },
        {
          icon: ShieldAlert,
          title: '制裁名单 · 覆盖度报告',
          desc: '906 条 OFAC SDN + 2 条公开记录，明确写出查了什么、没查什么',
          href: '/agent',
          badge: '免费',
          tone: 'free',
        },
        {
          icon: Bell,
          title: '地址监控与告警',
          desc: '登录后可添加监控钱包，并按日配额调用风控 API、查看用量',
          href: '/dashboard',
          badge: '登录可用',
          tone: 'login',
        },
      ],
    },
    {
      id: 'intel',
      icon: Radar,
      title: '公开链上情报',
      desc: '不登录也能查阅的风险信息与资金动向',
      items: [
        {
          icon: ShieldAlert,
          title: '链上风险警示榜',
          desc: '按链筛选钓鱼归集、洗钱通道、混币入口等公开风险情报',
          href: '/alerts',
          badge: '免费公开',
          tone: 'free',
        },
        {
          icon: TrendingUp,
          title: '聪明钱动向',
          desc: '机构与巨鲸的链上足迹，免费查看前 3 个监控地址，完整列表需订阅',
          href: '/smart-money',
          badge: '部分免费',
          tone: 'partial',
        },
      ],
    },
    {
      id: 'compliance',
      icon: FileBarChart,
      title: '合规与报表',
      desc: '从链上流水到可交付给会计师的文档',
      items: [
        {
          icon: FileBarChart,
          title: '税务中心 · 税表审计',
          desc: '粘贴 CSV 流水，FIFO / LIFO / HIFO 成本核算，生成可打印审计报告',
          href: '/tax',
          badge: '免费',
          tone: 'free',
        },
        {
          icon: Landmark,
          title: 'RWA / 稳定币合规咨询',
          desc: '香港持牌顾问网络：合规架构、AML 体系搭建与审计支持，1 个工作日内响应',
          href: '/#consult',
          badge: '预约制',
          tone: 'contact',
        },
        {
          icon: BookOpen,
          title: '实战指南 / 博客',
          desc: '加密合规、地址风控与冻卡应对的实操文章',
          href: '/blog',
          badge: '免费',
          tone: 'free',
        },
      ],
    },
    {
      id: 'developer',
      icon: Bot,
      title: '开发者 & Agent',
      desc: '让程序与 AI 直接调用，无需人工注册',
      items: [
        {
          icon: Bot,
          title: 'Agent API（零注册）',
          desc: '30 次/分免费额度，REST + MCP 风格工具，机器可读错误码',
          href: '/agent',
          badge: '免费额度',
          tone: 'free',
        },
        {
          icon: Braces,
          title: '机器可读发现层',
          desc: 'llms.txt、OpenAPI 3.1、agent card、manifest 一站可达',
          href: '/llms.txt',
          badge: '公开',
          tone: 'dev',
        },
        {
          icon: CreditCard,
          title: '订阅与计量',
          desc: 'API 令牌、日配额、用量明细，USDT（TRC-20）到账即开通',
          href: '/dashboard',
          badge: '登录可用',
          tone: 'login',
        },
      ],
    },
  ],
  quick: [
    { icon: ShieldAlert, label: '风险警示榜', href: '/alerts' },
    { icon: TrendingUp, label: '聪明钱追踪', href: '/smart-money' },
    { icon: FileBarChart, label: '税务报表', href: '/tax' },
    { icon: Bot, label: 'Agent API', href: '/agent' },
    { icon: Landmark, label: '合规咨询', href: '/#consult' },
  ],
};

const EN: Catalog = {
  labels: {
    home: 'Home',
    menu: 'Features',
    all: 'See all features',
    menuNote: 'All capabilities below are live · badges show access level',
    eyebrow: 'CAPABILITY MAP',
    title: 'Everything we offer, in one place',
    subtitle: 'Grouped by the job you need to get done. Every card is a working feature you can open right now.',
    disclaimer: 'Only live capabilities are listed. Badges mark what needs sign-in, a paid plan, or a booking; unshipped ideas are not listed.',
    quickLabel: 'Also available:',
    quickCta: 'All features',
    pricing: 'Pricing',
    blog: 'Guides',
    alerts: 'Risk alerts',
    smartMoney: 'Smart money',
    agent: 'Agent API',
    telegram: 'Telegram',
    mapHref: '/en#features',
  },
  groups: [
    {
      id: 'risk',
      icon: ShieldCheck,
      title: 'Pre-payment screening',
      desc: 'Check the counterparty before funds move',
      items: [
        {
          icon: ScanSearch,
          title: 'Free address check',
          desc: 'TRON / BTC / ETH: a red-yellow-green verdict with evidence in ~3 seconds, no signup',
          href: '/en#check',
          badge: 'Free',
          tone: 'free',
        },
        {
          icon: ShieldAlert,
          title: 'Sanctions list & coverage',
          desc: '906 OFAC SDN addresses + 2 public records, with an explicit "what we did not check" report',
          href: '/en/agent',
          badge: 'Free',
          tone: 'free',
        },
        {
          icon: Bell,
          title: 'Monitoring & alerts',
          desc: 'Sign in to watch wallets, call the risk API against a daily quota and inspect usage',
          href: '/dashboard',
          badge: 'Sign-in',
          tone: 'login',
        },
      ],
    },
    {
      id: 'intel',
      icon: Radar,
      title: 'Public on-chain intelligence',
      desc: 'Readable without an account',
      items: [
        {
          icon: ShieldAlert,
          title: 'Risk alert board',
          desc: 'Filter public threat intelligence by chain: phishing, laundering routes, mixer entry points',
          href: '/alerts',
          badge: 'Public',
          tone: 'free',
        },
        {
          icon: TrendingUp,
          title: 'Smart money flows',
          desc: 'Institutional and whale footprints; first 3 addresses free, full list requires a plan',
          href: '/smart-money',
          badge: 'Partly free',
          tone: 'partial',
        },
      ],
    },
    {
      id: 'compliance',
      icon: FileBarChart,
      title: 'Compliance & reporting',
      desc: 'From raw transactions to documents an accountant can use',
      items: [
        {
          icon: FileBarChart,
          title: 'Tax centre',
          desc: 'Paste a CSV, compare FIFO / LIFO / HIFO cost basis, print an audit-ready report',
          href: '/tax',
          badge: 'Free',
          tone: 'free',
        },
        {
          icon: Landmark,
          title: 'RWA / stablecoin advisory',
          desc: 'Licensed partner network in Hong Kong, China: structuring, AML design, audit support',
          href: '/en#consult',
          badge: 'By booking',
          tone: 'contact',
        },
        {
          icon: BookOpen,
          title: 'Field guides',
          desc: 'Practical articles on crypto compliance, address risk and frozen accounts',
          href: '/en/blog',
          badge: 'Free',
          tone: 'free',
        },
      ],
    },
    {
      id: 'developer',
      icon: Bot,
      title: 'Developers & agents',
      desc: 'Machine-callable, no human signup required',
      items: [
        {
          icon: Bot,
          title: 'Agent API',
          desc: 'Free tier 30 calls/min, REST + MCP-style tools, stable machine-readable error codes',
          href: '/en/agent',
          badge: 'Free tier',
          tone: 'free',
        },
        {
          icon: Braces,
          title: 'Machine discovery',
          desc: 'llms.txt, OpenAPI 3.1, agent card and manifest in one place',
          href: '/llms.txt',
          badge: 'Public',
          tone: 'dev',
        },
        {
          icon: CreditCard,
          title: 'Plans & metering',
          desc: 'API tokens, daily quota, usage history, USDT (TRC-20) instant activation',
          href: '/dashboard',
          badge: 'Sign-in',
          tone: 'login',
        },
      ],
    },
  ],
  quick: [
    { icon: ShieldAlert, label: 'Risk alerts', href: '/alerts' },
    { icon: TrendingUp, label: 'Smart money', href: '/smart-money' },
    { icon: FileBarChart, label: 'Tax reports', href: '/tax' },
    { icon: Bot, label: 'Agent API', href: '/en/agent' },
    { icon: Landmark, label: 'Advisory', href: '/en#consult' },
  ],
};

export function getCatalog(lang: 'zh' | 'en'): Catalog {
  return lang === 'en' ? EN : ZH;
}
