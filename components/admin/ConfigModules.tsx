'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Webhook as WebhookIcon, Megaphone, Settings2, Plus, Trash2, Power, Copy, Check, TestTube2, ScrollText, ShieldAlert, CreditCard, Save, RefreshCw } from 'lucide-react';

export type ConfigTab = 'apikeys' | 'webhooks' | 'banners' | 'settings' | 'blacklist' | 'audit' | 'billing';

const inputCls =
  'w-full rounded-lg border border-cyber-700 bg-cyber-950/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-neon-cyan/60';
const btnPrimary =
  'flex items-center gap-1.5 rounded-lg bg-neon-cyan/20 px-3 py-2 text-xs font-medium text-neon-cyan ring-1 ring-neon-cyan/40 transition hover:bg-neon-cyan/30 active:scale-95';
const btnDanger = 'rounded-md border border-cyber-700 p-1.5 text-slate-400 transition hover:border-neon-red/60 hover:text-neon-red active:scale-90';
const sectionCls = 'rounded-2xl border border-cyber-700 bg-cyber-900/60 p-6';

async function jfetch(url: string, method = 'GET', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { res, json: await res.json().catch(() => null) };
}

function Notice({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const ok = msg.startsWith('✅');
  return <p className={`mt-3 text-xs ${ok ? 'text-neon-green' : 'text-neon-red'}`}>{msg}</p>;
}

/* ---------------- API 令牌 ---------------- */
function ApiKeys() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [quota, setQuota] = useState(1000);
  const [msg, setMsg] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/keys');
    if (json?.keys) setItems(json.keys);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!name.trim()) { setMsg('⚠️ 请填写令牌名称'); return; }
    const { res, json } = await jfetch('/api/admin/keys', 'POST', { name, dailyQuota: quota });
    if (res.ok && json?.key) {
      setJustCreated(json.key.fullKey);
      setMsg('✅ 已创建（密钥只显示这一次，请立即保存）');
      setName('');
      load();
    } else setMsg(`⚠️ ${json?.error || '创建失败'}`);
  }

  async function toggle(item: any) {
    const { json } = await jfetch('/api/admin/keys', 'PUT', { id: item.id, enabled: !item.enabled });
    if (json?.ok) { setMsg('✅ 已保存'); load(); }
  }
  async function remove(id: string) {
    const { json } = await jfetch(`/api/admin/keys?id=${id}`, 'DELETE');
    if (json?.ok) { setMsg('✅ 已吊销'); load(); }
  }

  return (
    <section className={sectionCls}>
      <div className="flex items-center gap-2">
        <KeyRound size={18} className="text-neon-cyan" />
        <h2 className="text-lg font-bold">API 令牌</h2>
        <span className="text-xs text-slate-500">开放平台接入凭证（专业版客户使用）</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <input className={inputCls} placeholder="令牌名称（如：客户A-收银台）" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} type="number" placeholder="日配额" value={quota} onChange={(e) => setQuota(Number(e.target.value))} />
        <button className={btnPrimary} onClick={create}><Plus size={13} /> 生成令牌</button>
      </div>
      {justCreated && (
        <div className="mt-3 rounded-lg border border-neon-yellow/40 bg-neon-yellow/10 p-3">
          <p className="text-xs text-neon-yellow">新密钥（仅显示一次）：</p>
          <p className="mt-1 flex items-center gap-2 break-all font-mono text-xs text-slate-100">
            {justCreated}
            <button
              className="text-neon-cyan hover:text-white"
              onClick={() => { navigator.clipboard?.writeText(justCreated); setMsg('✅ 已复制'); }}
            >
              <Copy size={13} />
            </button>
          </p>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="text-xs text-slate-500">暂无令牌，先生成一个。</p>}
        {items.map((k) => (
          <div key={k.id} className="flex items-center gap-3 rounded-lg border border-cyber-700 bg-cyber-950/50 px-3 py-2">
            <span className="w-36 truncate text-sm text-slate-200">{k.name}</span>
            <span className="font-mono text-xs text-slate-400">{k.key}</span>
            <span className="text-xs text-slate-500">
              {k.enabled
                ? `日配额 ${k.dailyQuota} · 今日 ${k.usedToday ?? 0}/${k.dailyQuota}${k.plan ? ` · ${k.plan}` : ''}`
                : '已停用'}
            </span>
            <span className="ml-auto flex gap-1.5">
              <button className={btnDanger} title={k.enabled ? '停用' : '启用'} onClick={() => toggle(k)}><Power size={12} /></button>
              <button className={btnDanger} title="吊销" onClick={() => remove(k.id)}><Trash2 size={12} /></button>
            </span>
          </div>
        ))}
      </div>
      <Notice msg={msg} />
    </section>
  );
}

/* ---------------- Webhook ---------------- */
const EVENTS = ['address.flagged', 'address.checked', 'payment.blocked', 'smartmoney.activity'];
const EVENT_LABELS: Record<string, string> = {
  'address.flagged': '地址被标记风险',
  'address.checked': '地址完成核查',
  'payment.blocked': '收款被拦截',
  'smartmoney.activity': '聪明钱异动',
};

function Webhooks() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['address.flagged']);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/webhooks');
    if (json?.webhooks) setItems(json.webhooks);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!name.trim() || !url.trim()) { setMsg('⚠️ 请填写名称与回调 URL'); return; }
    const { res, json } = await jfetch('/api/admin/webhooks', 'POST', { name, url, events });
    if (res.ok) { setMsg('✅ 已创建'); setName(''); setUrl(''); load(); } else setMsg(`⚠️ ${json?.error || '创建失败'}`);
  }
  async function toggle(item: any) {
    const { json } = await jfetch('/api/admin/webhooks', 'PUT', { id: item.id, name: item.name, url: item.url, events: item.events, enabled: !item.enabled });
    if (json?.ok) { setMsg('✅ 已保存'); load(); }
  }
  async function remove(id: string) {
    const { json } = await jfetch(`/api/admin/webhooks?id=${id}`, 'DELETE');
    if (json?.ok) { setMsg('✅ 已删除'); load(); }
  }
  async function testSend(item: any) {
    try {
      const r = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ChainSentinel-Test': '1' },
        body: JSON.stringify({ event: 'test.ping', ts: Date.now(), message: '链哨 Webhook 测试' }),
      });
      setMsg(r.ok ? `✅ 测试发送成功（HTTP ${r.status}）` : `⚠️ 对方返回 HTTP ${r.status}`);
    } catch {
      setMsg('⚠️ 无法送达该 URL（请检查地址可访问性）');
    }
  }

  return (
    <section className={sectionCls}>
      <div className="flex items-center gap-2">
        <WebhookIcon size={18} className="text-neon-cyan" />
        <h2 className="text-lg font-bold">Webhook 回调</h2>
        <span className="text-xs text-slate-500">风险事件实时推送到你的系统</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="名称（如：商户A-风控系统）" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="https://your-server.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EVENTS.map((ev) => (
          <button
            key={ev}
            onClick={() => setEvents((p) => (p.includes(ev) ? p.filter((x) => x !== ev) : [...p, ev]))}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              events.includes(ev)
                ? 'bg-neon-cyan/20 text-neon-cyan ring-1 ring-neon-cyan/40'
                : 'border border-cyber-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {EVENT_LABELS[ev]}
          </button>
        ))}
        <button className={btnPrimary} onClick={save}><Plus size={13} /> 创建 Webhook</button>
      </div>
      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="text-xs text-slate-500">暂无 Webhook 配置。</p>}
        {items.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded-lg border border-cyber-700 bg-cyber-950/50 px-3 py-2">
            <span className="w-32 truncate text-sm text-slate-200">{w.name}</span>
            <span className="flex-1 truncate font-mono text-xs text-slate-400">{w.url}</span>
            <span className="text-xs text-slate-500">{w.events?.length || 0} 个事件</span>
            <span className="ml-auto flex gap-1.5">
              <button className={btnDanger} title="测试发送" onClick={() => testSend(w)}><TestTube2 size={12} /></button>
              <button className={btnDanger} title={w.enabled ? '停用' : '启用'} onClick={() => toggle(w)}><Power size={12} /></button>
              <button className={btnDanger} title="删除" onClick={() => remove(w.id)}><Trash2 size={12} /></button>
            </span>
          </div>
        ))}
      </div>
      <Notice msg={msg} />
    </section>
  );
}

/* ---------------- 营销横幅 ---------------- */
const POSITIONS = [
  ['home-pricing', '首页定价区'],
  ['alerts-top', '警示榜顶部'],
  ['smartmoney-top', '聪明钱页顶部'],
] as const;

function Banners() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ position: 'home-top', title: '', subtitle: '', emoji: '📣', linkUrl: '', enabled: true, sort: 0 });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/banners');
    if (json?.banners) setItems(json.banners);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.title.trim()) { setMsg('⚠️ 请填写横幅标题'); return; }
    const { res, json } = await jfetch('/api/admin/banners', 'POST', form);
    if (res.ok) { setMsg('✅ 已创建并启用，公开页面即时展示'); setForm({ position: 'home-top', title: '', subtitle: '', emoji: '📣', linkUrl: '', enabled: true, sort: 0 }); load(); }
    else setMsg(`⚠️ ${json?.error || '创建失败'}`);
  }
  async function toggle(item: any) {
    const { json } = await jfetch('/api/admin/banners', 'PUT', { ...item, enabled: !item.enabled });
    if (json?.ok) { setMsg('✅ 已保存'); load(); }
  }
  async function remove(id: string) {
    const { json } = await jfetch(`/api/admin/banners?id=${id}`, 'DELETE');
    if (json?.ok) { setMsg('✅ 已删除'); load(); }
  }

  return (
    <section className={sectionCls}>
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-neon-cyan" />
        <h2 className="text-lg font-bold">营销横幅</h2>
        <span className="text-xs text-slate-500">广告位模块化管理：位置/排序/启停，傻瓜式运营</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="标题（如：专业版限时 8 折）" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={inputCls} placeholder="副标题（一行说明）" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        <div className="grid grid-cols-[90px_1fr] gap-2">
          <input className={inputCls} placeholder="📣" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          <select className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
            {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-2">
          <input className={inputCls} placeholder="跳转链接（可留空）" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
          <input className={inputCls} type="number" placeholder="排序" value={form.sort} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
        </div>
      </div>
      <button className={`${btnPrimary} mt-3`} onClick={save}><Plus size={13} /> 上架横幅</button>
      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="text-xs text-slate-500">暂无横幅。上架后首页/对应页面顶部立即出现轮播位。</p>}
        {items.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border border-cyber-700 bg-cyber-950/50 px-3 py-2">
            <span className="text-lg">{b.emoji}</span>
            <span className="w-40 truncate text-sm text-slate-200">{b.title}</span>
            <span className="text-xs text-slate-500">{POSITIONS.find(([v]) => v === b.position)?.[1]}</span>
            <span className="text-xs text-slate-600">排序 {b.sort}</span>
            <span className={`ml-auto flex gap-1.5`}>
              <button className={btnDanger} title={b.enabled ? '下架' : '上架'} onClick={() => toggle(b)}><Power size={12} /></button>
              <button className={btnDanger} title="删除" onClick={() => remove(b.id)}><Trash2 size={12} /></button>
            </span>
          </div>
        ))}
      </div>
      <Notice msg={msg} />
    </section>
  );
}

/* ---------------- 站点设置 ---------------- */
function Settings() {
  const [form, setForm] = useState<any>({ siteName: '', slogan: '', announcement: '', contactEmail: '', footerText: '', seoKeywords: '' });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/settings');
    if (json?.settings) setForm(json.settings);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    const { res, json } = await jfetch('/api/admin/settings', 'PUT', form);
    if (res.ok) { setMsg('✅ 已保存，公开页面 30 秒内生效'); } else setMsg(`⚠️ ${json?.error || '保存失败'}`);
  }

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <section className={sectionCls}>
      <div className="flex items-center gap-2">
        <Settings2 size={18} className="text-neon-cyan" />
        <h2 className="text-lg font-bold">站点设置</h2>
        <span className="text-xs text-slate-500">站名/公告/联系方式/SEO，一处改全站生效</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-500">站点名称</label>
          <input className={inputCls} value={form.siteName} onChange={(e) => set('siteName', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Slogan</label>
          <input className={inputCls} value={form.slogan} onChange={(e) => set('slogan', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">公告（顶部滚动条，留空隐藏）</label>
          <input className={inputCls} value={form.announcement} onChange={(e) => set('announcement', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">联系邮箱</label>
          <input className={inputCls} value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-500">页脚文案</label>
          <input className={inputCls} value={form.footerText} onChange={(e) => set('footerText', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-500">SEO 关键词（逗号分隔）</label>
          <input className={inputCls} value={form.seoKeywords} onChange={(e) => set('seoKeywords', e.target.value)} />
        </div>
      </div>
      <button className={`${btnPrimary} mt-4`} onClick={save}>💾 保存设置</button>
      <Notice msg={msg} />
    </section>
  );
}

/* ---------------- 计费与支付 ---------------- */
function BillingPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [stripe, setStripe] = useState<any>(null);
  const [hints, setHints] = useState<{ webhookHint?: string; paymentMethodsHint?: string }>({});
  const [drafts, setDrafts] = useState<Record<string, { price: string; quota: string; tokens: string; priceId: string; promoPrice: string; promoEnds: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const toLocalInput = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/billing-plans');
    if (json?.plans) {
      setPlans(json.plans);
      const d: typeof drafts = {};
      json.plans.forEach((p: any) => {
        d[p.id] = { price: String(p.priceMonthlyUsd), quota: String(p.quotaPerDay), tokens: String(p.tokenCount), priceId: p.priceId || '', promoPrice: p.promoPriceUsd !== undefined && p.promoPriceUsd !== null ? String(p.promoPriceUsd) : '', promoEnds: toLocalInput(p.promoEndsAt) };
      });
      setDrafts(d);
    }
    if (json?.stripe) setStripe(json.stripe);
    setHints({ webhookHint: json?.webhookHint, paymentMethodsHint: json?.paymentMethodsHint });
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    const body: Record<string, unknown> = { id };
    if (d.price !== '') body.priceMonthlyUsd = Number(d.price);
    if (d.quota !== '') body.quotaPerDay = Number(d.quota);
    if (d.tokens !== '') body.tokenCount = Number(d.tokens);
    body.priceId = d.priceId.trim();
    // 促销：促销价 + 截止时间（两者齐全才生效；清空促销价=结束促销）
    if (d.promoPrice !== '' && d.promoEnds !== '') {
      body.promoPriceUsd = Number(d.promoPrice);
      body.promoEndsAt = new Date(d.promoEnds).getTime();
    } else {
      body.promoPriceUsd = null;
      body.promoEndsAt = null;
    }
    const { res, json } = await jfetch('/api/admin/billing-plans', 'PUT', body);
    setMsg(res.ok ? `✅ ${id} 套餐已保存` : `❌ ${json?.error || '保存失败'}`);
    if (res.ok) load();
  };

  const setDraft = (id: string, k: keyof typeof drafts[string], v: string) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [k]: v } }));
  };

  return (
    <section className={`${sectionCls} mt-6`}>
      <div className="flex items-center gap-2">
        <CreditCard size={18} className="text-neon-cyan" />
        <h2 className="text-lg font-bold">计费与支付</h2>
        <span className="text-xs text-slate-500">套餐定价 / 配额 / Stripe 收款配置（后台可维护，保存即生效）</span>
      </div>

      {/* Stripe 状态 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-cyber-700 bg-cyber-950/50 p-4">
          <div className="text-xs text-slate-400">Stripe 密钥（STRIPE_SECRET_KEY）</div>
          <div className={`mt-1.5 text-sm font-semibold ${stripe?.secretConfigured ? 'text-neon-green' : 'text-neon-yellow'}`}>
            {stripe?.secretConfigured ? '✅ 已配置' : '⚠️ 未配置（订阅接口返回 503，不会静默放行）'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            来源：{stripe?.secretSource === 'store' ? '后台加密存储' : stripe?.secretSource === 'env' ? '环境变量 .env' : '无'}
            {stripe?.secretSource !== 'store' && ' · 可在「运营总览 → 密钥管理」录入（AES-256-GCM 加密落盘）'}
          </div>
        </div>
        <div className="rounded-xl border border-cyber-700 bg-cyber-950/50 p-4">
          <div className="text-xs text-slate-400">Webhook 密钥（STRIPE_WEBHOOK_SECRET）</div>
          <div className={`mt-1.5 text-sm font-semibold ${stripe?.webhookConfigured ? 'text-neon-green' : 'text-neon-yellow'}`}>
            {stripe?.webhookConfigured ? '✅ 已配置' : '⚠️ 未配置（支付成功无法激活令牌）'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">来源：{stripe?.webhookSource === 'store' ? '后台加密存储' : stripe?.webhookSource === 'env' ? '环境变量 .env' : '无'}</div>
        </div>
      </div>

      {/* 套餐表 */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-cyber-700 text-xs text-slate-500">
              <th className="px-3 py-2.5">套餐</th>
              <th className="px-3 py-2.5">月费 (USD)</th>
              <th className="px-3 py-2.5">促销价</th>
              <th className="px-3 py-2.5">促销截止</th>
              <th className="px-3 py-2.5">令牌数</th>
              <th className="px-3 py-2.5">日配额</th>
              <th className="px-3 py-2.5">Stripe Price ID</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const d = drafts[p.id] || { price: '0', quota: '0', tokens: '0', priceId: '', promoPrice: '', promoEnds: '' };
              return (
                <tr key={p.id} className="border-b border-cyber-800">
                  <td className="px-3 py-2.5">
                    <div className="text-slate-200">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.id}{p.id === 'free' && '（免费层无需令牌）'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={d.price} onChange={(e) => setDraft(p.id, 'price', e.target.value)} className={`${inputCls} w-20`} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={d.promoPrice} onChange={(e) => setDraft(p.id, 'promoPrice', e.target.value)} placeholder="如 19" className={`${inputCls} w-20`} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="datetime-local" value={d.promoEnds} onChange={(e) => setDraft(p.id, 'promoEnds', e.target.value)} className={`${inputCls} w-44`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={d.tokens} onChange={(e) => setDraft(p.id, 'tokens', e.target.value)} className={`${inputCls} w-16`} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={d.quota} onChange={(e) => setDraft(p.id, 'quota', e.target.value)} className={`${inputCls} w-28`} inputMode="numeric" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input value={d.priceId} onChange={(e) => setDraft(p.id, 'priceId', e.target.value)} placeholder="price_xxx" className={`${inputCls} w-44 font-mono text-[11px]`} />
                  </td>
                  <td className="px-3 py-2.5">
                    <button className={btnPrimary} onClick={() => save(p.id)}><Save size={12} /> 保存</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Notice msg={msg} />

      {/* 提示 */}
      <div className="mt-5 space-y-2 rounded-xl border border-cyber-800 bg-cyber-950/40 p-4 text-xs leading-relaxed text-slate-500">
        <p>🔗 {hints.webhookHint || 'Stripe Webhook 端点：/api/billing/webhook（订阅事件：checkout.session.completed / invoice.paid / customer.subscription.deleted）'}</p>
        <p>💳 {hints.paymentMethodsHint || '支付方式（卡 / Apple Pay / Google Pay / FPS）在 Stripe Dashboard → Settings → Payment methods 勾选，无需改代码'}</p>
        <p>🧾 修改套餐定价/配额保存后立即生效（前台定价区、订阅中心、计量扣费同步更新）。</p>
      </div>
    </section>
  );
}

export default function ConfigModules({ tab }: { tab: ConfigTab }) {
  if (tab === 'apikeys') return <div className="mt-6"><ApiKeys /></div>;
  if (tab === 'webhooks') return <div className="mt-6"><Webhooks /></div>;
  if (tab === 'banners') return <div className="mt-6"><Banners /></div>;
  if (tab === 'blacklist') return <div className="mt-6"><Blacklist /></div>;
  if (tab === 'audit') return <div className="mt-6"><AuditLog /></div>;
  if (tab === 'billing') return <div className="mt-6"><BillingPlans /></div>;
  return <div className="mt-6"><Settings /></div>;
}

/* ---------------- 黑名单管理 ---------------- */
const TYPE_LABELS: Record<string, string> = { phishing: '钓鱼归集', laundering: '洗钱通道', mixer: '混币入口', fraud: '诈骗资金' };
const SOURCE_LABELS: Record<string, string> = { 'chainsentinel-demo-seed': '演示种子', manual: '人工添加', 'external-intel': '情报源' };

function Blacklist() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ address: '', chain: 'tron', label: '', type: 'phishing', notes: '' });
  const [bulk, setBulk] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/blacklist');
    if (json?.items) setItems(json.items);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.address.trim() || !form.label.trim()) { setMsg('⚠️ 请填写地址与标签'); return; }
    const { res, json } = await jfetch('/api/admin/blacklist', 'POST', form);
    if (res.ok) { setMsg('✅ 已加入黑名单，/api/check 与警示榜即时生效'); setForm({ address: '', chain: 'tron', label: '', type: 'phishing', notes: '' }); load(); }
    else setMsg(`⚠️ ${json?.error || '添加失败'}`);
  }
  async function remove(id: string) {
    const { json } = await jfetch(`/api/admin/blacklist?id=${id}`, 'DELETE');
    if (json?.ok) { setMsg('✅ 已移除'); load(); }
  }

  async function importBulk() {
    const lines = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { setMsg('⚠️ 请粘贴要导入的地址（每行一个）'); return; }
    const entries = lines.map((l) => {
      const [address, chain = 'any', label = '外部情报源导入', type = 'phishing'] = l.split(',').map((c) => c.trim());
      return { address, chain, label, type };
    });
    const { res, json } = await jfetch('/api/admin/blacklist/import', 'POST', { entries });
    if (res.ok) {
      setMsg(`✅ 导入完成：新增 ${json.added} 条，跳过 ${json.skipped} 条（重复或格式错误，来源=external-intel）`);
      setBulk('');
      load();
    } else setMsg(`⚠️ ${json?.error || '导入失败'}`);
  }

  return (
    <section className={sectionCls}>
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} className="text-neon-red" />
        <h2 className="text-lg font-bold">黑名单库</h2>
        <span className="text-xs text-slate-500">风险地址数据源：查询红牌命中 + 警示榜并入展示</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="风险地址（TRON/BTC/ETH）" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className={inputCls} placeholder="标签（如：2026-08 钓鱼归集）" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <select className={inputCls} value={form.chain} onChange={(e) => setForm({ ...form, chain: e.target.value })}>
            <option value="tron">TRON</option>
            <option value="btc">BTC</option>
            <option value="eth">ETH</option>
            <option value="any">任意链</option>
          </select>
          <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <input className={inputCls} placeholder="备注（可选）" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <button className={`${btnPrimary} mt-3`} onClick={save}><Plus size={13} /> 加入黑名单</button>
      <div className="mt-4 rounded-lg border border-cyber-700/70 bg-cyber-950/40 p-3">
        <p className="text-xs text-slate-500">批量导入（外部情报源，来源自动标注 external-intel）：每行一个地址，可加 链,标签,类型</p>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={3} spellCheck={false} placeholder={'T地址或0x地址或bc1地址\n0x地址2,eth,钓鱼地址,phishing'} className="mt-2 w-full rounded-lg border border-cyber-700 bg-cyber-950/70 p-2 font-mono text-xs text-slate-200 outline-none focus:border-neon-cyan/60" />
        <button className={`${btnPrimary} mt-2`} onClick={importBulk}>📥 批量导入</button>
      </div>
      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="text-xs text-slate-500">黑名单为空。</p>}
        {items.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border border-cyber-700 bg-cyber-950/50 px-3 py-2">
            <span className="w-16 shrink-0 text-xs text-neon-red">{TYPE_LABELS[b.type] || b.type}</span>
            <span className="font-mono text-xs text-slate-300">{b.address}</span>
            <span className="hidden truncate text-xs text-slate-500 sm:block">{b.label}</span>
            <span className="shrink-0 rounded border border-cyber-700 px-1.5 py-0.5 text-[10px] text-slate-500" title={b.source || '未标注来源'}>{SOURCE_LABELS[b.source] || '未标注'}</span>
            <button className={`${btnDanger} ml-auto`} onClick={() => remove(b.id)}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <Notice msg={msg} />
    </section>
  );
}

/* ---------------- 操作日志 ---------------- */
function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { json } = await jfetch('/api/admin/audit');
    if (json?.logs) setLogs(json.logs);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className={sectionCls}>
      <div className="flex items-center gap-2">
        <ScrollText size={18} className="text-neon-cyan" />
        <h2 className="text-lg font-bold">操作日志</h2>
        <span className="text-xs text-slate-500">安全审计：登录/密钥/配置变更，保留最近 200 条</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-cyber-700 text-slate-500">
              <th className="py-2 pr-4">时间</th>
              <th className="py-2 pr-4">操作</th>
              <th className="py-2 pr-4">详情</th>
              <th className="py-2">来源 IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-slate-500">暂无操作记录。</td></tr>
            )}
            {logs.map((l, i) => (
              <tr key={i} className="border-b border-cyber-800/60">
                <td className="whitespace-nowrap py-2 pr-4 font-mono text-slate-400">{l.time}</td>
                <td className="py-2 pr-4 text-slate-200">{l.action}</td>
                <td className="max-w-[320px] truncate py-2 pr-4 text-slate-400">{l.detail}</td>
                <td className="py-2 font-mono text-slate-500">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
